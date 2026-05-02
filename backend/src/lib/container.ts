import { createDatabase, createPgPool } from "./db/client.js";
import { PostgresRollRepository } from "./db/postgres-repository.js";
import { readEnv } from "./config/env.js";
import { FetchGmiImageEditClient } from "./providers/gmi-client.js";
import { HydraDbSyncClient } from "./providers/hydra-client.js";
import { PgBossQueue } from "./queue/pg-boss-queue.js";
import { RollService, type RollServiceDeps } from "./services/roll-service.js";
import { S3StorageClient } from "./storage/s3-storage.js";

export async function createRuntimeContainer() {
  const env = readEnv();
  const pool = createPgPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const repository = new PostgresRollRepository(db);
  const queue = new PgBossQueue(env.DATABASE_URL);
  const storage = new S3StorageClient({
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY
  });
  const gmi = new FetchGmiImageEditClient({
    apiKey: env.GMI_API_KEY,
    organizationId: env.GMI_ORG_ID,
    model: env.GMI_IMAGE_EDIT_MODEL,
    baseUrl: env.GMI_BASE_URL,
    imageEditPath: env.GMI_IMAGE_EDIT_PATH
  });
  const hydra = new HydraDbSyncClient(env.HYDRADB_API_KEY);

  const deps: RollServiceDeps = {
    repository,
    storage,
    queue,
    gmi,
    hydra,
    appUrl: env.APP_URL,
    hydraTenantId: env.HYDRADB_TENANT_ID
  };

  const service = new RollService(deps);
  return {
    env,
    pool,
    service,
    queue
  };
}

export async function registerJobHandlers(service: RollService, queue: RollServiceDeps["queue"]) {
  await queue.register("ingest_photon_image", async ({ assetId }) => {
    await service.ingestPhotonImage(assetId);
  });
  await queue.register("edit_image_with_gmi", async ({ assetId }) => {
    await service.editImageWithGmi(assetId);
  });
  await queue.register("publish_memory", async ({ assetId, captionOverride }) => {
    await service.publishMemory(assetId, captionOverride);
  });
  await queue.register("sync_memory_to_hydra", async ({ memoryId }) => {
    await service.syncMemoryToHydra(memoryId);
  });
}
