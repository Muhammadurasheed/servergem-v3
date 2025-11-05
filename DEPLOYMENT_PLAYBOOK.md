# 🚀 ServerGem Deployment Playbook

## Quick Start (5 Minutes)

### 1. **Prerequisites Check**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Install Docker (if not already installed)
# macOS: brew install docker
# Linux: sudo apt-get install docker.io
```

### 2. **Enable Required APIs**
```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    logging.googleapis.com
```

### 3. **Create Artifact Registry**
```bash
gcloud artifacts repositories create servergem \
    --repository-format=docker \
    --location=us-central1 \
    --description="ServerGem deployment images"
```

### 4. **Configure Backend Environment**
```bash
cd backend

# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_pat_here
GOOGLE_CLOUD_PROJECT=your_project_id_here
GOOGLE_CLOUD_REGION=us-central1
```

### 5. **Install Dependencies & Run**
```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend (new terminal)
cd ..
npm install
npm run dev
```

### 6. **Test Deployment**
```bash
# Navigate to http://localhost:5173/deploy
# 1. Connect GitHub (use your PAT)
# 2. Select a repository
# 3. Click Deploy
```

---

## 🔑 Getting Your API Keys

### Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Get API Key"**
3. Create new key or use existing
4. Copy the key (starts with `AIza...`)
5. Add to `backend/.env`:
   ```bash
   GEMINI_API_KEY=AIzaSy...
   ```

### GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name: `ServerGem Deployment`
4. Select scopes:
   - [x] `repo` (Full control of private repositories)
   - [x] `read:user` (Read user profile data)
   - [x] `user:email` (Access user email addresses)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)
7. Add to `backend/.env`:
   ```bash
   GITHUB_TOKEN=ghp_...
   ```

**Important**: Treat your tokens like passwords! Never commit them to git.

---

## 🏗️ Deployment Architecture

```
User's Browser
      ↓
Frontend (React) ← WebSocket → Backend (FastAPI)
                                      ↓
                          OrchestratorAgent (Gemini ADK)
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
              GitHub Service    GCloud Service    Docker Service
                    ↓                 ↓                 ↓
              Clone Repo        Cloud Build       Generate Dockerfile
                                      ↓
                            Artifact Registry
                                      ↓
                                 Cloud Run
                                      ↓
                              🎉 Live Service!
```

---

## 📋 Step-by-Step Deployment Guide

### Phase 1: Repository Selection

1. **Connect GitHub**
   - Enter your Personal Access Token
   - Click "Connect"
   - You'll see "Connected to GitHub" confirmation

2. **Select Repository**
   - Browse your repositories
   - Use search to filter
   - Click on the repository you want to deploy
   - Select branch (usually `main` or `master`)
   - Click "Select & Analyze"

### Phase 2: Analysis

The AI agent will:
1. Clone your repository
2. Detect framework (Express, FastAPI, Next.js, etc.)
3. Identify dependencies
4. Detect entry point
5. Find required ports
6. Generate optimized Dockerfile
7. Create .dockerignore

**Analysis Output:**
```
🔍 Analysis Complete: my-awesome-app

Framework: FastAPI (Python 3.11)
Entry Point: main.py
Dependencies: 15 packages
Port: 8000

✅ Dockerfile Generated
• Multi-stage build for smaller images
• Optimized layer caching
• Security best practices
• Production-ready configuration
```

### Phase 3: Deployment

Click **"Deploy to Cloud Run"** to start:

**Stage 1: Validation (0-10%)**
- Verify gcloud authentication
- Check API enablement
- Validate Dockerfile
- Security scan

**Stage 2: Build (10-60%)**
- Submit to Cloud Build
- Build Docker image
- Push to Artifact Registry
- Real-time log streaming

**Stage 3: Deploy (60-95%)**
- Create Cloud Run service
- Configure resources
- Set environment variables
- Configure auto-scaling

**Stage 4: Verification (95-100%)**
- Health check
- Test first request
- Validate logs

**Success! 🎉**
```
✅ Deployment Successful!

Your application is now live at:
https://my-awesome-app-abc123-uc.a.run.app

✅ Auto HTTPS: Enabled
✅ Auto-scaling: Configured
✅ Health checks: Active
✅ Monitoring: Enabled
```

---

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. "Backend Offline"
**Problem**: Frontend can't connect to backend  
**Solution**:
```bash
# Check if backend is running
cd backend
python app.py

# Should see: "Uvicorn running on http://0.0.0.0:8000"
```

#### 2. "Not authenticated with gcloud"
**Problem**: gcloud CLI not authenticated  
**Solution**:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 3. "Cloud Build API not enabled"
**Problem**: Required APIs not enabled  
**Solution**:
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

#### 4. "Repository clone failed"
**Problem**: GitHub token doesn't have correct permissions  
**Solution**:
- Generate new token with `repo` scope
- Use token (classic), not fine-grained token
- Ensure token hasn't expired

#### 5. "Build failed: No Dockerfile"
**Problem**: Dockerfile generation failed  
**Solution**:
- Check analysis logs
- Ensure repository has detectable framework
- Manually review project structure

#### 6. "Permission denied: Cloud Run"
**Problem**: Service account lacks permissions  
**Solution**:
```bash
# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="user:YOUR_EMAIL" \
    --role="roles/run.admin"
