import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { NoActiveAlbumError, type RollService } from "../lib/services/roll-service.js";

function parseJsonBody(body: unknown): { title?: string } {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as { title?: string };
}

export function createApp(service: RollService) {
  const app = new Hono();

  app.get("/v1/health", async (c) => {
    const health = await service.healthcheck();
    return c.json(health, health.status === "ok" ? 200 : 503);
  });

  app.post("/v1/albums", async (c) => {
    const body = parseJsonBody(await c.req.json().catch(() => ({})));
    const title = body.title?.trim();
    if (!title) {
      throw new HTTPException(400, { message: "title is required" });
    }

    const album = await service.createAlbum(title);
    return c.json({
      id: album.id,
      slug: album.slug,
      status: album.status
    });
  });

  app.post("/v1/albums/:albumId/activate", async (c) => {
    const album = await service.activateAlbum(c.req.param("albumId"));
    if (!album) {
      throw new HTTPException(404, { message: "album not found" });
    }

    return c.json({
      id: album.id,
      slug: album.slug,
      status: album.status,
      is_active_ingestion: album.isActiveIngestion
    });
  });

  app.get("/v1/albums/:slug", async (c) => {
    const album = await service.getAlbum(c.req.param("slug"));
    if (!album) {
      throw new HTTPException(404, { message: "album not found" });
    }

    return c.json(album);
  });

  app.post("/v1/memories/:id/reprocess", async (c) => {
    const memory = await service.reprocessMemory(c.req.param("id"));
    if (!memory) {
      throw new HTTPException(404, { message: "memory not found" });
    }

    return c.json({
      id: memory.id,
      status: "queued"
    });
  });

  app.get("/v1/assets/:assetId/:variant", async (c) => {
    const variant = c.req.param("variant");
    if (variant !== "original" && variant !== "edited") {
      throw new HTTPException(400, { message: "invalid variant" });
    }

    const object = await service.getAssetBody(c.req.param("assetId"), variant);
    if (!object) {
      throw new HTTPException(404, { message: "asset not found" });
    }

    c.header("Content-Type", object.contentType);
    return c.body(object.body);
  });

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    if (error instanceof NoActiveAlbumError) {
      return c.json({ message: error.message }, 409);
    }

    return c.json({ message: error instanceof Error ? error.message : "internal server error" }, 500);
  });

  return app;
}
