import { Request, Response } from 'express'
import * as jose from 'jose'
import { v4 as uuidv4 } from 'uuid'
import { getSession, getPlatformById } from './store.js'

const LTI_BASE_URL = process.env.LTI_BASE_URL || 'http://localhost:3001'

export async function deepLinkRoute(req: Request, res: Response) {
  const sessionId = req.cookies.lti_session || req.query.session

  if (!sessionId) {
    return res.status(401).json({ error: 'No LTI session' })
  }

  const session = await getSession(sessionId as string)
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  res.json({
    session_id: sessionId,
    deep_linking: session.deep_linking,
  })
}

interface ContentItem {
  type: 'game' | 'level'
  gameSlug: string
  levelId?: string
  title: string
  description?: string
}

export async function deepLinkContentRoute(req: Request, res: Response) {
  const sessionId = req.cookies.lti_session || req.body.session_id
  const { items } = req.body as { items: ContentItem[] }

  if (!sessionId) {
    return res.status(401).json({ error: 'No LTI session' })
  }

  const session = await getSession(sessionId as string)
  if (!session || !session.deep_linking) {
    return res.status(400).json({ error: 'Deep linking not available' })
  }

  const platform = await getPlatformById(session.platform_id)
  if (!platform) {
    return res.status(404).json({ error: 'Platform not found' })
  }

  const contentItems = items.map((item) => ({
    type: 'ltiResourceLink',
    title: item.title,
    text: item.description,
    url: `${LTI_BASE_URL}/launch`,
    custom: {
      game_slug: item.gameSlug,
      level: item.levelId || '',
    },
    lineItem: {
      scoreMaximum: 100,
      label: item.title,
      resourceId: `${item.gameSlug}-${item.levelId || 'all'}`,
    },
  }))

  const payload = {
    iss: platform.client_id,
    aud: platform.issuer,
    nonce: uuidv4(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': platform.deployment_id,
    'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': contentItems,
    'https://purl.imsglobal.org/spec/lti-dl/claim/data': session.deep_linking.data,
  }

  try {
    const privateKey = await jose.importPKCS8(platform.private_key || '', 'RS256')
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'quantum-games-key' })
      .sign(privateKey)

    res.json({
      jwt,
      return_url: session.deep_linking.deep_link_return_url,
    })
  } catch (error) {
    console.error('Deep link signing error:', error)
    res.status(500).json({ error: 'Failed to sign deep link response' })
  }
}
