export function buildFallbackCaption(receivedAt: Date): string {
  return `Polaroid memory captured on ${receivedAt.toISOString().slice(0, 10)}.`;
}

export function normalizeCaption(candidate: string | null | undefined, receivedAt: Date): string {
  const normalized = candidate?.trim();
  if (!normalized) {
    return buildFallbackCaption(receivedAt);
  }

  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}
