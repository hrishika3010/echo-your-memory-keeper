import type { Space } from "spectrum-ts";

import type { GmiProviderError } from "../providers/gmi-client.js";
import type { GmiImageEditClient } from "../providers/gmi.js";
import type { HydraSyncClient } from "../providers/hydra.js";
import { isPhotonImageAttachment } from "../providers/photon.js";
import type { JobQueue } from "../queue/types.js";
import type { RollRepository } from "../db/repository.js";
import type { StorageClient } from "../storage/types.js";
import { buildFallbackCaption, normalizeCaption } from "../util/memory-caption.js";
import { buildAssetRoute, buildStorageKey } from "../util/assets.js";
import { buildPolaroidEditPrompt, STYLE_PROMPT_VERSION } from "./prompt.js";

export class NoActiveAlbumError extends Error {
  constructor() {
    super("No active album is configured.");
    this.name = "NoActiveAlbumError";
  }
}

export interface RollServiceDeps {
  repository: RollRepository;
  storage: StorageClient;
  queue: JobQueue;
  gmi: GmiImageEditClient;
  hydra: HydraSyncClient;
  appUrl: string;
  hydraTenantId: string;
}

export interface PhotonInboundAttachment {
  spaceId: string;
  senderId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  receivedAt: Date;
}

export class RollService {
  constructor(private readonly deps: RollServiceDeps) {}

  async createAlbum(title: string) {
    return this.deps.repository.createAlbum({ title });
  }

  async activateAlbum(albumId: string) {
    return this.deps.repository.activateAlbum(albumId);
  }

