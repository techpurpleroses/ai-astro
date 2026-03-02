import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image, detail: 'high' },
            },
            {
              type: 'text',
              text: `Analyze this palm photograph. Locate the actual visible skin crease lines on the hand and return their precise positions.

Return ONLY a raw JSON object (no markdown, no explanation):
{
  "heart": [[x1,y1],[xm,ym],[x2,y2]],
  "head":  [[x1,y1],[xm,ym],[x2,y2]],
  "life":  [[x1,y1],[xm,ym],[x2,y2]],
  "fate":  [[x1,y1],[xm,ym],[x2,y2]]
}

Each value is [start, midpoint, end] with coordinates normalized 0.0–1.0 (0,0 = top-left of image, 1,1 = bottom-right).

Line definitions:
- heart: The uppermost major horizontal crease running across the palm just below the finger bases, from the pinky (ulnar) side toward the index finger (radial) side.
- head: The second major horizontal crease running across the middle of the palm, starting from the thumb-index web space toward the pinky side. Often forks or connects with the life line at its start.
- life: The curved crease that arcs around the base of the thumb (thenar eminence), starting near the head line and sweeping down toward the wrist.
- fate: The near-vertical crease running from the wrist area upward through the center of the palm toward the middle finger base. May not be prominent on all palms — estimate if faint.

Trace the ACTUAL visible creases in the photo, not anatomical guesses. If the image is not a palm or lines are not visible, return {"error":"no_palm"}.`,
            },
          ],
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const json = JSON.parse(cleaned)

    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 422 })
    }

    return NextResponse.json(json)
  } catch (err) {
    console.error('palm-detect error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
