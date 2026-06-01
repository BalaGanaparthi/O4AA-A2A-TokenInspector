import { type NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const appRoot = new URL('/', req.url).toString()

  // Surface Okta errors back to the UI
  if (error) {
    const msg = encodeURIComponent(errorDescription ?? error)
    return NextResponse.redirect(`${appRoot}?hi_error=${msg}`)
  }

  // Validate state (CSRF)
  const storedState = req.cookies.get('oauth_state')?.value
  const codeVerifier = req.cookies.get('oauth_code_verifier')?.value

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appRoot}?hi_error=state_mismatch`)
  }

  if (!code || !codeVerifier) {
    return NextResponse.redirect(`${appRoot}?hi_error=missing_code_or_verifier`)
  }

  // Exchange authorization code for tokens
  const orgUrl = process.env.OKTA_ORG_URL
  const authServerId = process.env.HI_AUTH_SERVER_ID
  const clientId = process.env.HI_CLIENT_ID
  const clientSecret = process.env.HI_CLIENT_SECRET
  const callbackUrl = process.env.HI_CALLBACK_URL

  if (!orgUrl || !authServerId || !clientId || !clientSecret || !callbackUrl) {
    return NextResponse.redirect(`${appRoot}?hi_error=server_misconfigured`)
  }

  const tokenEndpoint = `${orgUrl}/oauth2/${authServerId}/v1/token`
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  // RFC 8707: resource sent in /authorize MUST also be sent in /token (must match exactly)
  const resource = process.env.HI_RESOURCE

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl,
    code_verifier: codeVerifier,
  })
  if (resource) body.set('resource', resource)

  let accessToken: string
  try {
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return NextResponse.redirect(
        `${appRoot}?hi_error=${encodeURIComponent(`Token exchange failed: ${errText}`)}`,
      )
    }

    const data = (await tokenRes.json()) as { access_token?: string }
    if (!data.access_token) {
      return NextResponse.redirect(`${appRoot}?hi_error=no_access_token`)
    }
    accessToken = data.access_token
  } catch {
    return NextResponse.redirect(`${appRoot}?hi_error=token_exchange_network_error`)
  }

  // Store access token in httpOnly cookie and redirect back to the app
  const response = NextResponse.redirect(`${appRoot}?hi=ready`)

  const cookieOpts = { httpOnly: true, path: '/', sameSite: 'lax' as const, maxAge: 300 }
  response.cookies.set('hi_access_token', accessToken, cookieOpts)

  // Clear PKCE / state cookies
  response.cookies.delete('oauth_state')
  response.cookies.delete('oauth_code_verifier')

  return response
}
