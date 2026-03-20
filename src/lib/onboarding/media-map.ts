import type { OnboardingAssetManifest } from "@/lib/onboarding/assets";
import type { OnboardingCategorySlug } from "@/lib/onboarding/config";

type StepMediaSpec = {
  kind: "image" | "video";
  index: number;
};

// moon / compatibility / numerology / palm-reading → 14 steps
const SEQUENTIAL_14 = Array.from({ length: 14 }, (_, i) => ({ kind: "image" as const, index: i }));

// past-lives → 17 steps
const SEQUENTIAL_17 = Array.from({ length: 17 }, (_, i) => ({ kind: "image" as const, index: i }));

// sketch → 21 steps
const SEQUENTIAL_21 = Array.from({ length: 21 }, (_, i) => ({ kind: "image" as const, index: i }));

// astrocartography → 14 steps (mix of images + videos)
const ASTROCARTOGRAPHY_14: StepMediaSpec[] = [
  { kind: "image", index: 0 },
  { kind: "image", index: 1 },
  { kind: "image", index: 2 },
  { kind: "image", index: 3 },
  { kind: "image", index: 4 },
  { kind: "video", index: 0 },
  { kind: "image", index: 5 },
  { kind: "image", index: 6 },
  { kind: "image", index: 7 },
  { kind: "image", index: 8 },
  { kind: "video", index: 1 },
  { kind: "image", index: 9 },
  { kind: "image", index: 10 },
  { kind: "image", index: 11 },
];

const MEDIA_MAP: Record<OnboardingCategorySlug, StepMediaSpec[]> = {
  moon: SEQUENTIAL_14,
  compatibility: SEQUENTIAL_14,
  numerology: SEQUENTIAL_14,
  "palm-reading": SEQUENTIAL_14,
  "past-lives": SEQUENTIAL_17,
  astrocartography: ASTROCARTOGRAPHY_14,
  sketch: SEQUENTIAL_21,
};

function resolveIndex(index: number, length: number) {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

export function resolveStepMedia(
  category: OnboardingCategorySlug,
  stepIndex: number,
  assets: OnboardingAssetManifest
): { kind: "image" | "video"; src: string } {
  const fallbackImage = "/assets/features/moon-phases-hq.webp";
  const mapping = MEDIA_MAP[category];
  const mapped = mapping[resolveIndex(stepIndex, mapping.length)];

  if (mapped?.kind === "video" && assets.videos.length > 0) {
    const videoIndex = resolveIndex(mapped.index, assets.videos.length);
    return { kind: "video", src: assets.videos[videoIndex] };
  }

  if (assets.images.length > 0) {
    const imageIndex = resolveIndex(mapped?.index ?? stepIndex, assets.images.length);
    return { kind: "image", src: assets.images[imageIndex] };
  }

  return { kind: "image", src: fallbackImage };
}

export function getCategoryMediaMap(category: OnboardingCategorySlug): StepMediaSpec[] {
  return MEDIA_MAP[category];
}
