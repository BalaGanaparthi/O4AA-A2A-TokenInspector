import { createClientAssertion, type JWKPrivateKey } from './jwt-utils'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function parseJWK(envKey: string): JWKPrivateKey {
  const raw = requireEnv(envKey)
  try {
    return JSON.parse(raw) as JWKPrivateKey
  } catch {
    throw new Error(`${envKey} is not valid JSON. Ensure the JWK is a valid JSON object.`)
  }
}

async function postForm(url: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return JSON.parse(text) as Record<string, unknown>
}

/**
 * Step 1: Service Client authenticates at ProGear Custom AS using client credentials.
 * Returns T1 — a service access token scoped for ProGearSales Agent.
 */
export async function executeStep1(): Promise<string> {
  const orgUrl = requireEnv('OKTA_ORG_URL')
  const authServerId = requireEnv('STEP1_AUTH_SERVER_ID')
  const clientId = requireEnv('STEP1_CLIENT_ID')
  const clientSecret = requireEnv('STEP1_CLIENT_SECRET')
  const scope = requireEnv('STEP1_SCOPE')
  const resource = requireEnv('STEP1_RESOURCE')

  const tokenEndpoint = `${orgUrl}/oauth2/${authServerId}/v1/token`
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope, resource }).toString(),
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`)

  const data = JSON.parse(text) as Record<string, unknown>
  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token as string
}

/**
 * Step 2: ProGearSales Agent performs a token exchange at the Org AS.
 * Exchanges T1 for an id-jag (T2) targeting the ProGearInventory authorization server.
 */
export async function executeStep2(t1: string): Promise<string> {
  const orgUrl = requireEnv('OKTA_ORG_URL')
  const clientId = requireEnv('STEP2_CLIENT_ID')
  const privateKey = parseJWK('STEP2_PRIVATE_KEY_JWK')
  const audience = requireEnv('STEP2_AUDIENCE')
  const resource = requireEnv('STEP2_RESOURCE')
  const scope = requireEnv('STEP2_SCOPE')

  const tokenEndpoint = `${orgUrl}/oauth2/v1/token`
  const clientAssertion = await createClientAssertion(privateKey, clientId, tokenEndpoint)

  const data = await postForm(tokenEndpoint, {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: t1,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:id-jag',
    audience,
    resource,
    scope,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  })

  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token as string
}

/**
 * Step 3: ProGearSales Agent presents the id-jag (T2) at the ProGearInventory AS.
 * Uses JWT bearer grant to obtain an A2A access token (T3) for ProGearInventory.
 */
export async function executeStep3(t2: string): Promise<string> {
  const orgUrl = requireEnv('OKTA_ORG_URL')
  const authServerId = requireEnv('STEP3_AUTH_SERVER_ID')
  const clientId = requireEnv('STEP3_CLIENT_ID')
  const privateKey = parseJWK('STEP3_PRIVATE_KEY_JWK')

  const tokenEndpoint = `${orgUrl}/oauth2/${authServerId}/v1/token`
  const clientAssertion = await createClientAssertion(privateKey, clientId, tokenEndpoint)

  const data = await postForm(tokenEndpoint, {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: t2,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  })

  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token as string
}

/**
 * Step 4: ProGearInventory Agent performs a token exchange at the Org AS.
 * Exchanges T3 for an id-jag (T4) targeting the InventoryMCP authorization server.
 */
export async function executeStep4(t3: string): Promise<string> {
  const orgUrl = requireEnv('OKTA_ORG_URL')
  const clientId = requireEnv('STEP4_CLIENT_ID')
  const privateKey = parseJWK('STEP4_PRIVATE_KEY_JWK')
  const audience = requireEnv('STEP4_AUDIENCE')
  const scope = requireEnv('STEP4_SCOPE')

  const tokenEndpoint = `${orgUrl}/oauth2/v1/token`
  const clientAssertion = await createClientAssertion(privateKey, clientId, tokenEndpoint)

  const data = await postForm(tokenEndpoint, {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: t3,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:id-jag',
    audience,
    scope,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  })

  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token as string
}

/**
 * Step 5: ProGearInventory Agent presents the id-jag (T4) at the InventoryMCP AS.
 * Uses JWT bearer grant to obtain the final access token (T5) for InventoryMCP API.
 */
export async function executeStep5(t4: string): Promise<string> {
  const orgUrl = requireEnv('OKTA_ORG_URL')
  const authServerId = requireEnv('STEP5_AUTH_SERVER_ID')
  const clientId = requireEnv('STEP5_CLIENT_ID')
  const privateKey = parseJWK('STEP5_PRIVATE_KEY_JWK')

  const tokenEndpoint = `${orgUrl}/oauth2/${authServerId}/v1/token`
  const clientAssertion = await createClientAssertion(privateKey, clientId, tokenEndpoint)

  const data = await postForm(tokenEndpoint, {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: t4,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  })

  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token as string
}
