'use client'

import type { StepStatus, TokenData } from '@/types'

interface SubStep {
  stepNumber: number
  tokenId: string
  tokenType: 'access-token' | 'id-jag'
  label: string
}

interface AgentBlockProps {
  title: string
  description: string
  agentTo?: string
  color: 'emerald' | 'cyan' | 'violet'
  subSteps: SubStep[]
  stepStatuses: Record<number, StepStatus>
  stepErrors: Record<number, string>
  tokens: Record<string, TokenData>
  onTokenClick: (tokenId: string) => void
}

const colorMap = {
  emerald: {
    border: 'border-l-emerald-400',
    glow: 'shadow-[inset_0_0_0_1px_rgba(52,211,153,0.08)]',
    title: 'text-emerald-300',
    stepLabel: 'text-emerald-400/70',
  },
  cyan: {
    border: 'border-l-cyan-400',
    glow: 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]',
    title: 'text-cyan-300',
    stepLabel: 'text-cyan-400/70',
  },
  violet: {
    border: 'border-l-violet-400',
    glow: 'shadow-[inset_0_0_0_1px_rgba(167,139,250,0.08)]',
    title: 'text-violet-300',
    stepLabel: 'text-violet-400/70',
  },
}

const tokenBadge = {
  'access-token': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/25 hover:border-emerald-400/60 hover:shadow-[0_0_10px_rgba(52,211,153,0.25)]',
  'id-jag': 'bg-violet-500/15 text-violet-300 border-violet-400/30 hover:bg-violet-500/25 hover:border-violet-400/60 hover:shadow-[0_0_10px_rgba(167,139,250,0.25)]',
  disabled: {
    'access-token': 'bg-emerald-500/5 text-emerald-600 border-emerald-700/20',
    'id-jag': 'bg-violet-500/5 text-violet-600 border-violet-700/20',
  },
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'running':
      return <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
    case 'success':
      return (
        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case 'error':
      return (
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0" />
  }
}

function blockStatus(steps: number[], statuses: Record<number, StepStatus>): StepStatus {
  const list = steps.map((n) => statuses[n] ?? 'idle')
  if (list.every((s) => s === 'idle')) return 'idle'
  if (list.some((s) => s === 'error')) return 'error'
  if (list.every((s) => s === 'success')) return 'success'
  return 'running'
}

export default function AgentBlock({
  title, description, agentTo, color, subSteps,
  stepStatuses, stepErrors, tokens, onTokenClick,
}: AgentBlockProps) {
  const c = colorMap[color]
  const status = blockStatus(subSteps.map((s) => s.stepNumber), stepStatuses)

  return (
    <div className={`border-l-[3px] ${c.border} bg-slate-800/50 ${c.glow} rounded-r-xl p-4 space-y-3 border border-l-[3px] border-slate-700/20 transition-all`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm leading-snug ${c.title}`}>{title}</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>
        </div>
        <StatusIcon status={status} />
      </div>

      {/* Token badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        {subSteps.map((step, idx) => (
          <div key={step.stepNumber} className="flex items-center gap-2">
            {idx > 0 && <span className="text-slate-600 text-sm font-bold">→</span>}
            {tokens[step.tokenId] ? (
              <button
                type="button"
                onClick={() => onTokenClick(step.tokenId)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border transition-all ${tokenBadge[step.tokenType]}`}
              >
                {step.tokenId}: {step.tokenType}
              </button>
            ) : (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${tokenBadge.disabled[step.tokenType]}`}>
                {step.tokenId}: {step.tokenType}
              </span>
            )}
          </div>
        ))}
        {agentTo && (
          <>
            <span className="text-slate-600 text-sm font-bold">→</span>
            <span className="text-xs text-slate-500 italic">{agentTo}</span>
          </>
        )}
      </div>

      {/* Step status list */}
      <div className="space-y-2 pt-2 border-t border-slate-700/40">
        {subSteps.map((step) => (
          <div key={step.stepNumber} className="flex items-center gap-2.5">
            <StatusIcon status={stepStatuses[step.stepNumber] ?? 'idle'} />
            <span className={`text-xs flex-1 ${stepStatuses[step.stepNumber] === 'success' ? 'text-slate-300' : 'text-slate-500'}`}>
              {step.label}
            </span>
            {stepStatuses[step.stepNumber] === 'error' && stepErrors[step.stepNumber] && (
              <span className="text-xs text-red-400 truncate max-w-[140px]" title={stepErrors[step.stepNumber]}>
                {stepErrors[step.stepNumber]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Done indicator */}
      {status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold pt-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Done
        </div>
      )}
    </div>
  )
}
