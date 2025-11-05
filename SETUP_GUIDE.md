# ServerGem Setup Guide
**Complete Manual Setup for Phase 2**

## 🎯 Overview

ServerGem is now equipped with:
- ✅ Real GitHub integration (clone repos, list repositories)
- ✅ Real Cloud Run deployment (Cloud Build + deployment)
- ✅ Real code analysis with Gemini ADK
- ✅ Real Dockerfile generation
- ✅ Real-time progress streaming via WebSocket

---

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **GitHub Account** with repositories
3. **Gemini API Key** from Google AI Studio
4. **Local Environment**: Python 3.9+ (for backend)

---

## 🔑 Step 1: Get Gemini API Key

### Instructions:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key (starts with `AIza...`)

### Add to Backend:
```bash
cd backend
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env
```

---

## 🐙 Step 2: Get GitHub Personal Access Token

### Why Needed?
- Clone private repositories
- List your repositories
- Access GitHub API without rate limits

### Instructions:

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token (Classic)**
   - Click **"Generate new token (classic)"**
   - Give it a name: `ServerGem Deployment`
   - Set expiration: **90 days** (or longer)

3. **Select Scopes** (Important!):
   - ✅ **repo** (Full control of private repositories)
     - Includes: repo:status, repo_deployment, public_repo, repo:invite, security_events
   - ✅ **read:user** (Read user profile data)
   - ✅ **read:org** (Read org data - optional, if deploying org repos)

4. **Generate Token**
   - Click **"Generate token"** at bottom
   - **⚠️ COPY THE TOKEN NOW** - You won't see it again!
   - Token starts with `ghp_...`

### Add to Backend:
```bash
cd backend
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
```

### Testing Your Token:
```bash
# Test token validity
curl -H "Authorization: Bearer ghp_your_token" https://api.github.com/user
```

Should return your GitHub user info.

---

## ☁️ Step 3: Setup Google Cloud Project

### 3.1 Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click project dropdown at top
3. Click **"New Project"**
   - Name: `servergem-deployment` (or your choice)
   - Click **"Create"**
4. Wait for project creation (~30 seconds)
5. Copy your **Project ID** (not name!)

### 3.2 Enable Billing

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Link billing account to your project
3. ⚠️ **Required**: Cloud Run needs billing enabled

### 3.3 Enable Required APIs

Run these commands (or enable via Console):

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable logging.googleapis.com
```

**Or via Console:**
1. Go to [APIs & Services](https://console.cloud.google.com/apis/dashboard)
2. Click **"+ ENABLE APIS AND SERVICES"**
3. Search and enable:
   - Cloud Build API
   - Cloud Run API
   - Artifact Registry API
   - Secret Manager API

### 3.4 Install gcloud CLI

#### macOS:
```bash
brew install google-cloud-sdk
```

#### Linux:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### Windows:
Download from: https://cloud.google.com/sdk/docs/install

### 3.5 Authenticate gcloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Set default region
gcloud config set run/region us-central1

# Authenticate for application default credentials
gcloud auth application-default login
```

### 3.6 Create Artifact Registry Repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create servergem \
    --repository-format=docker \
    --location=us-central1 \
    --description="ServerGem deployment images"
```

### Add to Backend:
```bash
cd backend
echo "GOOGLE_CLOUD_PROJECT=your-project-id" >> .env
echo "GOOGLE_CLOUD_REGION=us-central1" >> .env
```

---

## 🚀 Step 4: Start Backend

### 4.1 Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4.2 Verify .env File

Your `backend/.env` should look like:
```bash
# Gemini API
GEMINI_API_KEY=AIza...

# GitHub
GITHUB_TOKEN=ghp_...

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1

# CORS (for local frontend)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4.3 Run Backend

```bash
cd backend
python app.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4.4 Test Backend

Open another terminal:
```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","service":"ServerGem Backend","timestamp":"..."}
```

---

## 🎨 Step 5: Configure Frontend

### 5.1 Update WebSocket URL

The frontend should already be configured to connect to `ws://localhost:8000/ws/chat` in development.

Check `src/lib/websocket/config.ts`:
```typescript
export const WS_CONFIG = {
  url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/chat',
  // ...
};
```

### 5.2 Start Frontend

```bash
# In project root
npm install
npm run dev
```

Frontend will run at `http://localhost:5173`

---

## ✅ Step 6: Test Complete Flow

### 6.1 Test GitHub Integration

In the chat interface, type:
```
List my GitHub repositories
```

**Expected:**
- ✅ Shows list of your repos with languages, stars, descriptions
- ⚠️ If error: Check GITHUB_TOKEN in .env

### 6.2 Test Repository Analysis

```
Analyze my repo: https://github.com/YOUR_USERNAME/YOUR_REPO
```

**Expected:**
- ✅ Clones repository to `/tmp/servergem_repos/`
- ✅ Detects framework (Flask, Express, Django, etc.)
- ✅ Analyzes dependencies
- ✅ Generates Dockerfile
- ✅ Shows "Deploy to Cloud Run" button
- ⚠️ If error: Check repo is public or token has access

### 6.3 Test Cloud Run Deployment

Click **"🚀 Deploy to Cloud Run"** button (or type deploy command)

