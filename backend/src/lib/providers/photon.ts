export interface PhotonAttachment {
  type: "attachment";
  data: Buffer;
  mimeType: string;
  name: string;
}

export function isPhotonImageAttachment(
  content: { type: string; mimeType?: string } | PhotonAttachment
): content is PhotonAttachment {
  return content.type === "attachment" && typeof content.mimeType === "string" && content.mimeType.startsWith("image/");
}
