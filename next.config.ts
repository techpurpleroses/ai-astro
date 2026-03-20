import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "purpler-roses-technology",
  project: process.env.SENTRY_PROJECT ?? "astrology",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
