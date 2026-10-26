// Portraits: painted with scripts/generate-portraits.mjs (OpenAI Images) into /public/portraits/{id}.webp.
// The SVG placeholders (scripts/make-portraits.mjs) still work: set this to "svg".
export const PORTRAIT_FORMAT: "svg" | "png" | "webp" = "webp";

// Scene art (scripts/generate-scenes.mjs): /public/scenes/hall.webp behind the table, stage.webp behind the seat screen.
// Set scene to false to fall back to the CSS vignette.
export const ROOM_ART: Record<"boardroom", { scene: boolean; verdict: boolean }> = {
  boardroom: { scene: true, verdict: false },
};
