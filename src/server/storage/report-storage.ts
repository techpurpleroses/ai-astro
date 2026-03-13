import { STORAGE_BUCKETS } from "./buckets";
import type { StorageClient } from "./contracts";
import { buildAstroReportPath } from "./paths";

export interface UploadReportInput {
  userId: string;
  reportType: string;
  reportId: string;
  bytes: ArrayBuffer | Uint8Array;
  extension?: "pdf" | "png" | "jpg";
  contentType?: string;
}

export async function uploadAstroReport(storage: StorageClient, input: UploadReportInput): Promise<string> {
  const path = buildAstroReportPath(input.userId, input.reportType, input.reportId, input.extension || "pdf");
  await storage.from(STORAGE_BUCKETS.astroReports).upload(path, input.bytes, {
    contentType: input.contentType || "application/pdf",
    upsert: false,
  });
  return path;
}

export async function getAstroReportSignedUrl(
  storage: StorageClient,
  path: string,
  expiresInSeconds = 900
): Promise<string> {
  return storage.from(STORAGE_BUCKETS.astroReports).createSignedUrl(path, { expiresInSeconds });
}

export async function deleteAstroReport(storage: StorageClient, path: string): Promise<void> {
  await storage.from(STORAGE_BUCKETS.astroReports).remove([path]);
}