  async getAlbum(slug: string) {
    const album = await this.deps.repository.getAlbumBySlug(slug);
    if (!album) {
      return null;
    }

    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      status: album.status,
      is_active_ingestion: album.isActiveIngestion,
      created_at: album.createdAt.toISOString(),
      memories: album.memories.map((memory) => ({
        id: memory.id,
        asset_id: memory.assetId,
        caption: memory.caption,
        created_at: memory.createdAt.toISOString(),
        processing_status: memory.processingStatus,
        original_image_url: buildAssetRoute(this.deps.appUrl, memory.assetId, "original"),
        edited_image_url: memory.editedStorageKey
          ? buildAssetRoute(this.deps.appUrl, memory.assetId, "edited")
          : null
      }))
    };
  }

  async reprocessMemory(memoryId: string) {
    const memory = await this.deps.repository.getMemoryById(memoryId);
    if (!memory) {
      return null;
    }

    await this.deps.repository.markAssetProcessing(memory.assetId);
    await this.deps.queue.publish("edit_image_with_gmi", { assetId: memory.assetId });
    return memory;
  }

  async getAssetBody(assetId: string, variant: "original" | "edited") {
    const asset = await this.deps.repository.getAssetById(assetId);
    if (!asset) {
      return null;
    }

    const key = variant === "original" ? asset.originalStorageKey : asset.editedStorageKey;
    if (!key) {
      return null;
    }

    return this.deps.storage.getObject(key);
  }

  async handlePhotonAttachment(input: PhotonInboundAttachment) {
    await this.deps.repository.createPhotonEvent({
      spaceId: input.spaceId,
      senderId: input.senderId,
      messageId: input.messageId,
      contentType: "attachment",
      receivedAt: input.receivedAt
    });

    const activeAlbum = await this.deps.repository.findActiveAlbum();
    if (!activeAlbum) {
      throw new NoActiveAlbumError();
    }

    const storageKey = buildStorageKey(activeAlbum.id, input.messageId, "original", input.fileName);
    const { asset, created } = await this.deps.repository.createAssetFromPhotonMessage({
      albumId: activeAlbum.id,
      photonMessageId: input.messageId,
      mimeType: input.mimeType,
      originalStorageKey: storageKey,
      receivedAt: input.receivedAt
    });

    if (created) {
      await this.deps.storage.putObject({
        key: storageKey,
        body: input.data,
        contentType: input.mimeType
      });
      await this.deps.queue.publish("ingest_photon_image", { assetId: asset.id });
    }

    return {
      album: activeAlbum,
      asset,
      created
    };
  }

  async ingestPhotonImage(assetId: string): Promise<void> {
    const asset = await this.deps.repository.getAssetById(assetId);
    if (!asset) {
      return;
    }

    if (asset.processingStatus === "published") {
      return;
    }

    await this.deps.repository.markAssetProcessing(assetId);
    await this.deps.queue.publish("edit_image_with_gmi", { assetId });
  }

  async editImageWithGmi(assetId: string): Promise<void> {
    const asset = await this.deps.repository.getAssetById(assetId);
    if (!asset) {
      return;
    }

    const original = await this.deps.storage.getObject(asset.originalStorageKey);
    if (!original) {
      await this.deps.repository.markAssetFailed({
        assetId,
        failureReason: "Original image is missing from storage.",
        gmiFailurePayload: null,
        gmiRequestId: null,
        gmiLatencyMs: null
      });
      return;
    }

    try {
      const result = await this.deps.gmi.editImage({
        image: original.body,
        mimeType: original.contentType,
        fileName: asset.originalStorageKey.split("/").pop() ?? "image",
        prompt: buildPolaroidEditPrompt()
      });

      const editedKey = buildStorageKey(asset.albumId, asset.photonMessageId, "edited", `edited-${asset.id}.png`);
      await this.deps.storage.putObject({
        key: editedKey,
        body: result.image,
        contentType: result.mimeType
      });

      await this.deps.repository.markAssetEditCompleted({
        assetId,
        editedStorageKey: editedKey,
        generatedCaption: result.revisedPrompt,
        gmiModel: result.model,
        gmiRequestId: result.requestId,
        gmiLatencyMs: result.latencyMs
      });

      await this.deps.queue.publish("publish_memory", { assetId });
    } catch (error) {
      const providerError = error as GmiProviderError;
      await this.deps.repository.markAssetFailed({
        assetId,
        failureReason: error instanceof Error ? error.message : "Unknown GMI failure",
        gmiFailurePayload: providerError?.details?.payload
          ? JSON.stringify(providerError.details.payload)
          : null,
        gmiRequestId: providerError?.details?.requestId ?? null,
        gmiLatencyMs: providerError?.details?.latencyMs ?? null
      });
    }
  }

  async publishMemory(assetId: string, captionOverride?: string): Promise<void> {
    const asset = await this.deps.repository.getAssetById(assetId);
    if (!asset || !asset.editedStorageKey || !asset.gmiModel) {
      return;
    }

    const caption = normalizeCaption(
      captionOverride ?? asset.generatedCaption ?? buildFallbackCaption(asset.receivedAt),
      asset.receivedAt
    );

    const memory = await this.deps.repository.upsertMemoryForAsset({
      albumId: asset.albumId,
      assetId,
      caption,
      stylePromptVersion: STYLE_PROMPT_VERSION,
      gmiModel: asset.gmiModel
    });

    await this.deps.repository.markAssetPublished(assetId, new Date());
    await this.deps.queue.publish("sync_memory_to_hydra", { memoryId: memory.id });
  }

  async syncMemoryToHydra(memoryId: string): Promise<void> {
    const memory = await this.deps.repository.getMemoryById(memoryId);
    if (!memory) {
      return;
    }

    const asset = await this.deps.repository.getAssetById(memory.assetId);
    const album = asset ? await this.deps.repository.getAlbumById(asset.albumId) : null;
    if (!asset || !album) {
      return;
    }

    try {
      await this.deps.hydra.syncMemory({
        tenantId: this.deps.hydraTenantId,
        albumId: album.id,
        memoryId: memory.id,
        albumTitle: album.title,
        caption: memory.caption,
        source: asset.source,
        receivedAt: asset.receivedAt
      });
      await this.deps.repository.markHydraSyncStatus(memory.id, "synced");
    } catch {
      await this.deps.repository.markHydraSyncStatus(memory.id, "failed");
    }
  }

  async healthcheck() {
    const [database, storage, queue, gmi, hydra] = await Promise.all([
      this.deps.repository.healthcheck(),
      this.deps.storage.healthcheck(),
      this.deps.queue.healthcheck(),
      this.deps.gmi.healthcheck(),
      this.deps.hydra.healthcheck()
    ]);

    return {
      status: database && storage && queue ? "ok" : "degraded",
      dependencies: {
        database,
        storage,
        queue,
        gmi,
        hydra
      }
    };
  }
}

export async function handleSpectrumMessage(
  service: RollService,
  space: Space,
  message: {
    id: string;
    sender: { id: string };
    timestamp: Date;
    content: unknown;
  }
) {
  if (!isPhotonImageAttachment(message.content as { type: string; mimeType?: string })) {
    return;
  }

  const attachment = message.content;
  const result = await service.handlePhotonAttachment({
    spaceId: space.id,
    senderId: message.sender.id,
    messageId: message.id,
    fileName: attachment.name,
    mimeType: attachment.mimeType,
    data: await attachment.read(),
    receivedAt: message.timestamp
  });

  if (result.created) {
    await space.send(`Added to ${result.album.title}. Processing now.`);
    return;
  }

  await space.send(`That image is already in ${result.album.title}.`);
}
