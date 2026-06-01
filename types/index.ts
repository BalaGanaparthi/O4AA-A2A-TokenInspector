export type StepStatus = 'idle' | 'running' | 'success' | 'error'

export interface DecodedJWT {
  header: Record<string, unknown>
  payload: Record<string, unknown>
}

export interface TokenData {
  id: string
  raw: string
  decoded: DecodedJWT | null
}

export interface SSEEvent {
  step?: number
  status?: StepStatus
  token?: string
  error?: string
  type?: 'complete' | 'error'
  message?: string
}

export interface AppConfig {
  orgUrl: string
  serviceClientId: string
  step1AuthServerId: string
  step1Resource: string
  proGearSalesAgentId: string
  step2Audience: string
  step2Resource: string
  proGearInventoryAuthServerId: string
  proGearInventoryAgentId: string
  inventoryMcpAudience: string
  inventoryMcpAuthServerId: string
}
