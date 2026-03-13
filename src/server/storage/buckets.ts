export const STORAGE_BUCKETS = {
  palmScans: process.env.SUPABASE_BUCKET_PALM_SCANS || "palm_scans",
  soulmatchImages: process.env.SUPABASE_BUCKET_SOULMATCH_IMAGES || "soulmatch_images",
  astroReports: process.env.SUPABASE_BUCKET_ASTRO_REPORTS || "astro_reports",
} as const;

