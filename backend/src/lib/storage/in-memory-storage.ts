import type { StorageClient, PutObjectInput, StoredObject } from "./types.js";

export class InMemoryStorageClient implements StorageClient {
  private readonly objects = new Map<string, StoredObject>();

  async healthcheck(): Promise<boolean> {
    return true;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, {
      key: input.key,
      body: Buffer.from(input.body),
      contentType: input.contentType
    });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key);
    if (!object) {
      return null;
    }

    return {
      key: object.key,
      body: Buffer.from(object.body),
      contentType: object.contentType
    };
  }
}
