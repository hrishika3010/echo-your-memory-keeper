export type AlbumStatus = "draft" | "active";
export type AssetSource = "photon";
export type AssetType = "image";
export type ProcessingStatus = "queued" | "processing" | "published" | "failed";
export type HydraSyncStatus = "pending" | "synced" | "failed";

export interface AlbumRecord {
  id: string;
  slug: string;
  title: string;
  status: AlbumStatus;
  isActiveIngestion: boolean;
  createdAt: Date;
}

export interface AssetRecord {
  id: string;
  albumId: string;
  source: AssetSource;
  assetType: AssetType;
  photonMessageId: string;
  mimeType: string;
  originalStorageKey: string;
  editedStorageKey: string | null;
  processingStatus: ProcessingStatus;
  failureReason: string | null;
  generatedCaption: string | null;
  gmiModel: string | null;
  gmiRequestId: string | null;
  gmiLatencyMs: number | null;
  gmiFailurePayload: string | null;
  receivedAt: Date;
  publishedAt: Date | null;
}

export interface MemoryRecord {
  id: string;
  albumId: string;
  assetId: string;
  caption: string;
  stylePromptVersion: string;
  gmiModel: string;
  hydraSyncStatus: HydraSyncStatus;
  createdAt: Date;
}

export interface PhotonEventRecord {
  id: string;
  spaceId: string;
  senderId: string;
  messageId: string;
  contentType: string;
  receivedAt: Date;
}

export interface AlbumMemoryRecord {
  id: string;
  assetId: string;
  caption: string;
  createdAt: Date;
  processingStatus: ProcessingStatus;
  originalStorageKey: string;
  editedStorageKey: string | null;
}

export interface AlbumWithMemories extends AlbumRecord {
  memories: AlbumMemoryRecord[];
}

export interface CreateAlbumInput {
  title: string;
}

export interface CreatePhotonEventInput {
  spaceId: string;
  senderId: string;
  messageId: string;
  contentType: string;
  receivedAt: Date;
}

export interface CreateAssetFromPhotonInput {
  albumId: string;
  photonMessageId: string;
  mimeType: string;
  originalStorageKey: string;
  receivedAt: Date;
}

export interface UpsertMemoryInput {
  albumId: string;
  assetId: string;
  caption: string;
  stylePromptVersion: string;
  gmiModel: string;
}

export interface AssetUpdateInput {
  assetId: string;
  editedStorageKey: string;
  generatedCaption: string | null;
  gmiModel: string;
  gmiRequestId: string | null;
  gmiLatencyMs: number;
}

export interface AssetFailureInput {
  assetId: string;
  failureReason: string;
  gmiFailurePayload: string | null;
  gmiRequestId: string | null;
  gmiLatencyMs: number | null;
}

export interface RollRepository {
  healthcheck(): Promise<boolean>;
  createAlbum(input: CreateAlbumInput): Promise<AlbumRecord>;
  getAlbumById(albumId: string): Promise<AlbumRecord | null>;
  getAlbumBySlug(slug: string): Promise<AlbumWithMemories | null>;
  activateAlbum(albumId: string): Promise<AlbumRecord | null>;
  findActiveAlbum(): Promise<AlbumRecord | null>;
  createPhotonEvent(input: CreatePhotonEventInput): Promise<PhotonEventRecord>;
  findAssetByPhotonMessageId(messageId: string): Promise<AssetRecord | null>;
  createAssetFromPhotonMessage(
    input: CreateAssetFromPhotonInput
  ): Promise<{ asset: AssetRecord; created: boolean }>;
  getAssetById(assetId: string): Promise<AssetRecord | null>;
  markAssetProcessing(assetId: string): Promise<AssetRecord | null>;
  markAssetEditCompleted(input: AssetUpdateInput): Promise<AssetRecord | null>;
  markAssetFailed(input: AssetFailureInput): Promise<AssetRecord | null>;
  markAssetPublished(assetId: string, publishedAt: Date): Promise<AssetRecord | null>;
  upsertMemoryForAsset(input: UpsertMemoryInput): Promise<MemoryRecord>;
  getMemoryById(memoryId: string): Promise<MemoryRecord | null>;
  markHydraSyncStatus(memoryId: string, status: HydraSyncStatus): Promise<MemoryRecord | null>;
}
