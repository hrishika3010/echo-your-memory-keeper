import { Buffer } from "node:buffer";

import type { GmiImageEditClient, GmiImageEditInput, GmiImageEditResult } from "./gmi.js";

export interface GmiClientConfig {
  apiKey: string;
  organizationId?: string;
  model: string;
  baseUrl: string;
  imageEditPath: string;
}

export class GmiProviderError extends Error {
  constructor(
    message: string,
    readonly details: {
      status?: number;
      payload?: unknown;
      requestId?: string | null;
      latencyMs?: number | null;
    }
  ) {
    super(message);
    this.name = "GmiProviderError";
  }
}

export function buildImageEditFormData(config: GmiClientConfig, input: GmiImageEditInput): FormData {
  const formData = new FormData();
  formData.set("model", config.model);
  formData.set("prompt", input.prompt);
  formData.set("image", new Blob([input.image], { type: input.mimeType }), input.fileName);
  return formData;
}

function joinUrl(baseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function responseToBufferFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download edited image from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("content-type") ?? "image/png"
  };
}

type OpenAiLikeImageResponse = {
  id?: string;
  data?: Array<{
    b64_json?: string;
    image_base64?: string;
    base64?: string;
    url?: string;
    mime_type?: string;
    revised_prompt?: string;
  }>;
};

export class FetchGmiImageEditClient implements GmiImageEditClient {
  constructor(private readonly config: GmiClientConfig) {}

  async healthcheck(): Promise<boolean> {
    try {
      const response = await fetch(joinUrl(this.config.baseUrl, "/models"), {
        headers: this.buildHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async editImage(input: GmiImageEditInput): Promise<GmiImageEditResult> {
    const startedAt = Date.now();
    const response = await fetch(joinUrl(this.config.baseUrl, this.config.imageEditPath), {
      method: "POST",
      headers: this.buildHeaders(false),
      body: buildImageEditFormData(this.config, input)
    });
    const latencyMs = Date.now() - startedAt;

    const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
    const payloadText = await response.text();
    let payload: OpenAiLikeImageResponse | string;
    try {
      payload = JSON.parse(payloadText) as OpenAiLikeImageResponse;
    } catch {
      payload = payloadText;
    }

    if (!response.ok) {
      throw new GmiProviderError("GMI image edit failed.", {
        status: response.status,
        payload,
        requestId,
        latencyMs
      });
    }

    const firstResult = Array.isArray((payload as OpenAiLikeImageResponse).data)
      ? (payload as OpenAiLikeImageResponse).data?.[0]
      : undefined;

    if (!firstResult) {
      throw new GmiProviderError("GMI image edit response did not include image data.", {
        payload,
        requestId,
        latencyMs
      });
    }

    if (firstResult.b64_json || firstResult.image_base64 || firstResult.base64) {
      const base64 = firstResult.b64_json ?? firstResult.image_base64 ?? firstResult.base64;
      return {
        image: Buffer.from(base64, "base64"),
        mimeType: firstResult.mime_type ?? "image/png",
        model: this.config.model,
        requestId,
        latencyMs,
        revisedPrompt: firstResult.revised_prompt ?? null,
        rawResponse: payload
      };
    }

    if (firstResult.url) {
      const downloaded = await responseToBufferFromUrl(firstResult.url);
      return {
        image: downloaded.buffer,
        mimeType: downloaded.mimeType,
        model: this.config.model,
        requestId,
        latencyMs,
        revisedPrompt: firstResult.revised_prompt ?? null,
        rawResponse: payload
      };
    }

    throw new GmiProviderError("GMI image edit response had no supported image output.", {
      payload,
      requestId,
      latencyMs
    });
  }

  private buildHeaders(includeContentType = true): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`
    };

    if (this.config.organizationId) {
      headers["X-Organization-ID"] = this.config.organizationId;
    }

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }
}
