"""
Progress Notifier - Real-time deployment progress updates via WebSocket
Sends structured updates to frontend during deployment
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime


class ProgressNotifier:
    """Sends real-time progress updates to frontend via WebSocket"""
    
    def __init__(self, session_id: str, deployment_id: str, active_connections: dict):
        self.session_id = session_id
        self.deployment_id = deployment_id
        self.active_connections = active_connections
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
        """Send progress update to frontend with connection safety - uses CURRENT active connection"""
        
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
        
        # Retry logic: try twice to handle reconnections gracefully
        max_retries = 2
        for attempt in range(max_retries):
            # Get CURRENT active WebSocket for this session (handles reconnections!)
            current_ws = self.active_connections.get(self.session_id)
            
            if not current_ws:
                print(f"[ProgressNotifier] ⚠️ No active connection for session {self.session_id}")
                return
            
            # Send to frontend with safety checks
            try:
                if hasattr(current_ws, 'client_state'):
                    # Check WebSocket state before sending
                    from fastapi.websockets import WebSocketState
                    if current_ws.client_state == WebSocketState.CONNECTED:
                        await current_ws.send_json(payload)
                        print(f"[ProgressNotifier] ✅ {stage} - {status}")
                        return  # Success!
                    else:
                        print(f"[ProgressNotifier] ⚠️ Connection not ready: {stage}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(0.5)  # Wait for reconnection
                            continue
                else:
                    # Fallback: try to send anyway
                    await current_ws.send_json(payload)
                    print(f"[ProgressNotifier] ✅ {stage} - {status}")
                    return  # Success!
            except RuntimeError as e:
                if "close message has been sent" in str(e) or "WebSocket is closed" in str(e):
                    print(f"[ProgressNotifier] ⚠️ Connection closed during send (attempt {attempt + 1}/{max_retries})")
                    # Don't delete from active_connections - reconnection handler will update it
                    if attempt < max_retries - 1:
                        await asyncio.sleep(0.5)  # Wait for reconnection to complete
                        continue
                    else:
                        print(f"[ProgressNotifier] ⚠️ Skipping update after {max_retries} attempts - client may reconnect later")
                else:
                    print(f"[ProgressNotifier] ❌ RuntimeError: {e}")
                    return
            except Exception as e:
                print(f"[ProgressNotifier] ❌ Error: {e}")
                return
    
    async def start_stage(self, stage: str, message: str):
        """Mark stage as started - never throws exceptions"""
        try:
            self.current_stage = stage
            self.stage_start_time = datetime.now()
            await self.send_update(stage, "in-progress", message)
        except Exception as e:
            print(f"[ProgressNotifier] ❌ start_stage failed: {e}")
    
    async def complete_stage(self, stage: str, message: str, details: Optional[Dict] = None):
        """Mark stage as completed - never throws exceptions"""
        try:
            duration = None
            if self.stage_start_time:
                duration = (datetime.now() - self.stage_start_time).total_seconds()
            
            if details is None:
                details = {}
            
            if duration:
                details["duration"] = f"{duration:.1f}s"
            
            await self.send_update(stage, "success", message, details=details)
            self.stage_start_time = None
        except Exception as e:
            print(f"[ProgressNotifier] ❌ complete_stage failed: {e}")
    
    async def fail_stage(self, stage: str, error_message: str, details: Optional[Dict] = None):
        """Mark stage as failed - never throws exceptions"""
        try:
            await self.send_update(stage, "error", error_message, details=details)
            self.stage_start_time = None
        except Exception as e:
            print(f"[ProgressNotifier] ❌ fail_stage failed: {e}")
    
    async def update_progress(self, stage: str, message: str, progress: int):
        """Send progress update within a stage - never throws exceptions"""
        try:
            await self.send_update(stage, "in-progress", message, progress=progress)
        except Exception as e:
            print(f"[ProgressNotifier] ❌ update_progress failed: {e}")


# Stage name constants
class DeploymentStages:
    """Standard deployment stage identifiers"""
    REPO_CLONE = "repo_clone"
    CODE_ANALYSIS = "code_analysis"
    DOCKERFILE_GEN = "dockerfile_generation"
    SECURITY_SCAN = "security_scan"
    CONTAINER_BUILD = "container_build"
    CLOUD_DEPLOYMENT = "cloud_deployment"
