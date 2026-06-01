import { SignJWT, importJWK } from 'jose'
import { randomUUID } from 'crypto'

export interface JWKPrivateKey {
  alg: string
  d: string
  dp: string
  dq: string
  e: string
  kty: string
  n: string
  p: string
  q: string
  qi: string
  kid: string
  use: string
}

/**
 * Creates a signed JWT for use as a client_assertion in OAuth flows.
 * The JWT is signed with RS256 using the provided RSA private key JWK.
 */
export async function createClientAssertion(
  privateKeyJWK: JWKPrivateKey,
  clientId: string,
  audience: string,
): Promise<string> {
  const privateKey = await importJWK(privateKeyJWK, 'RS256')
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: privateKeyJWK.kid, typ: 'JWT' })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(audience)
    .setExpirationTime(now + 60)
    .setIssuedAt(now)
    .setJti(randomUUID())
    .sign(privateKey)
}
