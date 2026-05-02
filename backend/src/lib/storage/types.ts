export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageClient {
  healthcheck(): Promise<boolean>;
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<StoredObject | null>;
}
