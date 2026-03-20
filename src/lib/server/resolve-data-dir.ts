import path from 'path'

const isServerless =
  process.env.VERCEL === '1' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT)

/**
 * Resolves a data directory path at module-init time.
 * Priority: explicit env var → serverless /tmp → local cwd/data.
 *
 * @param envVar     The env var that can override the path (e.g. "PALM_DATA_DIR")
 * @param subDir     The sub-directory name used under the default roots (e.g. "palm-readings")
 */
export function resolveDataDir(envVar: string, subDir: string): string {
  const configured = process.env[envVar]?.trim()
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)
  }

  if (isServerless) {
    const tempRoot = process.env.TMPDIR || process.env.TEMP || '/tmp'
    return path.join(tempRoot, 'astro-ai', subDir)
  }

  return path.join(process.cwd(), 'data', subDir)
}
