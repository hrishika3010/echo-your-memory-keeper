export type AssetVariant = "original" | "edited";

export function buildAssetRoute(appUrl: string, assetId: string, variant: AssetVariant): string {
  const normalized = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  return `${normalized}/v1/assets/${assetId}/${variant}`;
}

export function buildStorageKey(albumId: string, photonMessageId: string, variant: AssetVariant, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "image";
  return `albums/${albumId}/${variant}/${photonMessageId}-${safeName}`;
}
