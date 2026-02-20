import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import pg from 'pg'
import { v4 as uuidv4 } from 'uuid'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://quantum:quantum_dev@localhost:5432/quantum_games',
})

export const platformsRouter: RouterType = Router()

platformsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, issuer, client_id, deployment_id, auth_endpoint, token_endpoint, jwks_endpoint, is_active, created_at FROM lti_platforms ORDER BY name'
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error listing platforms:', error)
    res.status(500).json({ error: 'Failed to list platforms' })
  }
})

platformsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT id, name, issuer, client_id, deployment_id, auth_endpoint, token_endpoint, jwks_endpoint, is_active, created_at FROM lti_platforms WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Platform not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error getting platform:', error)
    res.status(500).json({ error: 'Failed to get platform' })
  }
})

interface PlatformInput {
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

platformsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const platform = req.body as PlatformInput
    const id = uuidv4()
    
    await pool.query(
      `INSERT INTO lti_platforms (id, name, issuer, client_id, deployment_id, auth_endpoint, token_endpoint, jwks_endpoint, public_key, private_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        platform.name,
        platform.issuer,
        platform.client_id,
        platform.deployment_id,
        platform.auth_endpoint,
        platform.token_endpoint,
        platform.jwks_endpoint,
        platform.public_key,
        platform.private_key,
      ]
    )
    
    res.status(201).json({ id, ...platform })
  } catch (error) {
    console.error('Error creating platform:', error)
    res.status(500).json({ error: 'Failed to create platform' })
  }
})

platformsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const platform = req.body as Partial<PlatformInput>
    
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1
    
    if (platform.name) {
      fields.push(`name = $${paramIndex++}`)
      values.push(platform.name)
    }
    if (platform.issuer) {
      fields.push(`issuer = $${paramIndex++}`)
      values.push(platform.issuer)
    }
    if (platform.client_id) {
      fields.push(`client_id = $${paramIndex++}`)
      values.push(platform.client_id)
    }
    if (platform.deployment_id !== undefined) {
      fields.push(`deployment_id = $${paramIndex++}`)
      values.push(platform.deployment_id)
    }
    if (platform.auth_endpoint) {
      fields.push(`auth_endpoint = $${paramIndex++}`)
      values.push(platform.auth_endpoint)
    }
    if (platform.token_endpoint) {
      fields.push(`token_endpoint = $${paramIndex++}`)
      values.push(platform.token_endpoint)
    }
    if (platform.jwks_endpoint) {
      fields.push(`jwks_endpoint = $${paramIndex++}`)
      values.push(platform.jwks_endpoint)
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }
    
    values.push(id)
    
    await pool.query(
      `UPDATE lti_platforms SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating platform:', error)
    res.status(500).json({ error: 'Failed to update platform' })
  }
})

platformsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM lti_platforms WHERE id = $1', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform:', error)
    res.status(500).json({ error: 'Failed to delete platform' })
  }
})
