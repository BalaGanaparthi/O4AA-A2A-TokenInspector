'use client'

import type { AppConfig } from '@/types'

interface ConfigPanelProps {
  config: AppConfig | null
  selectedToken: string | null
  actSubIds?: string[]   // sub values extracted from the act chain of the current token
}

const CONFIG_ITEMS: {
  key: keyof AppConfig
  label: string
  tag: string
  tokens: string[]
}[] = [
  { key: 'serviceClientId',             label: 'Service Client ID',               tag: 'a', tokens: ['T1', 'T2'] },
  { key: 'proGearSalesAgentId',          label: 'ProGearSales Agent ID',           tag: 'b', tokens: ['T2', 'T3'] },
  { key: 'step1Resource',                label: 'ProGearSales Resource URL',       tag: 'c', tokens: ['T1'] },
  { key: 'step1AuthServerId',            label: 'ProGearSales Auth Server ID',     tag: 'd', tokens: ['T1'] },
  { key: 'proGearInventoryAgentId',      label: 'ProGearInventory Agent ID',       tag: 'e', tokens: ['T4', 'T5'] },
  { key: 'step2Resource',                label: 'ProGearInventory Resource URL',   tag: 'f', tokens: ['T2', 'T3'] },
  { key: 'proGearInventoryAuthServerId', label: 'ProGearInventory Auth Server ID', tag: 'g', tokens: ['T2', 'T3'] },
  { key: 'inventoryMcpAuthServerId',     label: 'InventoryMCP Auth Server ID',     tag: 'h', tokens: ['T4', 'T5'] },
  { key: 'inventoryMcpAudience',         label: 'InventoryMCP Audience',           tag: 'i', tokens: ['T4', 'T5'] },
]

export default function ConfigPanel({ config, selectedToken, actSubIds }: ConfigPanelProps) {
  const actMatchCount = actSubIds
    ? CONFIG_ITEMS.filter((i) => actSubIds.includes(config?.[i.key] ?? '')).length
    : 0
  const tokenMatchCount = selectedToken
    ? CONFIG_ITEMS.filter((i) => i.tokens.includes(selectedToken)).length
    : 0
  const activeCount = actSubIds ? actMatchCount : tokenMatchCount

  return (
    <div className="w-[320px] shrink-0 flex flex-col bg-slate-900/70 border-l border-white/5 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Configuration</p>
          {selectedToken && (
            <span className={[
              'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
              actSubIds && actMatchCount > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
            ].join(' ')}>
              {activeCount} active
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {actSubIds && actMatchCount > 0
            ? <>IDs present in <span className="text-amber-300 font-semibold">act chain</span> of <span className="text-slate-300 font-semibold">{selectedToken}</span></>
            : selectedToken
              ? <>Fields used to produce <span className="text-indigo-300 font-semibold">{selectedToken}</span></>
              : 'Select a token to highlight relevant fields'}
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {CONFIG_ITEMS.map((item) => {
          const value = config?.[item.key] ?? ''

          // act-chain match: this config value appears as a sub in the act chain
          const isActMatch = !!(actSubIds && value && actSubIds.includes(value))

          // static token relevance: item is relevant to the selected token tab
          const isTokenRelevant = !!selectedToken && item.tokens.includes(selectedToken)

          const isActive = isActMatch || isTokenRelevant

          return (
            <div
              key={item.key}
              className={[
                'rounded-xl p-3.5 transition-all duration-200',
                isActMatch
                  ? 'bg-amber-950/50 border border-amber-400/45 shadow-[0_0_18px_rgba(251,191,36,0.15)]'
                  : isTokenRelevant
                    ? 'bg-indigo-950/60 border border-indigo-400/35 shadow-[0_0_16px_rgba(99,102,241,0.12)]'
                    : 'bg-slate-800/25 border border-slate-700/20 opacity-35',
              ].join(' ')}
            >
              {/* Top row: tag + label + act badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className={[
                  'text-xs font-black font-mono w-5 h-5 rounded flex items-center justify-center shrink-0',
                  isActMatch
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    : isTokenRelevant
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                      : 'bg-slate-700/50 text-slate-500 border border-slate-700/30',
                ].join(' ')}>
                  {item.tag}
                </span>
                <p className={[
                  'text-xs font-bold leading-snug truncate flex-1',
                  isActMatch ? 'text-amber-200' : isTokenRelevant ? 'text-slate-200' : 'text-slate-500',
                ].join(' ')}>
                  {item.label}
                </p>
                {isActMatch && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-400/30 shrink-0 uppercase tracking-wide">
                    act
                  </span>
                )}
              </div>

              {/* Value */}
              {value ? (
                <p
                  className={[
                    'text-[11px] font-mono leading-relaxed break-all',
                    isActMatch ? 'text-amber-100' : isTokenRelevant ? 'text-indigo-200' : 'text-slate-600',
                  ].join(' ')}
                  title={value}
                >
                  {value}
                </p>
              ) : (
                <p className="text-[11px] text-slate-700 italic">not configured</p>
              )}

              {/* Token relevance chips */}
              {isActive && (
                <div className="flex gap-1 mt-2.5 flex-wrap">
                  {item.tokens.map((t) => (
                    <span
                      key={t}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        t === selectedToken
                          ? isActMatch
                            ? 'bg-amber-500/40 text-amber-100 border border-amber-400/50'
                            : 'bg-indigo-500/40 text-indigo-100 border border-indigo-400/50'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
