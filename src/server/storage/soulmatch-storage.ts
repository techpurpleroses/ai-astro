import { STORAGE_BUCKETS } from "./buckets";
import type { StorageClient } from "./contracts";
import { buildSoulmatchImagePath } from "./paths";

export interface UploadSoulmatchImageInput {
  userId: string;
  soulmatchId: string;
  fileName: string;
  bytes: ArrayBuffer | Uint8Array;
  contentType?: string;
}

export async function uploadSoulmatchImage(
  storage: StorageClient,
  input: UploadSoulmatchImageInput
): Promise<string> {
  const path = buildSoulmatchImagePath(input.userId, input.soulmatchId, input.fileName);
  await storage.from(STORAGE_BUCKETS.soulmatchImages).upload(path, input.bytes, {
    contentType: input.contentType || "image/png",
    upsert: false,
  });
  return path;
}

export async function getSoulmatchImageSignedUrl(
  storage: StorageClient,
  path: string,
  expiresInSeconds = 600
): Promise<string> {
  return storage.from(STORAGE_BUCKETS.soulmatchImages).createSignedUrl(path, { expiresInSeconds });
}

export async function deleteSoulmatchImage(storage: StorageClient, path: string): Promise<void> {
  await storage.from(STORAGE_BUCKETS.soulmatchImages).remove([path]);
}

