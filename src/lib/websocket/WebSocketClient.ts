/**
 * WebSocket Client Implementation
 * Production-grade WebSocket manager with:
 * - Exponential backoff reconnection
 * - Heartbeat/ping-pong
 * - Message queueing
 * - Type safety
 * - Event-driven architecture
 */

import { 
  ClientMessage, 
  ServerMessage, 
  ConnectionState,
  ConnectionStatus,
  WebSocketConfig,
} from '@/types/websocket';
import { WS_CONFIG, getSessionId } from './config';

type EventHandler<T = any> = (data: T) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private config: WebSocketConfig;
  
  // Connection state
  private connectionStatus: ConnectionStatus = {
    state: 'idle',
  };
  
  // Reconnection management
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionalClose = false;
  
  // Heartbeat management
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  
  // Message queue for offline scenarios
  private messageQueue: ClientMessage[] = [];
  
  // Event handlers
  private eventHandlers: {
    message: Set<EventHandler<ServerMessage>>;
    error: Set<EventHandler<Error>>;
    connectionChange: Set<EventHandler<ConnectionStatus>>;
  } = {
    message: new Set(),
    error: new Set(),
    connectionChange: new Set(),
  };
  
  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...WS_CONFIG, ...config };
    this.sessionId = getSessionId();
  }
  
  // ========================================================================
  // Public API
  // ========================================================================
  
  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }
    
    this.isIntentionalClose = false;
    this.updateConnectionStatus('connecting');
    
    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('servergemApiKey') || '';
      const url = apiKey ? `${this.config.url}?api_key=${encodeURIComponent(apiKey)}` : this.config.url;
      
      console.log('[WebSocket] Connecting with API key:', apiKey ? 'Yes' : 'No');
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
      
      // Connection timeout
      const timeout = setTimeout(() => {
        if (this.connectionStatus.state === 'connecting') {
          console.error('[WebSocket] Connection timeout');
          this.ws?.close();
          this.handleReconnect();
        }
      }, 10000);
      
      this.ws.addEventListener('open', () => clearTimeout(timeout), { once: true });
      
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.updateConnectionStatus('error', (error as Error).message);
      this.emitError(error as Error);
      this.handleReconnect();
    }
  }
  
  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log('[WebSocket] Intentional disconnect');
    this.isIntentionalClose = true;
    this.cleanup();
    this.updateConnectionStatus('disconnected');
  }
  
  /**
   * Send message to server
   * Returns true if sent, false if queued
   */
  public sendMessage(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Not connected, queueing message');
      
      if (this.config.messageQueue.enabled) {
        this.queueMessage(message);
        return false;
      }
      
      throw new Error('WebSocket not connected and message queue disabled');
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      console.log('[WebSocket] Sent message:', message.type);
      return true;
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
      this.emitError(error as Error);
      return false;
    }
  }
  
  /**
   * Register message handler
   * Returns unsubscribe function
   */
  public onMessage(handler: EventHandler<ServerMessage>): () => void {
    this.eventHandlers.message.add(handler);
    return () => this.eventHandlers.message.delete(handler);
  }
  
  /**
   * Register error handler
   * Returns unsubscribe function
   */
  public onError(handler: EventHandler<Error>): () => void {
    this.eventHandlers.error.add(handler);
    return () => this.eventHandlers.error.delete(handler);
  }
  
  /**
   * Register connection status change handler
   * Returns unsubscribe function
   */
  public onConnectionChange(handler: EventHandler<ConnectionStatus>): () => void {
    this.eventHandlers.connectionChange.add(handler);
    return () => this.eventHandlers.connectionChange.delete(handler);
  }
  
  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }
  
  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  // ========================================================================
  // Private Methods - WebSocket Event Handlers
  // ========================================================================
  
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.addEventListener('open', this.handleOpen.bind(this));
    this.ws.addEventListener('message', this.handleMessage.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
  }
  
  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('connected', undefined);
    
    // Send init message
    this.sendMessage({
      type: 'init',
      session_id: this.sessionId,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Start heartbeat
    if (this.config.heartbeat.enabled) {
      this.startHeartbeat();
    }
    
    // Send queued messages
    this.flushMessageQueue();
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', message.type);
      
      // Handle pong for heartbeat
      if (message.type === 'pong') {
        this.handlePong();
        return;
      }
      
      // Emit to all message handlers
      this.eventHandlers.message.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] Message handler error:', error);
        }
      });
      
    } catch (error) {
      console.error('[WebSocket] Message parse error:', error);
      this.emitError(new Error('Failed to parse server message'));
    }
  }
  
  private handleError(event: Event): void {
    console.error('[WebSocket] WebSocket error:', event);
    const error = new Error('WebSocket connection error');
    this.emitError(error);
  }
  
  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    
    this.stopHeartbeat();
    
    if (!this.isIntentionalClose) {
      this.updateConnectionStatus('reconnecting');
      this.handleReconnect();
    } else {
      this.updateConnectionStatus('disconnected');
    }
  }
  
  // ========================================================================
  // Private Methods - Reconnection
  // ========================================================================
  
  private handleReconnect(): void {
    if (!this.config.reconnect.enabled || this.isIntentionalClose) {
      return;
    }
    
    if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.updateConnectionStatus('error', 'Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.calculateBackoffDelay();
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnect.maxAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] Attempting reconnect...');
      this.connect();
    }, delay);
    
    this.updateConnectionStatus('reconnecting', undefined, this.reconnectAttempts);
  }
  
  private calculateBackoffDelay(): number {
    const { initialDelay, maxDelay, backoffMultiplier } = this.config.reconnect;
    const delay = initialDelay * Math.pow(backoffMultiplier, this.reconnectAttempts - 1);
    return Math.min(delay, maxDelay);
  }
  
  // ========================================================================
  // Private Methods - Heartbeat
  // ========================================================================
  
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        console.log('[WebSocket] Sending ping');
        this.sendMessage({
          type: 'ping',
          timestamp: new Date().toISOString(),
        });
        
        // Set timeout for pong response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.error('[WebSocket] Heartbeat timeout - no pong received');
          this.ws?.close();
        }, this.config.heartbeat.timeout);
      }
    }, this.config.heartbeat.interval);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
  
  private handlePong(): void {
    console.log('[WebSocket] Received pong');
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
  
  // ========================================================================
  // Private Methods - Message Queue
  // ========================================================================
  
  private queueMessage(message: ClientMessage): void {
    if (this.messageQueue.length >= this.config.messageQueue.maxSize) {
      console.warn('[WebSocket] Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }
    
    this.messageQueue.push(message);
    console.log(`[WebSocket] Message queued (${this.messageQueue.length}/${this.config.messageQueue.maxSize})`);
  }
  
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    console.log(`[WebSocket] Flushing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    queue.forEach(message => {
      this.sendMessage(message);
    });
  }
  
  // ========================================================================
  // Private Methods - State Management
  // ========================================================================
  
  private updateConnectionStatus(
    state: ConnectionState,
    error?: string,
    reconnectAttempt?: number
  ): void {
    this.connectionStatus = {
      state,
      error,
      reconnectAttempt,
      lastConnected: state === 'connected' ? new Date() : this.connectionStatus.lastConnected,
    };
    
    console.log('[WebSocket] Connection status:', this.connectionStatus);
    
    // Emit to all connection change handlers
    this.eventHandlers.connectionChange.forEach(handler => {
      try {
        handler(this.connectionStatus);
      } catch (error) {
        console.error('[WebSocket] Connection change handler error:', error);
      }
    });
  }
  
  private emitError(error: Error): void {
    this.eventHandlers.error.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('[WebSocket] Error handler error:', err);
      }
    });
  }
  
  // ========================================================================
  // Cleanup
  // ========================================================================
  
  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * Destroy the client and cleanup all resources
   */
  public destroy(): void {
    console.log('[WebSocket] Destroying client');
    this.isIntentionalClose = true;
    this.cleanup();
    this.eventHandlers.message.clear();
    this.eventHandlers.error.clear();
    this.eventHandlers.connectionChange.clear();
    this.messageQueue = [];
  }
}