```

#### 7. "Out of quota"
**Problem**: Exceeded Cloud Build free tier  
**Solution**:
- Check [Cloud Build quotas](https://console.cloud.google.com/apis/api/cloudbuild.googleapis.com/quotas)
- Enable billing for higher limits
- Clean up old builds

---

## 🧪 Testing Your Deployment

### 1. **Test the Deployed Service**
```bash
# Get your service URL from deployment output
DEPLOY_URL="https://your-service-xyz.a.run.app"

# Test health endpoint
curl $DEPLOY_URL/health

# Test API endpoints
curl $DEPLOY_URL/api/status
```

### 2. **Check Logs**
```bash
# View Cloud Run logs
gcloud run services logs read YOUR_SERVICE_NAME \
    --project=YOUR_PROJECT_ID \
    --region=us-central1

# Follow logs in real-time
gcloud run services logs tail YOUR_SERVICE_NAME \
    --project=YOUR_PROJECT_ID \
    --region=us-central1
```

### 3. **Monitor Performance**
```bash
# View metrics in Cloud Console
https://console.cloud.google.com/run/detail/us-central1/YOUR_SERVICE_NAME/metrics
```

---

## 💰 Cost Optimization Tips

### 1. **Use Minimal Resources for Low Traffic**
```python
# Automatically configured based on framework
- min_instances: 0  # Scale to zero when idle
- max_instances: 10  # Cap maximum scaling
- memory: 512Mi  # Right-sized for workload
```

### 2. **Optimize Docker Images**
```dockerfile
# Multi-stage builds reduce image size
FROM node:18 AS builder
# ... build steps ...

FROM node:18-slim  # Smaller runtime image
COPY --from=builder /app/dist ./dist
```

### 3. **Enable Request-Based Auto-scaling**
```bash
# Automatically handled by Cloud Run
- Scales to zero when no requests
- Scales up when traffic increases
- Only pay for actual usage
```

### 4. **Monitor Costs**
```bash
# View billing dashboard
https://console.cloud.google.com/billing

# Set up budget alerts
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="ServerGem Budget" \
    --budget-amount=10USD
```

---

## 🔒 Security Checklist

- [ ] GitHub token stored securely (not in code)
- [ ] Gemini API key stored in environment variable
- [ ] Cloud Run service uses least-privilege service account
- [ ] Secrets stored in Secret Manager (not env vars)
- [ ] Dockerfile runs as non-root user
- [ ] Base images pinned to specific versions
- [ ] Regular security scanning enabled
- [ ] Audit logging enabled
- [ ] HTTPS enforced (automatic with Cloud Run)

---

## 📊 Monitoring & Observability

### View Metrics
```bash
# In Cloud Console
https://console.cloud.google.com/run/detail/us-central1/YOUR_SERVICE

# Key metrics to watch:
- Request count
- Request latency (P50, P95, P99)
- Error rate
- Container instance count
- CPU utilization
- Memory utilization
```

### Set Up Alerts
```bash
# Create alert policy for error rate
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate" \
    --condition-threshold-value=0.05 \
    --condition-threshold-duration=300s
```

---

## 🚀 Advanced Features

### Environment Variables
```bash
# Set environment variables during deployment
env_vars = {
    'DATABASE_URL': 'postgres://...',
    'REDIS_URL': 'redis://...',
    'LOG_LEVEL': 'INFO'
}
```

### Secrets (Secret Manager)
```bash
# Create secret
gcloud secrets create api-key \
    --data-file=- <<< "sk-..."

# Use in deployment
gcloud run services update YOUR_SERVICE \
    --set-secrets=API_KEY=api-key:latest
```

### Custom Domains
```bash
# Map custom domain
gcloud run services add-iam-policy-binding YOUR_SERVICE \
    --member="allUsers" \
    --role="roles/run.invoker"

gcloud run domain-mappings create \
    --service=YOUR_SERVICE \
    --domain=api.yourdomain.com
```

---

## 🎓 Best Practices

1. **Use branches for testing**
   - Deploy from feature branches first
   - Test thoroughly before merging to main

2. **Monitor your deployments**
   - Check logs regularly
   - Set up error alerts
   - Monitor costs

3. **Keep secrets secure**
   - Never commit tokens/keys to git
   - Use Secret Manager for sensitive data
   - Rotate keys regularly

4. **Optimize for cost**
   - Scale to zero when possible
   - Right-size resources
   - Use caching effectively

5. **Document your services**
   - Add README to repositories
   - Document API endpoints
   - Include deployment notes

---

## 📞 Support & Resources

### Documentation
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud Build Docs](https://cloud.google.com/build/docs)
- [Gemini API Docs](https://ai.google.dev/docs)

### Community
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-run)
- [GitHub Issues](https://github.com/your-org/servergem/issues)

### Helpful Commands
```bash
# List all Cloud Run services
gcloud run services list

# Describe a service
gcloud run services describe SERVICE_NAME

# Delete a service
gcloud run services delete SERVICE_NAME

# View active deployments
gcloud run revisions list

# Rollback to previous revision
gcloud run services update-traffic SERVICE_NAME \
    --to-revisions=REVISION_NAME=100
```

---

**Ready to deploy? Let's build something amazing! 🚀**
