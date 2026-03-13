import { STORAGE_BUCKETS } from "./buckets";
import type { StorageClient } from "./contracts";
import { buildPalmScanPath } from "./paths";

export interface UploadPalmScanInput {
  userId: string;
  scanId: string;
  fileName: string;
  bytes: ArrayBuffer | Uint8Array;
  contentType?: string;
}

export async function uploadPalmScan(storage: StorageClient, input: UploadPalmScanInput): Promise<string> {
  const path = buildPalmScanPath(input.userId, input.scanId, input.fileName);
  await storage.from(STORAGE_BUCKETS.palmScans).upload(path, input.bytes, {
    contentType: input.contentType || "image/jpeg",
    upsert: false,
  });
  return path;
}

export async function getPalmScanSignedUrl(
  storage: StorageClient,
  path: string,
  expiresInSeconds = 300
): Promise<string> {
  return storage.from(STORAGE_BUCKETS.palmScans).createSignedUrl(path, { expiresInSeconds });
}

export async function deletePalmScan(storage: StorageClient, path: string): Promise<void> {
  await storage.from(STORAGE_BUCKETS.palmScans).remove([path]);
}

