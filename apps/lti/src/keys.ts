import crypto from 'crypto'
import * as jose from 'jose'

interface KeyPair {
  publicKey: jose.KeyLike
  privateKey: jose.KeyLike
  jwk: jose.JWK
  kid: string
}

let keyPair: KeyPair | null = null

export async function initializeKeys(): Promise<void> {
  const kid = `quantum-games-${Date.now()}`
  
  // Generate RSA key pair for signing
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
    extractable: true,
  })
  
  // Export public key as JWK
  const jwk = await jose.exportJWK(publicKey)
  jwk.kid = kid
  jwk.alg = 'RS256'
  jwk.use = 'sig'
  
  keyPair = {
    publicKey,
    privateKey,
    jwk,
    kid,
  }
  
  console.log('LTI keys initialized with kid:', kid)
}

export async function getJWKS(): Promise<{ keys: jose.JWK[] }> {
  if (!keyPair) {
    await initializeKeys()
  }
  return { keys: [keyPair!.jwk] }
}

export async function signJWT(payload: Record<string, any>, expiresIn: number = 3600): Promise<string> {
  if (!keyPair) {
    await initializeKeys()
  }

  const now = Math.floor(Date.now() / 1000)
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: keyPair!.kid, typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(process.env.LTI_ISSUER || 'https://quantum-games.edu')
    .sign(keyPair!.privateKey)

  return jwt
}

export async function verifyJWT(token: string, jwksUrl: string): Promise<jose.JWTPayload> {
  try {
    // Create JWKS from URL
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl))
    
    const { payload } = await jose.jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
    })
    
    return payload
  } catch (error) {
    console.error('JWT verification failed:', error)
    throw new Error('Invalid token')
  }
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function generateState(): string {
  return crypto.randomBytes(24).toString('base64url')
}
