import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { detectPalmLines } from '@/lib/palm/detect'
import { interpretPalmScan } from '@/lib/palm/interpret'
import { normalizeClientId, savePalmScanRecord } from '@/lib/palm/store'
import { PalmScanRecordSchema, PalmScanRequestSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'
export const maxDuration = 60
const PALM_DEBUG = process.env.PALM_DEBUG !== '0'

function debugLog(step: string, data?: Record<string, unknown>) {
  if (!PALM_DEBUG) return
  if (data) {
    console.log(`[api/palm/scan] ${step}`, data)
    return
  }
  console.log(`[api/palm/scan] ${step}`)
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await req.json()
    const input = PalmScanRequestSchema.parse(body)
    debugLog('request.received', {
      side: input.side,
      clientId: input.clientId ?? 'generated',
      imageChars: input.image.length,
      imageWidth: input.imageWidth ?? null,
      imageHeight: input.imageHeight ?? null,
    })

    const detectStart = Date.now()
    const detect = await detectPalmLines(input.image, input.side, {
      imageWidth: input.imageWidth,
      imageHeight: input.imageHeight,
    })
    debugLog('detect.done', { ms: Date.now() - detectStart, hasPalm: detect.hasPalm, model: detect.model })
    if (!detect.hasPalm) {
      debugLog('response.no_palm', { reason: detect.reason, totalMs: Date.now() - startedAt })
      return NextResponse.json({ error: 'no_palm', details: detect }, { status: 422 })
    }

    const interpretStart = Date.now()
    const interpret = await interpretPalmScan({
      side: input.side,
      lines: detect.lines,
      confidence: detect.confidence,
    })
    debugLog('interpret.done', { ms: Date.now() - interpretStart, score: interpret.core.lineScore })

    const record = PalmScanRecordSchema.parse({
      scanId: randomUUID(),
      clientId: normalizeClientId(input.clientId),
      side: input.side,
      createdAt: new Date().toISOString(),
      detect,
      interpret,
    })

    const saveStart = Date.now()
    try {
      await savePalmScanRecord(record)
      debugLog('store.done', { ms: Date.now() - saveStart, scanId: record.scanId })
    } catch (error) {
      console.error('palm.scan store error:', error)
      debugLog('store.fail', {
        ms: Date.now() - saveStart,
        scanId: record.scanId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
    debugLog('response.success', { totalMs: Date.now() - startedAt })
    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof ZodError) {
      debugLog('response.invalid_request', { totalMs: Date.now() - startedAt })
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    const reason = error instanceof Error ? error.message : String(error)
    console.error('palm.scan error:', error)
    debugLog('response.server_error', {
      totalMs: Date.now() - startedAt,
      reason,
    })
    return NextResponse.json({ error: 'server_error', details: { reason } }, { status: 500 })
  }
}

