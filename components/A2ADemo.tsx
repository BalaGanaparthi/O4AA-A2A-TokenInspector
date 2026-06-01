'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import FlowPanel, { type Scenario } from './FlowPanel'
import TokenInspector from './TokenInspector'
import ConfigPanel from './ConfigPanel'
import type { StepStatus, TokenData, SSEEvent, AppConfig } from '@/types'

const INITIAL_STATUSES: Record<number, StepStatus> = { 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle' }

/** Recursively collect all `sub` values from a nested act chain. */
function extractActSubs(act: unknown, acc: string[] = []): string[] {
  if (!act || typeof act !== 'object') return acc
  const node = act as Record<string, unknown>
  if (typeof node.sub === 'string') acc.push(node.sub)
  if (node.act) extractActSubs(node.act, acc)
  return acc
}

function decodeJWT(token: string) {
  try {
    const [h, p] = token.split('.')
    const decode = (s: string) =>
      JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    return { header: decode(h), payload: decode(p) }
  } catch {
    return null
  }
}

export default function A2ADemo() {
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>(INITIAL_STATUSES)
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({})
  const [tokens, setTokens] = useState<Record<string, TokenData>>({})
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [scenario, setScenario] = useState<Scenario>('nhi')

  // Used to trigger HI execute after the OAuth redirect returns
  const pendingHI = useRef(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: AppConfig) => setConfig(data))
      .catch(() => {})
  }, [])

  // Detect ?hi=ready or ?hi_error=... after OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.has('hi_error')) {
      setFatalError(decodeURIComponent(params.get('hi_error') ?? 'Unknown error'))
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (params.get('hi') === 'ready') {
      window.history.replaceState({}, '', window.location.pathname)
      pendingHI.current = true
      setScenario('hi')
    }
  }, [])

  // When scenario switches to HI with a pending login, auto-start the HI flow
  useEffect(() => {
    if (scenario === 'hi' && pendingHI.current) {
      pendingHI.current = false
      startSSEFlow('/api/execute-hi')
    }
  }, [scenario]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Shared SSE consumer — works for both /api/execute and /api/execute-hi */
  const startSSEFlow = useCallback(async (endpoint: string) => {
    setRunning(true)
    setStepStatuses(INITIAL_STATUSES)
    setStepErrors({})
    setTokens({})
    setSelectedToken(null)
    setFatalError(null)

    try {
      const response = await fetch(endpoint, { method: 'POST' })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: SSEEvent
          try { event = JSON.parse(line.slice(6)) as SSEEvent } catch { continue }

          if (event.step !== undefined && event.status) {
            setStepStatuses((prev) => ({ ...prev, [event.step!]: event.status! }))
            if (event.status === 'success' && event.token) {
              const tokenId = `T${event.step}`
              setTokens((prev) => ({
                ...prev,
                [tokenId]: { id: tokenId, raw: event.token!, decoded: decodeJWT(event.token!) },
              }))
              setSelectedToken(tokenId)
            }
            if (event.status === 'error' && event.error) {
              setStepErrors((prev) => ({ ...prev, [event.step!]: event.error! }))
            }
          }
          if (event.type === 'error') setFatalError(event.message ?? 'An unexpected error occurred')
        }
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }, [])

  const handleExecuteNHI = useCallback(() => {
    if (running) return
    setScenario('nhi')
    startSSEFlow('/api/execute')
  }, [running, startSSEFlow])

  const handleReset = useCallback(() => {
    setStepStatuses(INITIAL_STATUSES)
    setStepErrors({})
    setTokens({})
    setSelectedToken(null)
    setRunning(false)
    setFatalError(null)
    setScenario('nhi')
  }, [])

  const allDone = Object.values(stepStatuses).every((s) => s === 'success')
  const hasError = Object.values(stepStatuses).some((s) => s === 'error')

  const currentTokenData = selectedToken ? tokens[selectedToken] : null
  const actSubIds = currentTokenData?.decoded?.payload?.act
    ? extractActSubs(currentTokenData.decoded.payload.act)
    : undefined

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 bg-gradient-to-r from-[#1a1040] via-slate-900 to-slate-950 border-b border-white/5 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4">

          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-end gap-1">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-cyan-300 to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
              <div className="w-2 h-5 rounded-full bg-gradient-to-b from-violet-400 to-purple-600 opacity-80 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
              <div className="w-2 h-3 rounded-full bg-gradient-to-b from-pink-400 to-rose-600 opacity-60" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black bg-gradient-to-r from-cyan-300 to-indigo-400 text-transparent bg-clip-text tracking-widest uppercase">
                  OKTA
                </span>
                <span className="text-slate-600">|</span>
                <h1 className="text-base font-bold text-slate-100 tracking-wide">A2A Identity Chaining</h1>
              </div>
              <p className="text-xs text-indigo-400/60 tracking-[0.2em] uppercase mt-0.5 font-medium">
                {scenario === 'hi' ? 'Human Identity Scenario' : 'Service Client Scenario'}
              </p>
            </div>
          </div>

          {/* Status pill */}
          <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur">
            {allDone ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs text-emerald-300 font-semibold">All 5 steps complete</span>
              </>
            ) : hasError ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                <span className="text-xs text-red-300 font-semibold">Step failed</span>
              </>
            ) : running ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-xs text-cyan-300 font-semibold">Executing chain…</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs text-slate-400 font-medium">Ready to execute</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {fatalError && (
              <span className="text-xs text-red-400 max-w-xs truncate hidden lg:block" title={fatalError}>
                ⚠ {fatalError}
              </span>
            )}

            {/* Execute NHI — service client / M2M flow */}
            <button
              type="button"
              onClick={handleExecuteNHI}
              disabled={running}
              title="Non-Human Identity: service client credentials flow"
              className={[
                'px-4 py-2 rounded-lg text-sm font-bold text-white transition-all flex items-center gap-2 min-w-[130px] justify-center',
                'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500',
                'shadow-[0_0_16px_rgba(99,102,241,0.4)] hover:shadow-[0_0_24px_rgba(99,102,241,0.6)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {running && scenario === 'nhi'
                ? <><div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />Running…</>
                : <>▶ Execute NHI</>
              }
            </button>

            {/* Execute HI — user sign-on flow.
                Uses a plain <a> so the browser follows the link natively,
                triggering the server-side 307 redirect to Okta without
                any Next.js client-router interference. */}
            {running && scenario === 'hi' ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 min-w-[120px] justify-center bg-gradient-to-r from-emerald-600 to-teal-600 opacity-40 cursor-not-allowed"
              >
                <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Running…
              </button>
            ) : (
              <a
                href="/api/auth/login"
                title="Human Identity: sign in to Okta then run the A2A chain"
                className={[
                  'px-4 py-2 rounded-lg text-sm font-bold text-white transition-all flex items-center gap-2 min-w-[120px] justify-center no-underline',
                  'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
                  'shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:shadow-[0_0_24px_rgba(16,185,129,0.55)]',
                  running ? 'pointer-events-none opacity-40' : '',
                ].join(' ')}
              >
                ▶ Execute HI
              </a>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-slate-600/80 hover:border-slate-400 text-slate-400 hover:text-slate-100 rounded-lg text-sm font-semibold transition-all hover:bg-slate-800/40"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <FlowPanel
          stepStatuses={stepStatuses}
          stepErrors={stepErrors}
          tokens={tokens}
          onTokenClick={setSelectedToken}
          scenario={scenario}
        />
        <TokenInspector
          tokens={tokens}
          selectedToken={selectedToken}
          onSelectToken={setSelectedToken}
        />
        <ConfigPanel config={config} selectedToken={selectedToken} actSubIds={actSubIds} />
      </div>
    </div>
  )
}
