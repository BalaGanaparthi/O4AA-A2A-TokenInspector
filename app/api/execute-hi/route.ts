import { type NextRequest } from 'next/server'
import {
  executeStep2,
  executeStep3,
  executeStep4,
  executeStep5,
} from '@/lib/token-steps'

export const dynamic = 'force-dynamic'

type SSEPayload =
  | { step: number; status: 'running' }
  | { step: number; status: 'success'; token: string }
  | { step: number; status: 'error'; error: string }
  | { type: 'complete' }
  | { type: 'error'; message: string }

export async function POST(req: NextRequest) {
  // T1 is the user access token stored server-side after HI login
  const t1 = req.cookies.get('hi_access_token')?.value

  if (!t1) {
    return Response.json(
      { error: 'No HI token found. Complete the user sign-on flow first.' },
      { status: 401 },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: SSEPayload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const runStep = async <T>(stepNum: number, fn: () => Promise<T>): Promise<T | null> => {
        send({ step: stepNum, status: 'running' })
        try {
          return await fn()
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          send({ step: stepNum, status: 'error', error })
          return null
        }
      }

      try {
        // Step 1 token comes from the HI user sign-on — emit success immediately
        send({ step: 1, status: 'success', token: t1 })

        const t2 = await runStep(2, () => executeStep2(t1))
        if (!t2) return
        send({ step: 2, status: 'success', token: t2 })

        const t3 = await runStep(3, () => executeStep3(t2))
        if (!t3) return
        send({ step: 3, status: 'success', token: t3 })

        const t4 = await runStep(4, () => executeStep4(t3))
        if (!t4) return
        send({ step: 4, status: 'success', token: t4 })

        const t5 = await runStep(5, () => executeStep5(t4))
        if (!t5) return
        send({ step: 5, status: 'success', token: t5 })

        send({ type: 'complete' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      // Single-use: clear the HI token cookie once consumed
      'Set-Cookie': 'hi_access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    },
  })
}
