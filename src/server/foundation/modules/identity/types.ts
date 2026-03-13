import type { UUID } from "../../contracts";

export interface ProfileDTO {
  id: UUID;
  displayName: string;
  avatarUrl: string | null;
  preferredSystem: "western" | "vedic" | "chinese" | "indian_lunar" | "indian_solar" | "mayan" | "druid";
}

export interface SubjectDTO {
  id: UUID;
  userId: UUID;
  label: string;
  relationshipType: "self" | "partner" | "spouse" | "child" | "friend" | "client" | "other";
  birthDate: string;
  birthTime: string | null;
  timezone: string | null;
  birthPlaceName: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