**Expected:**
- ✅ Progress bar: Building image (0-80%)
- ✅ Progress bar: Deploying service (80-100%)
- ✅ Live URL displayed (https://your-service-xyz.run.app)
- ✅ Service accessible in browser
- ⚠️ If error: Check gcloud auth, APIs enabled, billing enabled

### 6.4 Test Logs Retrieval

```
Show logs for my-service-name
```

**Expected:**
- ✅ Displays recent Cloud Run logs
- ✅ Shows requests, errors, startup logs

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: "No module named 'backend'"**
```bash
# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python backend/app.py
```

**Error: "GEMINI_API_KEY not found"**
```bash
# Check .env file exists
cat backend/.env

# Verify key is set
python -c "import os; from dotenv import load_dotenv; load_dotenv('backend/.env'); print(os.getenv('GEMINI_API_KEY'))"
```

### GitHub Errors

**"Invalid token" or "Not authenticated"**
- Regenerate token with correct scopes: `repo`, `read:user`
- Verify token in .env: `echo $GITHUB_TOKEN`
- Test token: `curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user`

**"Failed to clone repository"**
- Check repo URL is correct
- Verify token has access to private repos (if applicable)
- Try with `branch='master'` instead of `branch='main'`

### Google Cloud Errors

**"Not authenticated with gcloud"**
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

**"Cloud Build failed"**
- Enable Cloud Build API: `gcloud services enable cloudbuild.googleapis.com`
- Check billing is enabled
- Verify Dockerfile syntax: `docker build -t test .`

**"Deployment failed"**
- Enable Cloud Run API: `gcloud services enable run.googleapis.com`
- Check service name (lowercase, hyphens only)
- Verify port 8080 in Dockerfile: `EXPOSE 8080`

**"Permission denied"**
```bash
# Grant Cloud Build permission to deploy to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
    --role=roles/run.admin

gcloud iam service-accounts add-iam-policy-binding \
    ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
    --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
    --role=roles/iam.serviceAccountUser
```

### WebSocket Errors

**"WebSocket connection failed"**
- Check backend is running: `curl http://localhost:8000/health`
- Verify CORS settings in `backend/app.py`
- Check browser console for errors

**"No typing indicator" or "No progress updates"**
- Check `progress_callback` is being called
- Verify WebSocket message format matches frontend expectations
- Check browser Network tab for WebSocket messages

---

## 📊 System Architecture

```
┌─────────────┐         WebSocket          ┌─────────────────┐
│   Frontend  │◄──────────────────────────►│  FastAPI Backend │
│  (React)    │  Real-time Progress Updates│   (Python)       │
└─────────────┘                             └─────────┬───────┘
                                                      │
                                         ┌────────────▼────────────┐
                                         │  Orchestrator Agent     │
                                         │  (Gemini ADK)           │
                                         └────────────┬────────────┘
                                                      │
                      ┌───────────────────────────────┼───────────────────────────┐
                      │                               │                           │
             ┌────────▼────────┐           ┌─────────▼─────────┐      ┌──────────▼─────────┐
             │ GitHub Service  │           │  GCloud Service   │      │  Docker Service    │
             │ - Clone repos   │           │  - Cloud Build    │      │  - Generate        │
             │ - List repos    │           │  - Cloud Run      │      │  - Validate        │
             │ - Validate      │           │  - Logs           │      │  - Optimize        │
             └─────────────────┘           └───────────────────┘      └────────────────────┘
```

---

## 🎓 Key Concepts

### Gemini Function Calling
- Gemini ADK automatically decides which function to call
- No manual intent classification needed
- Functions are called based on user message context

### Real-Time Progress
- WebSocket streams progress updates during deployment
- Build progress (0-80%): Cloud Build container image
- Deploy progress (80-100%): Cloud Run service deployment

### Context Management
- Orchestrator remembers project state across messages
- Stores: project_path, framework, deployed_service, etc.
- Enables follow-up questions without re-specifying details

---

## 🎯 Next Steps

### Phase 3: Frontend Enhancement
- [ ] GitHub repository selector UI
- [ ] Deployment dashboard with service list
- [ ] Environment variables editor
- [ ] Real-time logs viewer

### Phase 4: Advanced Features
- [ ] CI/CD pipeline setup (Cloud Build triggers)
- [ ] Custom domain configuration
- [ ] Secret Manager integration UI
- [ ] Cost optimization recommendations
- [ ] Multi-service deployment

---

## 📚 Resources

- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud Build Docs](https://cloud.google.com/build/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [FastAPI WebSocket Docs](https://fastapi.tiangolo.com/advanced/websockets/)

---

## 💡 Tips

1. **Use gcloud CLI for debugging:**
   ```bash
   # Check current config
   gcloud config list
   
   # View service logs
   gcloud run services logs read my-service --limit 50
   
   # Describe service
   gcloud run services describe my-service
   ```

2. **Monitor Cloud Build:**
   - Console: https://console.cloud.google.com/cloud-build/builds
   - CLI: `gcloud builds list --limit 10`

3. **Test Dockerfile locally before deploying:**
   ```bash
   docker build -t test-image .
   docker run -p 8080:8080 test-image
   ```

4. **Keep tokens secure:**
   - Never commit .env to git
   - Use Secret Manager for production
   - Rotate tokens regularly

---

**Phase 2 Status:** ✅ **FULLY OPERATIONAL**

All real services integrated, no mocks, production-ready! 🚀
