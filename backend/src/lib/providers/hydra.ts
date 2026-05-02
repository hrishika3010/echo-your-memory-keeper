export interface HydraMemorySyncInput {
  tenantId: string;
  albumId: string;
  memoryId: string;
  albumTitle: string;
  caption: string;
  source: string;
  receivedAt: Date;
}

export interface HydraSyncClient {
  healthcheck(): Promise<boolean>;
  syncMemory(input: HydraMemorySyncInput): Promise<void>;
}
