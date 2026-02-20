import { Request, Response } from 'express'
import * as jose from 'jose'
import { v4 as uuidv4 } from 'uuid'
import { getPlatform, storeNonce, verifyNonce, storeSession } from './store.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export async function loginRoute(req: Request, res: Response) {
  const { iss, login_hint, target_link_uri, lti_message_hint, client_id } = req.query

  if (!iss || !login_hint) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  const platform = await getPlatform(iss as string)
  if (!platform) {
    return res.status(404).json({ error: 'Platform not registered' })
  }

  const nonce = uuidv4()
  const state = uuidv4()

  await storeNonce(nonce, state)

  const authUrl = new URL(platform.auth_endpoint)
  authUrl.searchParams.set('response_type', 'id_token')
  authUrl.searchParams.set('response_mode', 'form_post')
  authUrl.searchParams.set('client_id', client_id as string || platform.client_id)
  authUrl.searchParams.set('redirect_uri', `${process.env.LTI_BASE_URL || 'http://localhost:3001'}/callback`)
  authUrl.searchParams.set('scope', 'openid')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('nonce', nonce)
  authUrl.searchParams.set('login_hint', login_hint as string)
  
  if (lti_message_hint) {
    authUrl.searchParams.set('lti_message_hint', lti_message_hint as string)
  }

  authUrl.searchParams.set('prompt', 'none')

  res.redirect(authUrl.toString())
}

export async function launchRoute(req: Request, res: Response) {
  const { id_token, state } = req.body

  if (!id_token || !state) {
    return res.status(400).json({ error: 'Missing id_token or state' })
  }

  try {
    const verified = await verifyNonce(state)
    if (!verified) {
      return res.status(400).json({ error: 'Invalid state' })
    }

    const decoded = jose.decodeJwt(id_token)
    
    const iss = decoded.iss as string
    const platform = await getPlatform(iss)
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' })
    }

    const messageType = decoded['https://purl.imsglobal.org/spec/lti/claim/message_type'] as string

    const sessionId = uuidv4()
    await storeSession(sessionId, {
      platform_id: platform.id,
      user_id: decoded.sub,
      context: decoded['https://purl.imsglobal.org/spec/lti/claim/context'] as any,
      resource_link: decoded['https://purl.imsglobal.org/spec/lti/claim/resource_link'] as any,
      roles: decoded['https://purl.imsglobal.org/spec/lti/claim/roles'] as any,
      custom: decoded['https://purl.imsglobal.org/spec/lti/claim/custom'] as any,
      ags: decoded['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'] as any,
      nrps: decoded['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'] as any,
      deep_linking: decoded['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'] as any,
    })

    res.cookie('lti_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    })

    if (messageType === 'LtiDeepLinkingRequest') {
      return res.redirect(`${FRONTEND_URL}/lti/deep-link?session=${sessionId}`)
    }

    const custom = decoded['https://purl.imsglobal.org/spec/lti/claim/custom'] as Record<string, string> | undefined
    const gameSlug = custom?.game_slug || 'quantum-pet'
    const level = custom?.level || '1'

    res.redirect(`${FRONTEND_URL}/play/${gameSlug}/${level}?lti=${sessionId}`)
  } catch (error) {
    console.error('Launch error:', error)
    res.status(500).json({ error: 'Launch failed' })
  }
}

export async function callbackRoute(req: Request, res: Response) {
  return launchRoute(req, res)
}
