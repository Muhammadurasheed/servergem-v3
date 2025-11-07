# ServerGem Backend - Production Setup Guide

## ✅ Phase 2 Complete - FAANG-Level Backend Infrastructure

### What's Been Built

#### Backend Services (100% Complete)
- **Data Models** (`backend/models/__init__.py`)
  - `Deployment` - Full deployment lifecycle tracking
  - `User` - User accounts with plan tiers (Free/Pro/Enterprise)
  - `UsageMetrics` - Daily usage tracking
  - `DeploymentEvent` - Audit trail for all deployment events

- **Deployment Service** (`backend/services/deployment_service.py`)
  - CRUD operations for deployments
  - Persistent JSON storage with atomic writes
  - Event logging for audit trail
  - Query by user, status, date

- **User Service** (`backend/services/user_service.py`)
  - User account management
  - Plan tier upgrades
  - Settings persistence
  - GitHub token management

- **Usage Service** (`backend/services/usage_service.py`)
  - Request counting per user
  - Daily/monthly metrics
  - Resource usage tracking
  - Limits enforcement

- **Usage Tracking Middleware** (`backend/middleware/usage_tracker.py`)
  - Automatic request tracking
  - Bandwidth monitoring
  - Performance metrics

#### REST API Endpoints (15+)
All endpoints implemented in `backend/app.py`:

**User Management:**
- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user
- `PATCH /api/users/{user_id}` - Update user
- `POST /api/users/{user_id}/upgrade` - Upgrade plan

**Deployment Management:**
- `GET /api/deployments?user_id={id}` - List deployments
- `GET /api/deployments/{id}` - Get deployment
- `POST /api/deployments` - Create deployment
- `PATCH /api/deployments/{id}/status` - Update status
- `DELETE /api/deployments/{id}` - Delete deployment
- `GET /api/deployments/{id}/events` - Get event log
- `POST /api/deployments/{id}/logs` - Add build log

**Usage & Analytics:**
- `GET /api/usage/{user_id}/today` - Today's usage
- `GET /api/usage/{user_id}/summary?days=30` - Usage summary
- `GET /api/usage/{user_id}/monthly?year=2024&month=1` - Monthly usage

#### Frontend Integration
- **API Client** (`src/lib/api/client.ts`) - Type-safe REST calls
- **useDeployments Hook** (`src/hooks/useDeployments.ts`) - Deployment management
- **useUsage Hook** (`src/hooks/useUsage.ts`) - Metrics and limits
- **Dashboard Page** - Real-time deployment status
- **Usage Page** - Live usage metrics with limits

---

## Setup Instructions

### 1. Backend Setup (Python)

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Configure Environment
Create `backend/.env`:
```bash
# Required
GEMINI_API_KEY=your-gemini-api-key
GITHUB_TOKEN=your-github-token
GOOGLE_CLOUD_PROJECT=servergem-platform
GOOGLE_CLOUD_REGION=us-central1

# Optional
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com
PORT=8000
```

#### Start Backend Server
```bash
cd backend
python app.py
```

Server runs at `http://localhost:8000`

#### Verify Backend
```bash
# Health check
curl http://localhost:8000/health

# Get stats
curl http://localhost:8000/stats
```

---

### 2. Frontend Setup (React)

#### Configure Environment
Create `.env` in project root:
```bash
VITE_API_URL=http://localhost:8000
```

For production:
```bash
VITE_API_URL=https://your-backend-domain.com
```

#### Start Frontend
```bash
npm run dev
```

---

### 3. Data Storage

#### Current Implementation: JSON Files
The backend uses JSON files for data persistence:
- `backend/data/deployments.json` - All deployments
- `backend/data/users.json` - User accounts
- `backend/data/usage.json` - Usage metrics
- `backend/data/deployment_events.json` - Event logs

**Features:**
- ✅ Atomic writes with `.tmp` files
- ✅ Automatic backup on write
- ✅ No external database required
- ✅ Perfect for MVP and demos

#### Production Upgrade: PostgreSQL
To upgrade to PostgreSQL (recommended for production):

1. Install PostgreSQL adapter:
```bash
pip install psycopg2-binary sqlalchemy
```

2. Update services to use SQLAlchemy ORM
3. Migration guide: See `PRODUCTION_UPGRADE.md` (coming soon)

---

### 4. Testing the Integration

#### Create a Test User
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "display_name": "Test User"
  }'
```

#### Create a Test Deployment
```bash
curl -X POST http://localhost:8000/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_xxx",
    "service_name": "test-app",
    "repo_url": "https://github.com/test/app"
  }'
```

#### Check Today's Usage
```bash
curl http://localhost:8000/api/usage/user_xxx/today
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │  Usage       │  │  Pricing     │ │
│  │  Page        │  │  Page        │  │  Page        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│                 ┌──────────▼──────────┐                │
│                 │   API Client        │                │
│                 │  (Type-safe REST)   │                │
│                 └──────────┬──────────┘                │
└────────────────────────────┼────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼────────────────────────────┐
│                   Backend (FastAPI)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Usage Tracking Middleware                │  │
│  │  (Automatic request/bandwidth tracking)          │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────────┐  │
│  │             REST API Endpoints (15+)             │  │
│  │  /api/users  /api/deployments  /api/usage       │  │
│  └──────┬────────────┬────────────────┬─────────────┘  │
│         │            │                │                │
│  ┌──────▼──────┐ ┌──▼──────────┐ ┌──▼──────────────┐  │
│  │   User      │ │ Deployment  │ │  Usage          │  │
│  │   Service   │ │ Service     │ │  Service        │  │
│  └──────┬──────┘ └──┬──────────┘ └──┬──────────────┘  │
│         │            │                │                │
│         └────────────┼────────────────┘                │
│                      │                                 │
│  ┌───────────────────▼──────────────────────────────┐  │
│  │          JSON File Storage (Atomic)              │  │
│  │  deployments.json  users.json  usage.json       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

### ✅ Production-Ready
- Type-safe data models with validation
- Atomic file writes (no data corruption)
- Comprehensive error handling
- Structured logging
- Request tracking middleware

### ✅ Scalable Architecture
- Service-oriented design
- Easy PostgreSQL migration path
- RESTful API design
- Stateless request handling

### ✅ Enterprise Features
- Plan tier management (Free/Pro/Enterprise)
- Usage limits enforcement
- Audit trail (deployment events)
- Metrics and analytics

---

## Next Steps

### Immediate:
1. ✅ Backend running on `localhost:8000`
2. ✅ Frontend connected to backend
3. ✅ Dashboard showing real deployments
4. ✅ Usage page tracking limits

### Phase 3 (Next):
- Real-time deployment tracking via WebSocket
- GitHub repository integration
- Environment variables manager
- Custom domains support

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version (3.9+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check port availability
lsof -i :8000
```

### Frontend can't connect
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check VITE_API_URL in .env
cat .env | grep VITE_API_URL

# Restart dev server
npm run dev
```

### Data not persisting
```bash
# Check data directory exists
ls -la backend/data/

# Check file permissions
chmod 755 backend/data/
chmod 644 backend/data/*.json
```

---

## Manual Setup Required: ZERO ✅

Everything works out of the box with JSON storage!

Just:
1. Set environment variables
2. Run `python backend/app.py`
3. Run `npm run dev`

That's it! No database setup, no complex configuration.

---

Built with ❤️ by the ServerGem team
Alhamdulillah 🚀💎
