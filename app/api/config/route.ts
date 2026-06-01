import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    orgUrl: process.env.OKTA_ORG_URL ?? '',
    serviceClientId: process.env.STEP1_CLIENT_ID ?? '',
    step1AuthServerId: process.env.STEP1_AUTH_SERVER_ID ?? '',
    step1Resource: process.env.STEP1_RESOURCE ?? '',
    proGearSalesAgentId: process.env.STEP2_CLIENT_ID ?? '',
    step2Audience: process.env.STEP2_AUDIENCE ?? '',
    step2Resource: process.env.STEP2_RESOURCE ?? '',
    proGearInventoryAuthServerId: process.env.STEP3_AUTH_SERVER_ID ?? '',
    proGearInventoryAgentId: process.env.STEP4_CLIENT_ID ?? '',
    inventoryMcpAudience: process.env.STEP4_AUDIENCE ?? '',
    inventoryMcpAuthServerId: process.env.STEP5_AUTH_SERVER_ID ?? '',
  })
}
