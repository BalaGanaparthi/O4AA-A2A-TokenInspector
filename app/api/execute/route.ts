import { type NextRequest } from 'next/server'
import {
  executeStep1,
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

export async function POST(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: SSEPayload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const runStep = async <T>(
        stepNum: number,
        fn: () => Promise<T>,
      ): Promise<T | null> => {
        send({ step: stepNum, status: 'running' })
        try {
          const result = await fn()
          return result
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          send({ step: stepNum, status: 'error', error })
          return null
        }
      }

      try {
        const t1 = await runStep(1, executeStep1)
        if (!t1) return
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
    },
  })
}
