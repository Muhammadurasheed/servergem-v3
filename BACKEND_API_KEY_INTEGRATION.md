# Backend Integration for User API Keys

## Quick Implementation Guide

### 1. Update WebSocket Connection (Frontend)

```typescript
// src/lib/websocket/WebSocketClient.ts

// Add API key to connection
connect() {
  const apiKey = localStorage.getItem('servergemApiKey');
  const url = `${this.config.url}?api_key=${apiKey || ''}`;
  
  this.ws = new WebSocket(url);
  // ... rest of connection logic
}
```

### 2. Backend WebSocket Handler

```python
# backend/app.py

@app.websocket('/ws/chat')
async def chat_endpoint(websocket: WebSocket):
    """Handle WebSocket connections with user API key"""
    
    # Get API key from query params
    user_api_key = websocket.query_params.get('api_key')
    
    # If no API key, check if we have our own (fallback)
    if not user_api_key:
        user_api_key = os.getenv('GEMINI_API_KEY')  # Your default key
        
    if not user_api_key:
        await websocket.send_json({
            'type': 'error',
            'message': 'API key required. Please add your Gemini API key in Settings.',
            'code': 'API_KEY_REQUIRED'
        })
        await websocket.close(code=1008)
        return
    
    await websocket.accept()
    
    # Configure Gemini with user's key
    genai.configure(api_key=user_api_key)
    
    # Test the API key
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        # ... rest of your logic
    except Exception as e:
        if '429' in str(e):
            await websocket.send_json({
                'type': 'error',
                'message': 'API quota exceeded. Please check your Gemini API quota or try again later.',
                'code': 'QUOTA_EXCEEDED'
            })
        elif '401' in str(e) or '403' in str(e):
            await websocket.send_json({
                'type': 'error',
                'message': 'Invalid API key. Please check your Gemini API key in Settings.',
                'code': 'INVALID_API_KEY'
            })
        else:
            await websocket.send_json({
                'type': 'error',
                'message': f'Error: {str(e)}',
                'code': 'API_ERROR'
            })
        await websocket.close()
        return
```

### 3. Orchestrator Updates

```python
# backend/agents/orchestrator.py

class Orchestrator:
    def __init__(self, user_api_key: str = None):
        """Initialize with user's API key"""
        self.api_key = user_api_key or os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=self.api_key)
        
        # ... rest of initialization
```

### 4. Error Handling in Frontend

```typescript
// src/hooks/useChat.ts

useEffect(() => {
  const handleMessage = (message: ServerMessage) => {
    if (message.type === 'error') {
      switch (message.code) {
        case 'API_KEY_REQUIRED':
          toast.error(
            <div>
              <p>{message.message}</p>
              <Button onClick={() => navigate('/settings')} size="sm" className="mt-2">
                Add API Key
              </Button>
            </div>,
            { duration: 10000 }
          );
          break;
          
        case 'QUOTA_EXCEEDED':
          toast.error(
            <div>
              <p>{message.message}</p>
              <a 
                href="https://ai.google.dev/aistudio" 
                target="_blank"
                className="text-primary underline mt-2 block"
              >
                Check your quota →
              </a>
            </div>,
            { duration: 10000 }
          );
          break;
          
        case 'INVALID_API_KEY':
          toast.error(
            <div>
              <p>{message.message}</p>
              <Button onClick={() => navigate('/settings')} size="sm" className="mt-2">
                Update API Key
              </Button>
            </div>,
            { duration: 10000 }
          );
          break;
      }
    }
  };
  
  // Subscribe to messages
  const unsubscribe = webSocketClient.onMessage(handleMessage);
  return unsubscribe;
}, []);
```

### 5. Security Considerations

**✅ DO:**
- Use HTTPS/WSS in production
- Validate API keys on every request
- Implement rate limiting per user
- Log API usage for debugging
- Clear error messages for users

**❌ DON'T:**
- Store API keys in plain text on server
- Share API keys between users
- Log full API keys (last 4 chars only)
- Trust client-side validation only
- Expose internal error details

### 6. Testing Checklist

- [ ] User can add API key in Settings
- [ ] API key persists in localStorage
- [ ] WebSocket connects with API key
- [ ] Invalid API key shows clear error
- [ ] Quota exceeded shows clear error
- [ ] User can update API key
- [ ] User can remove API key
- [ ] Fallback to default key works
- [ ] Error messages have action buttons
- [ ] Page reload remembers API key

### 7. Deployment Notes

**Environment Variables:**
```bash
# Optional: Your default API key (fallback)
GEMINI_API_KEY=your_default_key_here

# For production
ENABLE_USER_API_KEYS=true
```

**Frontend Build:**
```bash
npm run build
# Ensure localStorage persists across builds
```

**Backend Deployment:**
```bash
# Ensure WebSocket query params are parsed
# Test with both user keys and default key
```

## Quick Win Checklist for Hackathon

Today (Next 2 hours):
- [x] ApiKeySettings component created
- [x] Settings page updated
- [ ] Update WebSocket connection (5 min)
- [ ] Update backend handler (15 min)
- [ ] Test with your API key (10 min)
- [ ] Test error scenarios (15 min)
- [ ] Polish error messages (10 min)
- [ ] Test end-to-end (15 min)

**Total: ~1.5 hours to ship** ✨

Now go build it and win! 🏆
