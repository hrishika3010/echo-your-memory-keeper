# The Roll Backend MVP Checklist

## Scope
- Build only the backend in `backend/`.
- Support one active live album at a time.
- Accept image attachments from Photon iMessage.
- Store the original image, run GMI `gpt-image-2-edit`, store the edited image, and publish the memory into the album API.
- Sync a text summary to HydraDB after publish.

## Project Shape
- `backend/api` for frontend-facing HTTP routes.
- `backend/worker` for Photon listener and async jobs.
- `backend/lib` for DB, queue, storage, and provider adapters.

## MVP Behavior
- `POST /v1/albums` creates an album.
- `POST /v1/albums/:albumId/activate` marks that album as the active Photon target.
- Every inbound Photon image routes to the active album.
- Backend acknowledges the upload quickly and processes the image asynchronously.
- `GET /v1/albums/:slug` returns album metadata and published memories with original and edited image URLs.
- `POST /v1/memories/:id/reprocess` re-runs the image edit flow for an existing memory.

## Integrations
- Photon:
  - `spectrum-ts` long-lived worker.
  - Accept only image attachments.
  - Use `photon_message_id` for idempotency.
- GMI:
  - Adapter with a fixed `editImage` interface.
  - Default prompt preserves the original photo while applying a subtle instant-film look.
  - Track request id, latency, and failure payload.
- HydraDB:
  - Non-blocking sidecar sync after publish.
  - `tenant_id = HYDRADB_TENANT_ID`
  - `sub_tenant_id = album_id`

## Data Model
- `albums`
  - `id`, `slug`, `title`, `status`, `is_active_ingestion`, `created_at`
- `assets`
  - `id`, `album_id`, `source`, `asset_type`, `photon_message_id`, `mime_type`, `original_storage_key`, `edited_storage_key`, `processing_status`, `failure_reason`, `received_at`, `published_at`
- `memories`
  - `id`, `album_id`, `asset_id`, `caption`, `style_prompt_version`, `gmi_model`, `hydra_sync_status`, `created_at`
- `photon_events`
  - `id`, `space_id`, `sender_id`, `message_id`, `content_type`, `received_at`

## Job Flow
- `ingest_photon_image`
- `edit_image_with_gmi`
- `publish_memory`
- `sync_memory_to_hydra`

## Deferred
- Vector search
- Google Drive
- Audio
- Group auth or contributor routing
- Relationship graph
- Chapters and curation
- Realtime frontend delivery
