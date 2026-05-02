import { randomUUID } from "node:crypto";

import { buildAlbumSlug } from "../util/slug.js";
import type {
  AlbumRecord,
  AlbumWithMemories,
  AssetFailureInput,
  AssetRecord,
  AssetUpdateInput,
  CreateAlbumInput,
  CreateAssetFromPhotonInput,
  CreatePhotonEventInput,
  HydraSyncStatus,
  MemoryRecord,
  PhotonEventRecord,
  RollRepository,
  UpsertMemoryInput
} from "./repository.js";

export class InMemoryRollRepository implements RollRepository {
  private readonly albums = new Map<string, AlbumRecord>();
  private readonly assets = new Map<string, AssetRecord>();
  private readonly memories = new Map<string, MemoryRecord>();
  private readonly photonEvents = new Map<string, PhotonEventRecord>();

  async healthcheck(): Promise<boolean> {
    return true;
  }

  async createAlbum(input: CreateAlbumInput): Promise<AlbumRecord> {
    const album: AlbumRecord = {
      id: randomUUID(),
      slug: buildAlbumSlug(input.title),
      title: input.title.trim(),
      status: "draft",
      isActiveIngestion: false,
      createdAt: new Date()
    };
    this.albums.set(album.id, album);
    return structuredClone(album);
  }

  async getAlbumById(albumId: string): Promise<AlbumRecord | null> {
    return structuredClone(this.albums.get(albumId) ?? null);
  }

  async getAlbumBySlug(slug: string): Promise<AlbumWithMemories | null> {
    const album = [...this.albums.values()].find((candidate) => candidate.slug === slug);
    if (!album) {
      return null;
    }

    const joined = [...this.memories.values()]
      .filter((memory) => memory.albumId === album.id)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((memory) => {
        const asset = this.assets.get(memory.assetId);
        if (!asset) {
          throw new Error(`Missing asset for memory ${memory.id}`);
        }

        return {
          id: memory.id,
          assetId: memory.assetId,
          caption: memory.caption,
          createdAt: memory.createdAt,
          processingStatus: asset.processingStatus,
          originalStorageKey: asset.originalStorageKey,
          editedStorageKey: asset.editedStorageKey
        };
      });

    return structuredClone({
      ...album,
      memories: joined
    });
  }

  async activateAlbum(albumId: string): Promise<AlbumRecord | null> {
    const target = this.albums.get(albumId);
    if (!target) {
      return null;
    }

    for (const album of this.albums.values()) {
      album.isActiveIngestion = false;
    }

    target.isActiveIngestion = true;
    target.status = "active";
    return structuredClone(target);
  }

  async findActiveAlbum(): Promise<AlbumRecord | null> {
    const active = [...this.albums.values()].find((album) => album.isActiveIngestion);
    return structuredClone(active ?? null);
  }

  async createPhotonEvent(input: CreatePhotonEventInput): Promise<PhotonEventRecord> {
    const existing = [...this.photonEvents.values()].find((event) => event.messageId === input.messageId);
    if (existing) {
      return structuredClone(existing);
    }

    const event: PhotonEventRecord = {
      id: randomUUID(),
      spaceId: input.spaceId,
      senderId: input.senderId,
      messageId: input.messageId,
      contentType: input.contentType,
      receivedAt: input.receivedAt
    };
    this.photonEvents.set(event.id, event);
    return structuredClone(event);
  }

  async findAssetByPhotonMessageId(messageId: string): Promise<AssetRecord | null> {
    const asset = [...this.assets.values()].find((candidate) => candidate.photonMessageId === messageId);
    return structuredClone(asset ?? null);
  }

  async createAssetFromPhotonMessage(
    input: CreateAssetFromPhotonInput
  ): Promise<{ asset: AssetRecord; created: boolean }> {
    const existing = [...this.assets.values()].find((candidate) => candidate.photonMessageId === input.photonMessageId);
    if (existing) {
      return { asset: structuredClone(existing), created: false };
    }

    const asset: AssetRecord = {
      id: randomUUID(),
      albumId: input.albumId,
      source: "photon",
      assetType: "image",
      photonMessageId: input.photonMessageId,
      mimeType: input.mimeType,
      originalStorageKey: input.originalStorageKey,
      editedStorageKey: null,
      processingStatus: "queued",
      failureReason: null,
      generatedCaption: null,
      gmiModel: null,
      gmiRequestId: null,
      gmiLatencyMs: null,
      gmiFailurePayload: null,
      receivedAt: input.receivedAt,
      publishedAt: null
    };

    this.assets.set(asset.id, asset);
    return { asset: structuredClone(asset), created: true };
  }

  async getAssetById(assetId: string): Promise<AssetRecord | null> {
    return structuredClone(this.assets.get(assetId) ?? null);
  }

  async markAssetProcessing(assetId: string): Promise<AssetRecord | null> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return null;
    }

    asset.processingStatus = "processing";
    asset.failureReason = null;
    return structuredClone(asset);
  }

  async markAssetEditCompleted(input: AssetUpdateInput): Promise<AssetRecord | null> {
    const asset = this.assets.get(input.assetId);
    if (!asset) {
      return null;
    }

    asset.editedStorageKey = input.editedStorageKey;
    asset.generatedCaption = input.generatedCaption;
    asset.gmiModel = input.gmiModel;
    asset.gmiRequestId = input.gmiRequestId;
    asset.gmiLatencyMs = input.gmiLatencyMs;
    asset.gmiFailurePayload = null;
    asset.failureReason = null;
    return structuredClone(asset);
  }

  async markAssetFailed(input: AssetFailureInput): Promise<AssetRecord | null> {
    const asset = this.assets.get(input.assetId);
    if (!asset) {
      return null;
    }

    asset.processingStatus = "failed";
    asset.failureReason = input.failureReason;
    asset.gmiFailurePayload = input.gmiFailurePayload;
    asset.gmiRequestId = input.gmiRequestId;
    asset.gmiLatencyMs = input.gmiLatencyMs;
    return structuredClone(asset);
  }

  async markAssetPublished(assetId: string, publishedAt: Date): Promise<AssetRecord | null> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return null;
    }

    asset.processingStatus = "published";
    asset.publishedAt = publishedAt;
    return structuredClone(asset);
  }

  async upsertMemoryForAsset(input: UpsertMemoryInput): Promise<MemoryRecord> {
    const existing = [...this.memories.values()].find((memory) => memory.assetId === input.assetId);
    if (existing) {
      existing.caption = input.caption;
      existing.stylePromptVersion = input.stylePromptVersion;
      existing.gmiModel = input.gmiModel;
      existing.hydraSyncStatus = "pending";
      return structuredClone(existing);
    }

    const memory: MemoryRecord = {
      id: randomUUID(),
      albumId: input.albumId,
      assetId: input.assetId,
      caption: input.caption,
      stylePromptVersion: input.stylePromptVersion,
      gmiModel: input.gmiModel,
      hydraSyncStatus: "pending",
      createdAt: new Date()
    };
    this.memories.set(memory.id, memory);
    return structuredClone(memory);
  }

  async getMemoryById(memoryId: string): Promise<MemoryRecord | null> {
    return structuredClone(this.memories.get(memoryId) ?? null);
  }

  async markHydraSyncStatus(memoryId: string, status: HydraSyncStatus): Promise<MemoryRecord | null> {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      return null;
    }

    memory.hydraSyncStatus = status;
    return structuredClone(memory);
  }
}
