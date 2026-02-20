import { Redis } from 'ioredis'
import pg from 'pg'

const { Pool } = pg

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://quantum:quantum_dev@localhost:5432/quantum_games',
})

export interface Platform {
  id: string
  name: string
  issuer: string
  client_id: string
  deployment_id?: string
  auth_endpoint: string
  token_endpoint: string
  jwks_endpoint: string
  public_key?: string
  private_key?: string
}

export interface LTISession {
  platform_id: string
  user_id?: string
  context?: {
    id: string
    label?: string
    title?: string
    type?: string[]
  }
  resource_link?: {
    id: string
    title?: string
  }
  roles?: string[]
  custom?: Record<string, string>
  ags?: {
    scope: string[]
    lineitem?: string
    lineitems?: string
  }
  nrps?: {
    context_memberships_url: string
    service_versions: string[]
  }
  deep_linking?: {
    deep_link_return_url: string
    accept_types: string[]
    accept_presentation_document_targets: string[]
    accept_multiple?: boolean
    auto_create?: boolean
    data?: string
  }
}

export async function getPlatform(issuer: string): Promise<Platform | null> {
  const cached = await redis.get(`platform:${issuer}`)
  if (cached) {
    return JSON.parse(cached)
  }

  const result = await pool.query(
    'SELECT * FROM lti_platforms WHERE issuer = $1 AND is_active = true',
    [issuer]
  )

  if (result.rows.length === 0) {
    return null
  }

  const platform = result.rows[0] as Platform
  await redis.setex(`platform:${issuer}`, 3600, JSON.stringify(platform))
  
  return platform
}

export async function getPlatformById(id: string): Promise<Platform | null> {
  const result = await pool.query(
    'SELECT * FROM lti_platforms WHERE id = $1',
    [id]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  return result.rows[0] as Platform
}

export async function storeNonce(nonce: string, state: string): Promise<void> {
  await redis.setex(`nonce:${state}`, 600, nonce)
}

export async function verifyNonce(state: string): Promise<boolean> {
  const nonce = await redis.get(`nonce:${state}`)
  if (nonce) {
    await redis.del(`nonce:${state}`)
    return true
  }
  return false
}

export async function storeSession(sessionId: string, session: LTISession): Promise<void> {
  await redis.setex(`lti_session:${sessionId}`, 86400, JSON.stringify(session))
}

export async function getSession(sessionId: string): Promise<LTISession | null> {
  const data = await redis.get(`lti_session:${sessionId}`)
  if (!data) return null
  return JSON.parse(data)
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`lti_session:${sessionId}`)
}
