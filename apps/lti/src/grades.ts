import { Request, Response } from 'express'
import * as jose from 'jose'
import { getSession, getPlatformById } from './store.js'

export async function gradesRoute(req: Request, res: Response) {
  const { contextId } = req.params
  const sessionId = req.cookies.lti_session

  if (!sessionId) {
    return res.status(401).json({ error: 'No LTI session' })
  }

  const session = await getSession(sessionId)
  if (!session || !session.ags) {
    return res.status(400).json({ error: 'Grade service not available' })
  }

  res.json({
    context_id: contextId,
    lineitem: session.ags.lineitem,
    lineitems: session.ags.lineitems,
    scopes: session.ags.scope,
  })
}

interface GradeSubmission {
  user_id: string
  score: number
  max_score?: number
  comment?: string
  activity_progress?: string
  grading_progress?: string
}

export async function submitGradeRoute(req: Request, res: Response) {
  const { contextId } = req.params
  const sessionId = req.cookies.lti_session
  const submission = req.body as GradeSubmission

  if (!sessionId) {
    return res.status(401).json({ error: 'No LTI session' })
  }

  const session = await getSession(sessionId)
  if (!session || !session.ags) {
    return res.status(400).json({ error: 'Grade service not available' })
  }

  const platform = await getPlatformById(session.platform_id)
  if (!platform) {
    return res.status(404).json({ error: 'Platform not found' })
  }

  try {
    const accessToken = await getAccessToken(platform, session.ags.scope)

    const scorePayload = {
      userId: submission.user_id,
      scoreGiven: submission.score,
      scoreMaximum: submission.max_score || 100,
      comment: submission.comment,
      activityProgress: submission.activity_progress || 'Completed',
      gradingProgress: submission.grading_progress || 'FullyGraded',
      timestamp: new Date().toISOString(),
    }

    const lineitemUrl = session.ags.lineitem
    const scoresUrl = `${lineitemUrl}/scores`

    const response = await fetch(scoresUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(scorePayload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Grade submission error:', error)
      return res.status(response.status).json({ error: 'Failed to submit grade' })
    }

    res.json({ success: true, score: submission.score })
  } catch (error) {
    console.error('Grade submission error:', error)
    res.status(500).json({ error: 'Failed to submit grade' })
  }
}

interface Platform {
  id: string
  client_id: string
  token_endpoint: string
  private_key?: string
}

async function getAccessToken(platform: Platform, scopes: string[]): Promise<string> {
  if (!platform.private_key) {
    throw new Error('Platform private key not configured')
  }

  const privateKey = await jose.importPKCS8(platform.private_key, 'RS256')

  const clientAssertion = await new jose.SignJWT({
    iss: platform.client_id,
    sub: platform.client_id,
    aud: platform.token_endpoint,
    jti: Math.random().toString(36).substring(7),
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'quantum-games-key' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey)

  const tokenResponse = await fetch(platform.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
      scope: scopes.join(' '),
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error('Failed to get access token')
  }

  const tokenData = await tokenResponse.json() as { access_token: string }
  return tokenData.access_token
}
