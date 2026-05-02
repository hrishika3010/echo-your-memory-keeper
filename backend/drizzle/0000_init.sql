CREATE TABLE IF NOT EXISTS albums (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL,
  is_active_ingestion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_active_ingestion_idx ON albums (is_active_ingestion);

CREATE TABLE IF NOT EXISTS assets (
  id text PRIMARY KEY,
  album_id text NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  source text NOT NULL,
  asset_type text NOT NULL,
  photon_message_id text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  original_storage_key text NOT NULL,
  edited_storage_key text,
  processing_status text NOT NULL,
  failure_reason text,
  generated_caption text,
  gmi_model text,
  gmi_request_id text,
  gmi_latency_ms integer,
  gmi_failure_payload text,
  received_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS assets_album_idx ON assets (album_id);
CREATE INDEX IF NOT EXISTS assets_processing_idx ON assets (processing_status);

CREATE TABLE IF NOT EXISTS memories (
  id text PRIMARY KEY,
  album_id text NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  asset_id text NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  caption text NOT NULL,
  style_prompt_version text NOT NULL,
  gmi_model text NOT NULL,
  hydra_sync_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_album_idx ON memories (album_id);

CREATE TABLE IF NOT EXISTS photon_events (
  id text PRIMARY KEY,
  space_id text NOT NULL,
  sender_id text NOT NULL,
  message_id text NOT NULL UNIQUE,
  content_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photon_events_space_idx ON photon_events (space_id);
