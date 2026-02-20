# Quantum Games Platform - Setup Guide

## Prerequisites

- **Node.js** 20.x or later
- **pnpm** 9.x or later (`npm install -g pnpm`)
- **Docker** and **Docker Compose** v2
- **Python** 3.11+ (for API development)

## Quick Start (Development)

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd quantum-games
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` as needed. The defaults work for local development.

### 3. Start Infrastructure Services

```bash
docker compose up -d postgres redis keycloak minio
```

Wait for services to be healthy:

```bash
docker compose ps
```

### 4. Start Development Servers

In separate terminals:

```bash
# Terminal 1: API Server
cd apps/api
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd apps/web
pnpm dev

# Terminal 3: Multiplayer Server
cd apps/multiplayer
pnpm dev

# Terminal 4: LTI Service (optional)
cd apps/lti
pnpm dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Keycloak Admin**: http://localhost:8080 (admin/admin)
- **MinIO Console**: http://localhost:9001 (minio/minio123)

## Full Docker Development

To run everything in Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Default Users

The Keycloak realm is pre-configured with test users:

| Username | Password | Role |
|----------|----------|------|
| demo-student | student123! | student |
| demo-teacher | teacher123! | teacher |
| demo-admin | admin123! | admin |

## Database

The PostgreSQL database is automatically initialized with:

- Schema and tables
- Default games and levels
- Default achievements

To run migrations manually:

```bash
cd apps/api
alembic upgrade head
```

## Troubleshooting

### Port Conflicts

If ports are in use, modify `.env`:

```
API_PORT=8001
VITE_PORT=5174
```

### Keycloak Not Starting

Ensure PostgreSQL is healthy first:

```bash
docker compose logs postgres
```

### Database Connection Issues

Check the connection string in `.env` matches your setup.

## Production Deployment

See `docs/deployment.md` for production setup with Traefik and SSL.
