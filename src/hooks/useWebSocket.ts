/**
 * React Hook for WebSocket Connection
 * Manages WebSocket lifecycle within React component lifecycle
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient } from '@/lib/websocket/WebSocketClient';
import { 
  UseWebSocketReturn, 
  ConnectionStatus,
  ClientMessage,
  ServerMessage,
} from '@/types/websocket';

/**
 * Hook for WebSocket connection management
 * Automatically connects on mount and cleans up on unmount
 */
export const useWebSocket = (): UseWebSocketReturn => {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'idle',
  });
  
  // Initialize client
  useEffect(() => {
    console.log('[useWebSocket] 🔷 Initializing WebSocket client');
    console.log('[useWebSocket] Component mounted, creating new client');
    
    clientRef.current = new WebSocketClient();
    
    // Subscribe to connection changes
    const unsubscribe = clientRef.current.onConnectionChange((status) => {
      setConnectionStatus(status);
    });
    
    // Auto-connect
    clientRef.current.connect();
    
    // Cleanup on unmount
    return () => {
      console.log('[useWebSocket] 🔷 Component unmounting - cleaning up WebSocket');
      console.log('[useWebSocket] Call stack:', new Error().stack);
      unsubscribe();
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, []); // Empty deps array - only run once on mount
  
  // ========================================================================
  // Methods
  // ========================================================================
  
  const connect = useCallback(() => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return;
    }
    clientRef.current.connect();
  }, []);
  
  const disconnect = useCallback(() => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return;
    }
    clientRef.current.disconnect();
  }, []);
  
  const sendMessage = useCallback((message: ClientMessage): boolean => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return false;
    }
    return clientRef.current.sendMessage(message);
  }, []);
  
  // ========================================================================
  // Event Handlers
  // ========================================================================
  
  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return () => {};
    }
    return clientRef.current.onMessage(handler);
  }, []);
  
  const onError = useCallback((handler: (error: Error) => void) => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return () => {};
    }
    return clientRef.current.onError(handler);
  }, []);
  
  const onConnectionChange = useCallback((handler: (status: ConnectionStatus) => void) => {
    if (!clientRef.current) {
      console.error('[useWebSocket] Client not initialized');
      return () => {};
    }
    return clientRef.current.onConnectionChange(handler);
  }, []);
  
  // ========================================================================
  // Return
  // ========================================================================
  
  return {
    connectionStatus,
    isConnected: connectionStatus.state === 'connected',
    connect,
    disconnect,
    sendMessage,
    onMessage,
    onError,
    onConnectionChange,
  };
};
