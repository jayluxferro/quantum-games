# LMS Integration Guide

## Overview

Quantum Games supports LTI 1.3 integration with Learning Management Systems like Moodle and Canvas.

## Features

- **Single Sign-On**: Students authenticate through their LMS
- **Deep Linking**: Teachers can select specific games/levels
- **Grade Passback**: Scores automatically sync to LMS gradebook
- **Context Awareness**: Games adapt to course level

## Moodle Setup

### 1. Register External Tool

1. Go to **Site Administration** → **Plugins** → **External Tool** → **Manage Tools**
2. Click **Configure a tool manually**
3. Enter the following:

| Field | Value |
|-------|-------|
| Tool name | Quantum Games |
| Tool URL | `https://your-domain.com/lti/launch` |
| LTI version | LTI 1.3 |
| Public key type | Keyset URL |
| Public keyset | `https://your-domain.com/lti/.well-known/jwks.json` |
| Initiate login URL | `https://your-domain.com/lti/login` |
| Redirection URI | `https://your-domain.com/lti/callback` |

### 2. Configure Services

Enable these services:
- ✅ IMS LTI Assignment and Grade Services
- ✅ IMS LTI Names and Role Provisioning Services
- ✅ Deep Linking (Content-Item Message)

### 3. Copy Platform Details

After saving, copy these values to register in Quantum Games:
- Platform ID (issuer)
- Client ID
- Deployment ID
- Authentication request URL
- Access token URL
- Public keyset URL

### 4. Register Platform in Quantum Games

```bash
curl -X POST https://your-domain.com/lti/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Moodle",
    "issuer": "https://your-moodle.edu",
    "client_id": "YOUR_CLIENT_ID",
    "deployment_id": "1",
    "auth_endpoint": "https://your-moodle.edu/mod/lti/auth.php",
    "token_endpoint": "https://your-moodle.edu/mod/lti/token.php",
    "jwks_endpoint": "https://your-moodle.edu/mod/lti/certs.php"
  }'
```

## Canvas Setup

### 1. Developer Keys

1. Go to **Admin** → **Developer Keys**
2. Click **+ Developer Key** → **LTI Key**
3. Configure:

| Field | Value |
|-------|-------|
| Key Name | Quantum Games |
| Redirect URIs | `https://your-domain.com/lti/callback` |
| Target Link URI | `https://your-domain.com/lti/launch` |
| OpenID Connect Initiation URL | `https://your-domain.com/lti/login` |
| JWK Method | Public JWK URL |
| Public JWK URL | `https://your-domain.com/lti/.well-known/jwks.json` |

### 2. Enable LTI Advantage Services

In the LTI Key settings, enable:
- ✅ Can create and view assignment data
- ✅ Can view submission data
- ✅ Can create and update submission results
- ✅ Can retrieve user data

### 3. Add External App

1. Go to course **Settings** → **Apps**
2. Click **+ App**
3. Select **By Client ID**
4. Enter the Developer Key Client ID

## Deep Linking

Teachers can add games to their course:

1. Click **Add Content** in the LMS
2. Select **Quantum Games**
3. Browse available games
4. Select game/level
5. Configure assignment settings (due date, attempts)
6. Save

## Grade Passback

Scores are automatically submitted when:
- Student completes a level with stars ≥ 1
- Format: 0-100 scale

## Troubleshooting

### Launch Fails

1. Check platform registration matches LMS config
2. Verify JWKS endpoint is accessible
3. Check LTI service logs: `docker compose logs lti`

### Grades Not Syncing

1. Ensure AGS services are enabled
2. Check lineitem was created during deep linking
3. Verify access token scopes

### Users Not Recognized

1. Enable NRPS service in LMS
2. Check user ID claims in JWT
