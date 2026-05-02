import { and, asc, eq } from "drizzle-orm";
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
import type { RollDatabase } from "./client.js";
import { albums, assets, memories, photonEvents } from "./schema.js";

function mapAlbum(row: typeof albums.$inferSelect): AlbumRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as AlbumRecord["status"],
    isActiveIngestion: row.isActiveIngestion,
    createdAt: row.createdAt
  };
}

function mapAsset(row: typeof assets.$inferSelect): AssetRecord {
  return {
    id: row.id,
    albumId: row.albumId,
    source: row.source as AssetRecord["source"],
    assetType: row.assetType as AssetRecord["assetType"],
    photonMessageId: row.photonMessageId,
    mimeType: row.mimeType,
    originalStorageKey: row.originalStorageKey,
    editedStorageKey: row.editedStorageKey,
    processingStatus: row.processingStatus as AssetRecord["processingStatus"],
    failureReason: row.failureReason,
    generatedCaption: row.generatedCaption,
    gmiModel: row.gmiModel,
    gmiRequestId: row.gmiRequestId,
    gmiLatencyMs: row.gmiLatencyMs,
    gmiFailurePayload: row.gmiFailurePayload,
    receivedAt: row.receivedAt,
    publishedAt: row.publishedAt
  };
}

function mapMemory(row: typeof memories.$inferSelect): MemoryRecord {
  return {
    id: row.id,
    albumId: row.albumId,
    assetId: row.assetId,
    caption: row.caption,
    stylePromptVersion: row.stylePromptVersion,
    gmiModel: row.gmiModel,
    hydraSyncStatus: row.hydraSyncStatus as HydraSyncStatus,
    createdAt: row.createdAt
  };
}

function mapPhotonEvent(row: typeof photonEvents.$inferSelect): PhotonEventRecord {
  return {
    id: row.id,
    spaceId: row.spaceId,
    senderId: row.senderId,
    messageId: row.messageId,
    contentType: row.contentType,
    receivedAt: row.receivedAt
  };
}

export class PostgresRollRepository implements RollRepository {
  constructor(private readonly db: RollDatabase) {}

  async healthcheck(): Promise<boolean> {
    try {
      await this.db.execute("select 1");
      return true;
    } catch {
      return false;
    }
  }

  async createAlbum(input: CreateAlbumInput): Promise<AlbumRecord> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = {
        id: randomUUID(),
        slug: buildAlbumSlug(input.title),
        title: input.title.trim(),
        status: "draft",
        isActiveIngestion: false,
        createdAt: new Date()
      } satisfies typeof albums.$inferInsert;

