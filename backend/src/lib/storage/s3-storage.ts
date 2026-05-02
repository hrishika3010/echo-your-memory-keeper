import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { StorageClient, PutObjectInput, StoredObject } from "./types.js";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3StorageClient implements StorageClient {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  async healthcheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );
  }

  async getObject(key: string): Promise<StoredObject | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        })
      );

      if (!response.Body) {
        return null;
      }

      const body = Buffer.from(await response.Body.transformToByteArray());
      return {
        key,
        body,
        contentType: response.ContentType ?? "application/octet-stream"
      };
    } catch {
      return null;
    }
  }
}
