'use client'

import AgentBlock from './AgentBlock'
import type { StepStatus, TokenData } from '@/types'

export type Scenario = 'nhi' | 'hi'

interface FlowPanelProps {
  stepStatuses: Record<number, StepStatus>
  stepErrors: Record<number, string>
  tokens: Record<string, TokenData>
  onTokenClick: (tokenId: string) => void
  scenario: Scenario
}

const BLOCK1 = {
  nhi: {
    title: 'Service Client Gets T1',
    description:
      'Authenticates at ProGear Sales AS using client credentials. The resulting M2M access token grants access to ProGearSales Agent.',
  },
  hi: {
    title: 'User Sign-On Gets T1',
    description:
      'User signs in to ProGear Sales AS with credentials + MFA. The resulting user access token grants access to ProGearSales Agent.',
  },
}

const BLOCKS_2_3 = [
  {
    id: 'progear-sales',
    title: 'ProGearSales Agent  T1 → T3',
    description:
      'Presents T1(M2M) to ProGear Sales AS for an id-jag targeting ProGearInventory (T2), then presents T2 at ProGearInventory AS for an A2A access token (T3) to access ProGearInventory agent.',
    agentTo: 'ProGearInventory Agent',
    color: 'cyan' as const,
    subSteps: [
      { stepNumber: 2, tokenId: 'T2', tokenType: 'id-jag' as const, label: 'Step 2 — Token exchange → id-jag (Org AS)' },
      { stepNumber: 3, tokenId: 'T3', tokenType: 'access-token' as const, label: 'Step 3 — JWT bearer grant (ProGearInventory AS)' },
    ],
  },
  {
    id: 'progear-inventory',
    title: 'ProGearInventory Agent  T3 → T5',
    description:
      'Presents T3 to ProGearInventory AS for an id-jag targeting InventoryMCP (T4), then presents T4 at InventoryMCP AS for the final access token (T5) to access MCP Server.',
    agentTo: 'InventoryMCP API',
    color: 'violet' as const,
    subSteps: [
      { stepNumber: 4, tokenId: 'T4', tokenType: 'id-jag' as const, label: 'Step 4 — Token exchange → id-jag (Org AS)' },
      { stepNumber: 5, tokenId: 'T5', tokenType: 'access-token' as const, label: 'Step 5 — JWT bearer grant (InventoryMCP AS)' },
    ],
  },
]

export default function FlowPanel({
  stepStatuses,
  stepErrors,
  tokens,
  onTokenClick,
  scenario,
}: FlowPanelProps) {
  const block1 = BLOCK1[scenario]

  const allBlocks = [
    {
      id: 'step1',
      title: block1.title,
      description: block1.description,
      agentTo: 'ProGearSales Agent',
      color: 'emerald' as const,
      subSteps: [
        {
          stepNumber: 1,
          tokenId: 'T1',
          tokenType: 'access-token' as const,
          label:
            scenario === 'hi'
              ? 'Step 1 — Authorization Code + PKCE (user login)'
              : 'Step 1 — Client credentials grant',
        },
      ],
    },
    ...BLOCKS_2_3,
  ]

  return (
    <div className="w-[380px] shrink-0 flex flex-col bg-slate-900/70 border-r border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Token Flow</p>
        <p className="text-xs text-slate-500 mt-1">
          {scenario === 'hi' ? 'Human Identity · 5-step A2A chain' : 'Non-Human Identity · 5-step A2A chain'}
        </p>
      </div>
      {/* Blocks */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allBlocks.map((block) => (
          <AgentBlock
            key={block.id}
            title={block.title}
            description={block.description}
            agentTo={block.agentTo}
            color={block.color}
            subSteps={block.subSteps}
            stepStatuses={stepStatuses}
            stepErrors={stepErrors}
            tokens={tokens}
            onTokenClick={onTokenClick}
          />
        ))}
      </div>
    </div>
  )
}