      try {
        const [inserted] = await this.db.insert(albums).values(row).returning();
        return mapAlbum(inserted);
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
      }
    }

    throw new Error("Unable to create album.");
  }

  async getAlbumById(albumId: string): Promise<AlbumRecord | null> {
    const [row] = await this.db.select().from(albums).where(eq(albums.id, albumId)).limit(1);
    return row ? mapAlbum(row) : null;
  }

  async getAlbumBySlug(slug: string): Promise<AlbumWithMemories | null> {
    const [albumRow] = await this.db.select().from(albums).where(eq(albums.slug, slug)).limit(1);
    if (!albumRow) {
      return null;
    }

    const memoryRows = await this.db
      .select({
        id: memories.id,
        assetId: memories.assetId,
        caption: memories.caption,
        createdAt: memories.createdAt,
        processingStatus: assets.processingStatus,
        originalStorageKey: assets.originalStorageKey,
        editedStorageKey: assets.editedStorageKey
      })
      .from(memories)
      .innerJoin(assets, eq(memories.assetId, assets.id))
      .where(eq(memories.albumId, albumRow.id))
      .orderBy(asc(memories.createdAt));

    return {
      ...mapAlbum(albumRow),
      memories: memoryRows.map((row) => ({
        id: row.id,
        assetId: row.assetId,
        caption: row.caption,
        createdAt: row.createdAt,
        processingStatus: row.processingStatus as AssetRecord["processingStatus"],
        originalStorageKey: row.originalStorageKey,
        editedStorageKey: row.editedStorageKey
      }))
    };
  }

  async activateAlbum(albumId: string): Promise<AlbumRecord | null> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx.select().from(albums).where(eq(albums.id, albumId)).limit(1);
      if (!target) {
        return null;
      }

      await tx.update(albums).set({ isActiveIngestion: false }).where(eq(albums.isActiveIngestion, true));

      const [updated] = await tx
        .update(albums)
        .set({ isActiveIngestion: true, status: "active" })
        .where(eq(albums.id, albumId))
        .returning();

      return mapAlbum(updated);
    });
  }

  async findActiveAlbum(): Promise<AlbumRecord | null> {
    const [row] = await this.db.select().from(albums).where(eq(albums.isActiveIngestion, true)).limit(1);
    return row ? mapAlbum(row) : null;
  }

  async createPhotonEvent(input: CreatePhotonEventInput): Promise<PhotonEventRecord> {
    const row = {
      id: randomUUID(),
      spaceId: input.spaceId,
      senderId: input.senderId,
      messageId: input.messageId,
      contentType: input.contentType,
      receivedAt: input.receivedAt
    } satisfies typeof photonEvents.$inferInsert;

    const [inserted] = await this.db
      .insert(photonEvents)
      .values(row)
      .onConflictDoNothing({ target: photonEvents.messageId })
      .returning();

    if (inserted) {
      return mapPhotonEvent(inserted);
    }

    const [existing] = await this.db.select().from(photonEvents).where(eq(photonEvents.messageId, input.messageId)).limit(1);
    if (!existing) {
      throw new Error(`Unable to load Photon event ${input.messageId}.`);
    }

    return mapPhotonEvent(existing);
  }

  async findAssetByPhotonMessageId(messageId: string): Promise<AssetRecord | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.photonMessageId, messageId)).limit(1);
    return row ? mapAsset(row) : null;
  }

  async createAssetFromPhotonMessage(
    input: CreateAssetFromPhotonInput
  ): Promise<{ asset: AssetRecord; created: boolean }> {
    const row = {
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
    } satisfies typeof assets.$inferInsert;

    const [inserted] = await this.db
      .insert(assets)
      .values(row)
      .onConflictDoNothing({ target: assets.photonMessageId })
      .returning();

    if (inserted) {
      return { asset: mapAsset(inserted), created: true };
    }

    const [existing] = await this.db.select().from(assets).where(eq(assets.photonMessageId, input.photonMessageId)).limit(1);
    if (!existing) {
      throw new Error(`Unable to load Photon asset ${input.photonMessageId}.`);
    }

    return { asset: mapAsset(existing), created: false };
  }

  async getAssetById(assetId: string): Promise<AssetRecord | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    return row ? mapAsset(row) : null;
  }

  async markAssetProcessing(assetId: string): Promise<AssetRecord | null> {
    const [row] = await this.db
      .update(assets)
      .set({ processingStatus: "processing", failureReason: null })
      .where(eq(assets.id, assetId))
      .returning();

    return row ? mapAsset(row) : null;
  }

  async markAssetEditCompleted(input: AssetUpdateInput): Promise<AssetRecord | null> {
    const [row] = await this.db
      .update(assets)
      .set({
        editedStorageKey: input.editedStorageKey,
        generatedCaption: input.generatedCaption,
        gmiModel: input.gmiModel,
        gmiRequestId: input.gmiRequestId,
        gmiLatencyMs: input.gmiLatencyMs,
        gmiFailurePayload: null,
        failureReason: null
      })
      .where(eq(assets.id, input.assetId))
      .returning();

    return row ? mapAsset(row) : null;
  }

  async markAssetFailed(input: AssetFailureInput): Promise<AssetRecord | null> {
    const [row] = await this.db
      .update(assets)
      .set({
        processingStatus: "failed",
        failureReason: input.failureReason,
        gmiFailurePayload: input.gmiFailurePayload,
        gmiRequestId: input.gmiRequestId,
        gmiLatencyMs: input.gmiLatencyMs
      })
      .where(eq(assets.id, input.assetId))
      .returning();

    return row ? mapAsset(row) : null;
  }

  async markAssetPublished(assetId: string, publishedAt: Date): Promise<AssetRecord | null> {
    const [row] = await this.db
      .update(assets)
      .set({
        processingStatus: "published",
        publishedAt
      })
      .where(eq(assets.id, assetId))
      .returning();

    return row ? mapAsset(row) : null;
  }

  async upsertMemoryForAsset(input: UpsertMemoryInput): Promise<MemoryRecord> {
    const row = {
      id: randomUUID(),
      albumId: input.albumId,
      assetId: input.assetId,
      caption: input.caption,
      stylePromptVersion: input.stylePromptVersion,
      gmiModel: input.gmiModel,
      hydraSyncStatus: "pending",
      createdAt: new Date()
    } satisfies typeof memories.$inferInsert;

    const [inserted] = await this.db
      .insert(memories)
      .values(row)
      .onConflictDoUpdate({
        target: memories.assetId,
        set: {
          caption: input.caption,
          stylePromptVersion: input.stylePromptVersion,
          gmiModel: input.gmiModel,
          hydraSyncStatus: "pending"
        }
      })
      .returning();

    return mapMemory(inserted);
  }

  async getMemoryById(memoryId: string): Promise<MemoryRecord | null> {
    const [row] = await this.db.select().from(memories).where(eq(memories.id, memoryId)).limit(1);
    return row ? mapMemory(row) : null;
  }

  async markHydraSyncStatus(memoryId: string, status: HydraSyncStatus): Promise<MemoryRecord | null> {
    const [row] = await this.db
      .update(memories)
      .set({ hydraSyncStatus: status })
      .where(eq(memories.id, memoryId))
      .returning();

    return row ? mapMemory(row) : null;
  }
}
