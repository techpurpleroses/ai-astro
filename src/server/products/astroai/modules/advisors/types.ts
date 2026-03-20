export interface AdvisorDTO {
  id: string;
  name: string;
  specialty: string;
  specialtyIcon: string;
  tagline: string;
  bio: string;
  zodiacSign: string;
  yearsOfExperience: number;
  skills: string[];
  languages: string[];
  ratePerMinute: number;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  responseTime: string;
  totalSessions: number;
  avatarUrl: string | null;
}

export interface AdvisorsListDTO {
  advisors: AdvisorDTO[];
}
