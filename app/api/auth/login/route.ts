import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

export function GET() {
  const orgUrl = process.env.OKTA_ORG_URL
  const authServerId = process.env.HI_AUTH_SERVER_ID
  const clientId = process.env.HI_CLIENT_ID
  const callbackUrl = process.env.HI_CALLBACK_URL
  const scope = process.env.HI_SCOPE ?? 'openid agent.invoke'
  // resource is optional — only include if explicitly set in .env
  // (Omitting it avoids resource-indicator policy evaluation failures for clients
  // whose Okta access policy rules do not include a resource audience constraint)
  const resource = process.env.HI_RESOURCE

  if (!orgUrl || !authServerId || !clientId || !callbackUrl) {
    return NextResponse.json(
      { error: 'HI OAuth environment variables are not configured.' },
      { status: 500 },
    )
  }

  // PKCE: generate code verifier + challenge
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  // State for CSRF protection
  const state = randomBytes(16).toString('hex')

  const authUrl = new URL(`${orgUrl}/oauth2/${authServerId}/v1/authorize`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', callbackUrl)
  authUrl.searchParams.set('scope', scope)
  if (resource) authUrl.searchParams.set('resource', resource)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  const response = NextResponse.redirect(authUrl.toString())

  // Store PKCE verifier and state in short-lived httpOnly cookies
  const cookieOpts = { httpOnly: true, path: '/', sameSite: 'lax' as const }
  response.cookies.set('oauth_state', state, { ...cookieOpts, maxAge: 600 })
  response.cookies.set('oauth_code_verifier', codeVerifier, { ...cookieOpts, maxAge: 600 })

  return response
}
