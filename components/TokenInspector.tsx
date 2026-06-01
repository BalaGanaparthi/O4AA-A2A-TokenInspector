'use client'

import { useState } from 'react'
import type { TokenData } from '@/types'

interface TokenInspectorProps {
  tokens: Record<string, TokenData>
  selectedToken: string | null
  onSelectToken: (tokenId: string) => void
}

const TOKEN_TABS = [
  { id: 'T1', subtitle: 'Access Token', color: 'emerald', step: 'Step 1', agent: 'Service Client' },
  { id: 'T2', subtitle: 'id-JAG',       color: 'violet',  step: 'Step 2', agent: 'ProGear Sales Agent' },
  { id: 'T3', subtitle: 'Access Token', color: 'cyan',    step: 'Step 3', agent: 'ProGear Sales Agent' },
  { id: 'T4', subtitle: 'id-JAG',       color: 'violet',  step: 'Step 4', agent: 'ProGear Inventory Agent' },
  { id: 'T5', subtitle: 'Final Token',  color: 'amber',   step: 'Step 5', agent: 'ProGear Inventory Agent' },
]

const TAB_STYLES: Record<string, { active: string; dot: string; sectionBorder: string; sectionBg: string }> = {
  emerald: {
    active:        'border-emerald-400 text-emerald-300',
    dot:           'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]',
    sectionBorder: 'border-emerald-500/30',
    sectionBg:     'bg-emerald-500/5',
  },
  violet: {
    active:        'border-violet-400 text-violet-300',
    dot:           'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]',
    sectionBorder: 'border-violet-500/30',
    sectionBg:     'bg-violet-500/5',
  },
  cyan: {
    active:        'border-cyan-400 text-cyan-300',
    dot:           'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]',
    sectionBorder: 'border-cyan-500/30',
    sectionBg:     'bg-cyan-500/5',
  },
  amber: {
    active:        'border-amber-400 text-amber-300',
    dot:           'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
    sectionBorder: 'border-amber-500/30',
    sectionBg:     'bg-amber-500/5',
  },
}

