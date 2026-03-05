import { promises as fs } from 'fs'
import path from 'path'
import { type PalmScanRecord, PalmScanRecordSchema } from '@/lib/palm/contracts'

function resolvePalmDataRoot() {
  const configured = process.env.PALM_DATA_DIR?.trim()
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)
  }

  const isServerless =
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT)

  if (isServerless) {
    const tempRoot = process.env.TMPDIR || process.env.TEMP || '/tmp'
    return path.join(tempRoot, 'astro-ai', 'palm-readings')
  }

  return path.join(process.cwd(), 'data', 'palm-readings')
}

const PALM_DATA_ROOT = resolvePalmDataRoot()

function sanitizeClientId(clientId?: string) {
  const value = (clientId ?? 'anonymous').trim()
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
  return safe || 'anonymous'
}

function clientDir(clientId: string) {
  return path.join(PALM_DATA_ROOT, sanitizeClientId(clientId))
}

export function normalizeClientId(clientId?: string) {
  return sanitizeClientId(clientId)
}

export async function savePalmScanRecord(record: PalmScanRecord) {
  const parsed = PalmScanRecordSchema.parse(record)
  const dir = clientDir(parsed.clientId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${parsed.scanId}.json`)
  await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8')
}

export async function listPalmScanRecords(clientId: string, limit: number) {
  const dir = clientDir(clientId)
  try {
    const fileNames = await fs.readdir(dir)
    const rows = await Promise.all(
      fileNames
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          try {
            const raw = await fs.readFile(path.join(dir, name), 'utf8')
            const parsed = JSON.parse(raw)
            const record = PalmScanRecordSchema.safeParse(parsed)
            return record.success ? record.data : null
          } catch {
            return null
          }
        })
    )

    return rows
      .filter((row): row is PalmScanRecord => row !== null)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return []
    throw error
  }
}
