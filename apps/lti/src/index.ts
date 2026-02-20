import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

import { loginRoute, launchRoute, callbackRoute } from './launch.js'
import { deepLinkRoute, deepLinkContentRoute } from './deep-link.js'
import { gradesRoute, submitGradeRoute } from './grades.js'
import { platformsRouter } from './platforms.js'
import { initializeKeys, getJWKS } from './keys.js'

const app = express()
const port = parseInt(process.env.LTI_PORT || '3001', 10)

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'healthy', service: 'lti' })
})

// LTI 1.3 Launch Flow
app.get('/login', loginRoute)
app.post('/login', loginRoute)
app.post('/launch', launchRoute)
app.post('/callback', callbackRoute)

// Deep Linking
app.get('/deep-link', deepLinkRoute)
app.post('/deep-link/content', deepLinkContentRoute)

// Assignment and Grade Services (AGS)
app.get('/grades/:contextId', gradesRoute)
app.post('/grades/:contextId/submit', submitGradeRoute)

// Platform management
app.use('/platforms', platformsRouter)

// JWKS endpoint for LMS verification
app.get('/.well-known/jwks.json', async (_, res) => {
  try {
    const jwks = await getJWKS()
    res.json(jwks)
  } catch (error) {
    console.error('JWKS error:', error)
    res.status(500).json({ error: 'Failed to generate JWKS' })
  }
})

// LTI configuration endpoint (for auto-registration)
app.get('/lti-config.json', (_, res) => {
  const baseUrl = process.env.LTI_BASE_URL || `http://localhost:${port}`
  
  res.json({
    title: 'Quantum Games',
    description: 'Interactive quantum computing educational games',
    oidc_initiation_url: `${baseUrl}/login`,
    target_link_uri: `${baseUrl}/launch`,
    public_jwk_url: `${baseUrl}/.well-known/jwks.json`,
    scopes: [
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
      'https://purl.imsglobal.org/spec/lti-ags/scope/score',
      'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
    ],
    extensions: [
      {
        platform: 'canvas.instructure.com',
        privacy_level: 'public',
        settings: {
          placements: [
            {
              placement: 'link_selection',
              message_type: 'LtiDeepLinkingRequest',
              target_link_uri: `${baseUrl}/deep-link`,
            },
            {
              placement: 'assignment_selection',
              message_type: 'LtiDeepLinkingRequest',
              target_link_uri: `${baseUrl}/deep-link`,
            },
          ],
        },
      },
    ],
    custom_fields: {
      course_level: '$Context.id',
    },
  })
})

// Initialize keys and start server
async function start() {
  try {
    await initializeKeys()
    
    app.listen(port, () => {
      console.log(`🔗 LTI Service listening on port ${port}`)
      console.log(`   JWKS: http://localhost:${port}/.well-known/jwks.json`)
      console.log(`   Config: http://localhost:${port}/lti-config.json`)
    })
  } catch (error) {
    console.error('Failed to start LTI service:', error)
    process.exit(1)
  }
}

start()
