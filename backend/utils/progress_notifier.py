"""
Progress Notifier - Real-time deployment progress updates via WebSocket
Sends structured updates to frontend during deployment
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime


class ProgressNotifier:
    """Sends real-time progress updates to frontend via WebSocket"""
    
    def __init__(self, websocket, deployment_id: str):
        self.websocket = websocket
        self.deployment_id = deployment_id
        self.current_stage = None
        self.stage_start_time = None
    
    async def send_update(
        self,
        stage: str,
        status: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        progress: Optional[int] = None
    ):
        """Send progress update to frontend with connection safety"""
        
        payload = {
            "type": "deployment_progress",
            "deployment_id": self.deployment_id,
            "stage": stage,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        
        if details:
            payload["details"] = details
        
        if progress is not None:
            payload["progress"] = progress
        
        # Send to frontend with safety checks
        try:
            if hasattr(self.websocket, 'client_state'):
                # Check WebSocket state before sending
                from fastapi.websockets import WebSocketState
                if self.websocket.client_state == WebSocketState.CONNECTED:
                    await self.websocket.send_json(payload)
                    print(f"[ProgressNotifier] ✅ {stage} - {status}")
                else:
                    print(f"[ProgressNotifier] ⚠️ Skipped (disconnected): {stage}")
            else:
                # Fallback: try to send anyway
                await self.websocket.send_json(payload)
                print(f"[ProgressNotifier] ✅ {stage} - {status}")
        except RuntimeError as e:
            if "close message has been sent" in str(e) or "WebSocket is closed" in str(e):
                print(f"[ProgressNotifier] ⚠️ WebSocket closed, skipping: {stage}")
            else:
                print(f"[ProgressNotifier] ❌ RuntimeError: {e}")
        except Exception as e:
            print(f"[ProgressNotifier] ❌ Error: {e}")
    
    async def start_stage(self, stage: str, message: str):
        """Mark stage as started"""
        self.current_stage = stage
        self.stage_start_time = datetime.now()
        await self.send_update(stage, "in-progress", message)
    
    async def complete_stage(self, stage: str, message: str, details: Optional[Dict] = None):
        """Mark stage as completed"""
        duration = None
        if self.stage_start_time:
            duration = (datetime.now() - self.stage_start_time).total_seconds()
        
        if details is None:
            details = {}
        
        if duration:
            details["duration"] = f"{duration:.1f}s"
        
        await self.send_update(stage, "success", message, details=details)
        self.stage_start_time = None
    
    async def fail_stage(self, stage: str, error_message: str, details: Optional[Dict] = None):
        """Mark stage as failed"""
        await self.send_update(stage, "error", error_message, details=details)
        self.stage_start_time = None
    
    async def update_progress(self, stage: str, message: str, progress: int):
        """Send progress update within a stage"""
        await self.send_update(stage, "in-progress", message, progress=progress)


# Stage name constants
class DeploymentStages:
    """Standard deployment stage identifiers"""
    REPO_CLONE = "repo_clone"
    CODE_ANALYSIS = "code_analysis"
    DOCKERFILE_GEN = "dockerfile_generation"
    SECURITY_SCAN = "security_scan"
    CONTAINER_BUILD = "container_build"
    CLOUD_DEPLOYMENT = "cloud_deployment"