function formatClaimValue(key: string, value: unknown): string {
  if ((key === 'iat' || key === 'exp' || key === 'nbf') && typeof value === 'number') {
    return new Date(value * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function ClaimRow({ label, value }: { label: string; value: unknown }) {
  const formatted = formatClaimValue(label, value)
  const isMultiline = formatted.includes('\n')

  return (
    <div className={`py-2.5 border-b border-slate-700/40 last:border-0 ${isMultiline ? 'space-y-1' : 'grid grid-cols-[110px_1fr] gap-3 items-start'}`}>
      <span className="text-xs font-semibold text-slate-500 font-mono truncate">{label}</span>
      <pre className="text-xs text-slate-200 font-mono break-all whitespace-pre-wrap leading-relaxed">{formatted}</pre>
    </div>
  )
}

export default function TokenInspector({ tokens, selectedToken, onSelectToken }: TokenInspectorProps) {
  const [showRaw, setShowRaw] = useState(false)
  const token = selectedToken ? tokens[selectedToken] : null
  const activeTab = TOKEN_TABS.find((t) => t.id === selectedToken)
  const ts = activeTab ? TAB_STYLES[activeTab.color] : null

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">

      {/* Panel header */}
      <div className="border-b border-white/5 px-6 py-4 shrink-0 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-100 tracking-wide">Token Inspector</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any token badge · JWTs from your Okta org
          </p>
        </div>
        {selectedToken && activeTab && ts && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${ts.sectionBorder} ${ts.sectionBg}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${ts.dot}`} />
            <span className="text-xs font-bold text-slate-200">{activeTab.step}</span>
            <span className="text-xs text-slate-400">— {activeTab.subtitle}</span>
          </div>
        )}
      </div>

      {/* Tabs — horizontal scroll to prevent cutoff */}
      <div className="border-b border-white/5 bg-slate-900/30 shrink-0 overflow-x-auto">
        <div className="flex min-w-max px-2">
          {TOKEN_TABS.map((tab) => {
            const available = !!tokens[tab.id]
            const active = selectedToken === tab.id
            const ts2 = TAB_STYLES[tab.color]

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => available && onSelectToken(tab.id)}
                disabled={!available}
                className={[
                  'px-5 py-3 border-b-2 transition-all whitespace-nowrap flex flex-col items-start gap-0.5',
                  active
                    ? ts2.active
                    : available
                      ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      : 'border-transparent text-slate-700 cursor-not-allowed',
                ].join(' ')}
              >
                {/* Main label row */}
                <div className="flex items-center gap-2.5">
                  {available && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${active ? ts2.dot : 'bg-slate-700'}`} />
                  )}
                  <span className="text-sm font-black">{tab.id}</span>
                  <span className={`text-sm font-normal ${active ? 'opacity-80' : 'opacity-60'}`}>
                    — {tab.subtitle}
                  </span>
                  {tab.id === 'T5' && available && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-full text-xs font-black">
                      FINAL
                    </span>
                  )}
                </div>
                {/* Fine print: agent name */}
                <span className={[
                  'text-[10px] font-medium pl-[18px]',
                  active ? 'opacity-70' : 'text-slate-600 opacity-60',
                ].join(' ')}>
                  ({tab.agent})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-7">
        {!token ? (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className="w-24 h-24 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
              <svg className="w-11 h-11 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-slate-400">No token selected</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Click <span className="text-indigo-400 font-bold">▶ Execute</span> to run the A2A chain,<br />
                then click a token tab above to inspect it
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Side-by-side: Claims + Delegation Chain ── */}
            <div className="flex gap-5 items-start">

              {/* Claims */}
              <section className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Claims</p>
                {token.decoded?.payload ? (
                  <div className="bg-slate-900/80 rounded-xl border border-slate-700/40 px-4 py-1">
                    {Object.entries(token.decoded.payload)
                      .filter(([k]) => k !== 'del_chain' && k !== 'act')
                      .map(([k, v]) => <ClaimRow key={k} label={k} value={v} />)}
                  </div>
                ) : (
                  <p className="text-sm text-red-400">Unable to decode token payload.</p>
                )}
              </section>

              {/* Delegation chain (act) — right column, only renders when present */}
              {Boolean(token.decoded?.payload?.act) && (
                <section className="w-[340px] shrink-0">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)]" />
                    <p className="text-sm font-black text-slate-200 uppercase tracking-[0.15em]">
                      Delegation Chain
                    </p>
                    <span className="text-sm text-indigo-400 font-bold normal-case tracking-normal">(act)</span>
                  </div>
                  {/* Card */}
                  <div className={[
                    'rounded-xl border-2 p-5 shadow-[0_0_20px_rgba(99,102,241,0.15)]',
                    ts ? `${ts.sectionBorder} ${ts.sectionBg}` : 'border-indigo-500/40 bg-indigo-500/8',
                  ].join(' ')}>
                    <pre className="text-xs font-mono text-indigo-100 whitespace-pre-wrap break-all leading-loose">
                      {JSON.stringify(token.decoded?.payload?.act ?? null, null, 2)}
                    </pre>
                  </div>
                </section>
              )}

              {/* del_chain fallback — right column */}
              {Boolean(token.decoded?.payload?.del_chain) && (
                <section className="w-[340px] shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)]" />
                    <p className="text-sm font-black text-slate-200 uppercase tracking-[0.15em]">Delegation Chain</p>
                  </div>
                  <div className="rounded-xl border-2 border-indigo-500/40 bg-indigo-500/8 p-5 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                    <pre className="text-xs font-mono text-indigo-100 whitespace-pre-wrap break-all leading-loose">
                      {JSON.stringify(token.decoded?.payload?.del_chain ?? null, null, 2)}
                    </pre>
                  </div>
                </section>
              )}

            </div>

            {/* Raw token — full width below */}
            <section>
              <button
                type="button"
                onClick={() => setShowRaw((r) => !r)}
                className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showRaw ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Raw Token
              </button>
              {showRaw && (
                <div className="mt-3 bg-[#0d1117] rounded-xl border border-slate-700/50 p-5">
                  <p className="text-xs font-mono text-emerald-400 break-all leading-relaxed">{token.raw}</p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  )
}
