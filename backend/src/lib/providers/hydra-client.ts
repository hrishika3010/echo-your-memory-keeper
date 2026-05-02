import { HydraDBClient } from "@hydra_db/node";

import type { HydraMemorySyncInput, HydraSyncClient } from "./hydra.js";

export function buildHydraMemoryPayload(input: HydraMemorySyncInput) {
  return {
    memories: [
      {
        title: `${input.albumTitle} memory`,
        text: `${input.caption} Received on ${input.receivedAt.toISOString()} from ${input.source}.`,
        infer: true,
        tenant_metadata: JSON.stringify({
          album_id: input.albumId,
          source: input.source
        }),
        document_metadata: JSON.stringify({
          memory_id: input.memoryId,
          album_id: input.albumId,
          source: input.source,
          caption: input.caption
        })
      }
    ],
    tenant_id: input.tenantId,
    sub_tenant_id: input.albumId,
    upsert: true
  };
}

export class HydraDbSyncClient implements HydraSyncClient {
  private readonly client: HydraDBClient;

  constructor(apiKey: string) {
    this.client = new HydraDBClient({
      token: apiKey
    });
  }

  async healthcheck(): Promise<boolean> {
    try {
      await this.client.metricsMetricsGet();
      return true;
    } catch {
      return false;
    }
  }

  async syncMemory(input: HydraMemorySyncInput): Promise<void> {
    await this.client.upload.addMemory(buildHydraMemoryPayload(input));
  }
}

export class InMemoryHydraSyncClient implements HydraSyncClient {
  readonly synced: HydraMemorySyncInput[] = [];

  async healthcheck(): Promise<boolean> {
    return true;
  }

  async syncMemory(input: HydraMemorySyncInput): Promise<void> {
    this.synced.push(input);
  }
}
