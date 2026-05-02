export const STYLE_PROMPT_VERSION = "polaroid-v1";

export function buildPolaroidEditPrompt(): string {
  return [
    "Edit this photo into a polished instant-film memory while preserving the real subject, scene, and composition.",
    "Keep the people, objects, framing, and emotion intact.",
    "Apply a subtle warm analog color grade, soft instant-film contrast, gentle grain, slight vignette, and tasteful vintage softness.",
    "Do not add fake borders, stickers, text, extra people, surreal elements, or change the event itself.",
    "The result should feel like a refined Polaroid-style memory from a shared album."
  ].join(" ");
}
