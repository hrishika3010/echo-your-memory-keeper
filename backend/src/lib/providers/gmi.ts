export interface GmiImageEditResult {
  image: Buffer;
  mimeType: string;
  model: string;
  requestId: string | null;
  latencyMs: number;
  revisedPrompt: string | null;
  rawResponse: unknown;
}

export interface GmiImageEditInput {
  image: Buffer;
  mimeType: string;
  fileName: string;
  prompt: string;
}

export interface GmiImageEditClient {
  editImage(input: GmiImageEditInput): Promise<GmiImageEditResult>;
  healthcheck(): Promise<boolean>;
}
