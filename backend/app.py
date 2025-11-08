"""
ServerGem Backend API
FastAPI server optimized for Google Cloud Run
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json
import uuid

from agents.orchestrator import OrchestratorAgent
from services.deployment_service import deployment_service
from services.user_service import user_service
from services.usage_service import usage_service
from middleware.usage_tracker import UsageTrackingMiddleware
from models import DeploymentStatus, PlanTier

# Import progress notifier
import sys
sys.path.append(os.path.dirname(__file__))
from utils.progress_notifier import ProgressNotifier, DeploymentStages

load_dotenv()

app = FastAPI(
    title="ServerGem API",
    description="AI-powered Cloud Run deployment assistant",
    version="1.0.0"
)

# CORS configuration for Cloud Run
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Usage tracking middleware
app.add_middleware(UsageTrackingMiddleware)

# Store active WebSocket connections
active_connections: dict[str, WebSocket] = {}

# Initialize orchestrator with real services
orchestrator = OrchestratorAgent(
    gemini_api_key=os.getenv('GEMINI_API_KEY'),
    github_token=os.getenv('GITHUB_TOKEN'),
    gcloud_project=os.getenv('GOOGLE_CLOUD_PROJECT')
)


class ChatMessage(BaseModel):
    message: str
    session_id: str


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ServerGem",
        "status": "operational",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check for Cloud Run"""
    return {
        "status": "healthy",
        "service": "ServerGem Backend",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/chat")
async def chat(message: ChatMessage):
    """HTTP endpoint for chat (non-streaming)"""
    try:
        response = await orchestrator.process_message(
            message.message,
            message.session_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, api_key: Optional[str] = Query(None)):
    """WebSocket endpoint for real-time chat with user API key support"""
    
    session_id = None
    user_api_key = api_key
    
    try:
        # Get API key from query params or use default
        if not user_api_key:
            user_api_key = os.getenv('GEMINI_API_KEY')
        
        # Check if API key is available
        if not user_api_key:
            await websocket.close(code=1008, reason="API key required")
            return
        
        await websocket.accept()
        
        # Test API key validity by configuring Gemini
        try:
            import google.generativeai as genai
            genai.configure(api_key=user_api_key)
            print(f"[WebSocket] Using {'user-provided' if api_key else 'default'} API key")
        except Exception as e:
            await websocket.send_json({
                'type': 'error',
                'message': 'Invalid API key. Please check your Gemini API key in Settings.',
                'code': 'INVALID_API_KEY',
                'timestamp': datetime.now().isoformat()
            })
            await websocket.close(code=1008)
            return
        
        # Receive initial connection message with session_id
        init_message = await websocket.receive_json()
        message_type = init_message.get('type')
        
        if message_type != 'init':
            await websocket.close(code=1008, reason="Expected init message")
            return
        
        session_id = init_message.get('session_id', 'unknown')
        
        active_connections[session_id] = websocket
        
        # Create orchestrator with user's API key
        user_orchestrator = OrchestratorAgent(
            gemini_api_key=user_api_key,
            github_token=os.getenv('GITHUB_TOKEN'),
            gcloud_project=os.getenv('GOOGLE_CLOUD_PROJECT')
        )
        
        # Store env vars for this session
        session_env_vars = {}
        
        # Send connection confirmation
        await websocket.send_json({
            'type': 'connected',
            'session_id': session_id,
            'message': 'Connected to ServerGem AI - Ready to deploy!'
        })
        
        # Message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get('type')
            
            # Handle ping/pong heartbeat
            if msg_type == 'ping':
                await websocket.send_json({
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                })
                continue
            
            # Handle env vars upload
            if msg_type == 'env_vars_uploaded':
                variables = data.get('variables', [])
                count = data.get('count', len(variables))
                
                print(f"[WebSocket] Received {count} env vars from frontend")
                
                # Store in session
                for var in variables:
                    session_env_vars[var['key']] = {
                        'value': var['value'],
                        'isSecret': var.get('isSecret', False)
                    }
                
                print(f"[WebSocket] Stored env vars: {list(session_env_vars.keys())}")
                
                # Update orchestrator context with env vars
                user_orchestrator.project_context['env_vars'] = session_env_vars
                
                # Create a formatted list of env vars for AI
                env_list = '\n'.join([
                    f'• {key} {"(Secret 🔒)" if val["isSecret"] else ""}'
                    for key, val in session_env_vars.items()
                ])
                
                # Send confirmation message through AI
                confirmation_msg = f"""✅ Perfect! I've received your environment variables:

{env_list}

All secrets will be stored securely in Google Secret Manager.

Ready to deploy? Just say 'deploy' or 'yes'!"""
                
                await websocket.send_json({
                    'type': 'message',
                    'data': {
                        'content': confirmation_msg,
                        'intent': 'env_vars_confirmed',
                        'metadata': {
                            'env_vars_count': count,
                            'secrets_count': sum(1 for v in session_env_vars.values() if v['isSecret'])
                        }
                    },
                    'timestamp': datetime.now().isoformat()
                })
                
                continue
            
            # Handle chat messages
            if msg_type == 'message':
                message = data.get('message')
                
                if not message:
                    continue
                
                # Send typing indicator
                await websocket.send_json({
                    'type': 'typing',
                    'timestamp': datetime.now().isoformat()
                })
                
                # Check if this might trigger deployment (simple heuristic)
                deployment_keywords = ['deploy', 'start', 'begin', 'launch', 'go ahead', 'yes', 'proceed']
                might_deploy = any(keyword in message.lower() for keyword in deployment_keywords)
                
                # If might deploy, create progress notifier
                progress_notifier = None
                if might_deploy:
                    deployment_id = f"deploy-{uuid.uuid4().hex[:8]}"
                    # Pass session_id and active_connections so notifier can use CURRENT connection
                    progress_notifier = ProgressNotifier(session_id, deployment_id, active_connections)
                    print(f"[WebSocket] ✨ Created progress notifier: {deployment_id}")
                    
                    # Send deployment started notification
                    await websocket.send_json({
                        "type": "deployment_started",
                        "deployment_id": deployment_id,
                        "message": "🚀 Starting deployment process...",
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Process message with user's orchestrator (with progress streaming)
                try:
                    response = await user_orchestrator.process_message(
                        message,
                        session_id,
                        progress_notifier=progress_notifier
                    )
                    
                    # Send final response
                    await websocket.send_json({
                        'type': 'message',
                        'data': response,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                except Exception as e:
                    error_msg = str(e)
                    # Check for API quota errors
                    if '429' in error_msg or 'quota' in error_msg.lower():
                        await websocket.send_json({
                            'type': 'error',
                            'message': 'API quota exceeded. Please check your Gemini API quota or try again later.',
                            'code': 'QUOTA_EXCEEDED',
                            'timestamp': datetime.now().isoformat()
                        })
                    elif '401' in error_msg or '403' in error_msg or 'invalid' in error_msg.lower():
                        await websocket.send_json({
                            'type': 'error',
                            'message': 'Invalid API key. Please update your Gemini API key in Settings.',
                            'code': 'INVALID_API_KEY',
                            'timestamp': datetime.now().isoformat()
                        })
                    else:
                        await websocket.send_json({
                            'type': 'error',
                            'message': f'Error processing message: {error_msg}',
                            'code': 'API_ERROR',
                            'timestamp': datetime.now().isoformat()
                        })
    
    except WebSocketDisconnect:
        if session_id and session_id in active_connections:
            del active_connections[session_id]
            print(f"Client {session_id} disconnected")
    
    except Exception as e:
        print(f"WebSocket error for session {session_id}: {str(e)}")
        if session_id and session_id in active_connections:
            try:
                await websocket.send_json({
                    'type': 'error',
                    'message': str(e),
                    'timestamp': datetime.now().isoformat()
                })
            except:
                pass
            del active_connections[session_id]


# ============================================================================
# User Management Endpoints
# ============================================================================

@app.post("/api/users")
async def create_user(
    email: str,
    username: str,
    display_name: str,
    avatar_url: Optional[str] = None,
    github_token: Optional[str] = None
):
    """Create new user account"""
    # Check if user already exists
    existing = user_service.get_user_by_email(email)
    if existing:
        return {"user": existing.to_dict(), "existing": True}
    
    user = user_service.create_user(
        email=email,
        username=username,
        display_name=display_name,
        avatar_url=avatar_url,
        github_token=github_token
    )
    
    return {"user": user.to_dict(), "existing": False}


@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()


@app.patch("/api/users/{user_id}")
async def update_user(user_id: str, updates: dict):
    """Update user"""
    user = user_service.update_user(user_id, **updates)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()


@app.post("/api/users/{user_id}/upgrade")
async def upgrade_user(user_id: str, tier: str):
    """Upgrade user plan"""
    try:
        plan_tier = PlanTier(tier)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    user = user_service.upgrade_user_plan(user_id, plan_tier)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user.to_dict(), "message": f"Upgraded to {tier}"}


# ============================================================================
# Deployment Management Endpoints
# ============================================================================

@app.get("/api/deployments")
async def list_deployments(user_id: str = Query(...)):
    """Get all deployments for user"""
    deployments = deployment_service.get_user_deployments(user_id)
    return {
        "deployments": [d.to_dict() for d in deployments],
        "count": len(deployments)
    }


@app.get("/api/deployments/{deployment_id}")
async def get_deployment(deployment_id: str):
    """Get deployment by ID"""
    deployment = deployment_service.get_deployment(deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment.to_dict()


@app.post("/api/deployments")
async def create_deployment(
    user_id: str,
    service_name: str,
    repo_url: str,
    region: str = "us-central1",
    env_vars: dict = None
):
    """Create new deployment"""
    # Check user limits
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    active_count = len(deployment_service.get_active_deployments(user_id))
    if not user.can_deploy_more_services(active_count):
        raise HTTPException(
            status_code=403,
            detail=f"Deployment limit reached. Upgrade to deploy more services."
        )
    
    deployment = deployment_service.create_deployment(
        user_id=user_id,
        service_name=service_name,
        repo_url=repo_url,
        region=region,
        env_vars=env_vars
    )
    
    # Track deployment in usage
    usage_service.track_deployment(user_id)
    
    return deployment.to_dict()


@app.patch("/api/deployments/{deployment_id}/status")
async def update_deployment_status(
    deployment_id: str,
    status: str,
    error_message: Optional[str] = None,
    gcp_url: Optional[str] = None
):
    """Update deployment status"""
    try:
        status_enum = DeploymentStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    deployment = deployment_service.update_deployment_status(
        deployment_id,
        status_enum,
        error_message=error_message,
        gcp_url=gcp_url
    )
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    return deployment.to_dict()


@app.delete("/api/deployments/{deployment_id}")
async def delete_deployment(deployment_id: str):
    """Delete deployment"""
    success = deployment_service.delete_deployment(deployment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    return {"message": "Deployment deleted successfully"}


@app.get("/api/deployments/{deployment_id}/events")
async def get_deployment_events(deployment_id: str, limit: int = 50):
    """Get deployment event log"""
    events = deployment_service.get_deployment_events(deployment_id, limit)
    return {
        "events": [e.to_dict() for e in events],
        "count": len(events)
    }


@app.post("/api/deployments/{deployment_id}/logs")
async def add_deployment_log(deployment_id: str, log_line: str):
    """Add build log line"""
    deployment_service.add_build_log(deployment_id, log_line)
    return {"message": "Log added"}


# ============================================================================
# Usage & Analytics Endpoints
# ============================================================================

@app.get("/api/usage/{user_id}/today")
async def get_today_usage(user_id: str):
    """Get today's usage for user"""
    usage = usage_service.get_today_usage(user_id)
    user = user_service.get_user(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "usage": usage.to_dict(),
        "limits": {
            "max_services": user.max_services,
            "max_requests_per_day": user.max_requests_per_day,
            "max_memory_mb": user.max_memory_mb
        },
        "plan_tier": user.plan_tier.value
    }


@app.get("/api/usage/{user_id}/summary")
async def get_usage_summary(user_id: str, days: int = 30):
    """Get usage summary for last N days"""
    summary = usage_service.get_usage_summary(user_id, days)
    return summary


@app.get("/api/usage/{user_id}/monthly")
async def get_monthly_usage(user_id: str, year: int, month: int):
    """Get monthly usage"""
    usage_list = usage_service.get_monthly_usage(user_id, year, month)
    return {
        "usage": [u.to_dict() for u in usage_list],
        "month": f"{year}-{month:02d}"
    }


# ============================================================================
# Stats & Health
# ============================================================================

@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    return {
        "active_connections": len(active_connections),
        "total_deployments": len(deployment_service._deployments),
        "total_users": len(user_service._users)
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
