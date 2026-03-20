import { promises as fs } from "fs";
import path from "path";
import {
  type OnboardingCategorySlug,
  ONBOARDING_CATEGORIES,
} from "@/lib/onboarding/config";

export interface OnboardingAssetManifest {
  images: string[];
  videos: string[];
  audio: string[];
  fonts: string[];
}

const PUBLIC_ASSET_ROOT = path.join(
  process.cwd(),
  "public",
  "assets",
  "onboarding"
);

const EXTENSIONS = {
  images: new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]),
  videos: new Set([".mp4", ".webm", ".mov"]),
  audio: new Set([".mp3", ".wav", ".ogg", ".m4a"]),
  fonts: new Set([".woff", ".woff2", ".ttf", ".otf"]),
} as const;

function normalizeKey(fileName: string) {
  return fileName.replace(/^[a-f0-9]{10,}-/i, "").toLowerCase();
}

async function listUniqueFiles(
  dirPath: string,
  allowedExt: Set<string>
): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const candidates = files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => allowedExt.has(path.extname(name).toLowerCase()));

    const deduped = new Map<string, string>();
    for (const name of candidates) {
      const key = normalizeKey(name);
      if (!deduped.has(key)) deduped.set(key, name);
    }

    return [...deduped.values()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  } catch {
    return [];
  }
}

export async function getOnboardingAssetManifest(
  category: OnboardingCategorySlug
): Promise<OnboardingAssetManifest> {
  const categoryPath = path.join(PUBLIC_ASSET_ROOT, category);
  const [images, videos, audio, fonts] = await Promise.all([
    listUniqueFiles(path.join(categoryPath, "images"), EXTENSIONS.images),
    listUniqueFiles(path.join(categoryPath, "videos"), EXTENSIONS.videos),
    listUniqueFiles(path.join(categoryPath, "audio"), EXTENSIONS.audio),
    listUniqueFiles(path.join(categoryPath, "fonts"), EXTENSIONS.fonts),
  ]);

  const toPublicUrl = (type: string, file: string) =>
    `/assets/onboarding/${category}/${type}/${encodeURIComponent(file)}`;

  return {
    images: images.map((file) => toPublicUrl("images", file)),
    videos: videos.map((file) => toPublicUrl("videos", file)),
    audio: audio.map((file) => toPublicUrl("audio", file)),
    fonts: fonts.map((file) => toPublicUrl("fonts", file)),
  };
}

export async function getAllOnboardingAssetManifests(): Promise<
  Record<OnboardingCategorySlug, OnboardingAssetManifest>
> {
  const entries = await Promise.all(
    ONBOARDING_CATEGORIES.map(async (category) => {
      const manifest = await getOnboardingAssetManifest(category);
      return [category, manifest] as const;
    })
  );

  return Object.fromEntries(entries) as Record<
    OnboardingCategorySlug,
    OnboardingAssetManifest
  >;
}

