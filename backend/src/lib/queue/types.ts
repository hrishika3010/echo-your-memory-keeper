export interface JobPayloadMap {
  ingest_photon_image: { assetId: string };
  edit_image_with_gmi: { assetId: string };
  publish_memory: { assetId: string; captionOverride?: string };
  sync_memory_to_hydra: { memoryId: string };
}

export type JobName = keyof JobPayloadMap;

export type JobHandler<T extends JobName> = (payload: JobPayloadMap[T]) => Promise<void>;

export interface JobQueue {
  start(): Promise<void>;
  stop(): Promise<void>;
  healthcheck(): Promise<boolean>;
  publish<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void>;
  register<T extends JobName>(name: T, handler: JobHandler<T>): Promise<void>;
}
