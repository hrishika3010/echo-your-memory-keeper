import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const albums = pgTable(
  "albums",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    isActiveIngestion: boolean("is_active_ingestion").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugUnique: uniqueIndex("albums_slug_unique").on(table.slug),
    activeIngestionIdx: index("albums_active_ingestion_idx").on(table.isActiveIngestion)
  })
);

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    assetType: text("asset_type").notNull(),
    photonMessageId: text("photon_message_id").notNull(),
    mimeType: text("mime_type").notNull(),
    originalStorageKey: text("original_storage_key").notNull(),
    editedStorageKey: text("edited_storage_key"),
    processingStatus: text("processing_status").notNull(),
    failureReason: text("failure_reason"),
    generatedCaption: text("generated_caption"),
    gmiModel: text("gmi_model"),
    gmiRequestId: text("gmi_request_id"),
    gmiLatencyMs: integer("gmi_latency_ms"),
    gmiFailurePayload: text("gmi_failure_payload"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true })
  },
  (table) => ({
    photonMessageUnique: uniqueIndex("assets_photon_message_unique").on(table.photonMessageId),
    albumIdx: index("assets_album_idx").on(table.albumId),
    processingIdx: index("assets_processing_idx").on(table.processingStatus)
  })
);

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    caption: text("caption").notNull(),
    stylePromptVersion: text("style_prompt_version").notNull(),
    gmiModel: text("gmi_model").notNull(),
    hydraSyncStatus: text("hydra_sync_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    assetUnique: uniqueIndex("memories_asset_unique").on(table.assetId),
    albumIdx: index("memories_album_idx").on(table.albumId)
  })
);

export const photonEvents = pgTable(
  "photon_events",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    senderId: text("sender_id").notNull(),
    messageId: text("message_id").notNull(),
    contentType: text("content_type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    messageUnique: uniqueIndex("photon_events_message_unique").on(table.messageId),
    spaceIdx: index("photon_events_space_idx").on(table.spaceId)
  })
);
