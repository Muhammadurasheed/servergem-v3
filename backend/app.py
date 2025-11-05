"""
ServerGem Backend API
FastAPI server optimized for Google Cloud Run
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json

from agents.orchestrator import OrchestratorAgent

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
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat with heartbeat support"""
    
    session_id = None
    
    try:
        await websocket.accept()
        
        # Receive initial connection message with session_id
        init_message = await websocket.receive_json()
        message_type = init_message.get('type')
        
        if message_type != 'init':
            await websocket.close(code=1008, reason="Expected init message")
            return
        
        session_id = init_message.get('session_id', 'unknown')
        
        active_connections[session_id] = websocket
        
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
                
                # Progress callback for real-time updates
                async def progress_callback(update):
                    """Stream progress updates via WebSocket"""
                    await websocket.send_json(update)
                
                # Process message with orchestrator (with progress streaming)
                response = await orchestrator.process_message(
                    message,
                    session_id,
                    progress_callback=progress_callback
                )
                
                # Send final response
                await websocket.send_json({
                    'type': 'message',
                    'data': response,
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


@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    return {
        "active_connections": len(active_connections),
        "uptime": "TODO",
        "requests_processed": "TODO"
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
