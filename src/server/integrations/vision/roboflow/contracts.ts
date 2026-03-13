export interface PalmDetectInput {
  imageUrl: string;
  handSide: "left" | "right" | "both";
  traceId: string;
}

export interface PalmDetectOutput {
  scores: Record<string, number>;
  lines: Array<Record<string, unknown>>;
  confidence: Record<string, number>;
}

