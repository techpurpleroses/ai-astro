function cleanSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildPalmScanPath(userId: string, scanId: string, fileName: string): string {
  return `${cleanSegment(userId)}/${cleanSegment(scanId)}/${cleanSegment(fileName)}`;
}

export function buildSoulmatchImagePath(userId: string, soulmatchId: string, fileName: string): string {
  return `${cleanSegment(userId)}/${cleanSegment(soulmatchId)}/${cleanSegment(fileName)}`;
}

export function buildAstroReportPath(userId: string, reportType: string, reportId: string, extension = "pdf"): string {
  const ext = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "pdf";
  return `${cleanSegment(userId)}/${cleanSegment(reportType)}/${cleanSegment(reportId)}.${ext}`;
}

