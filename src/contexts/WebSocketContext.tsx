/**
 * WebSocket Context Provider
 * Maintains a single, persistent WebSocket connection across the entire app
 * Bismillah ar-Rahman ar-Rahim
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { WebSocketClient } from '@/lib/websocket/WebSocketClient';
import { ConnectionStatus, ServerMessage, ClientMessage } from '@/types/websocket';
import { toast } from 'sonner';

interface WebSocketContextValue {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  sendMessage: (message: ClientMessage) => boolean;
  onMessage: (handler: (message: ServerMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new WebSocketClient());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'idle',
  });

  useEffect(() => {
    console.log('[WebSocketProvider] 🚀 Initializing app-level WebSocket connection');

    // Subscribe to connection changes
    const unsubscribe = client.onConnectionChange((status) => {
      console.log('[WebSocketProvider] Connection status:', status.state);
      setConnectionStatus(status);

      // Show reconnection toasts
      if (status.state === 'connected' && status.reconnectAttempt && status.reconnectAttempt > 0) {
        toast.success('✅ Reconnected to ServerGem', { duration: 2000 });
      } else if (status.state === 'reconnecting') {
        toast.loading('🔄 Reconnecting...', { duration: 1000 });
      }
    });

    // Connect immediately
    client.connect();

    // Cleanup only when app unmounts (not when components remount)
    return () => {
      console.log('[WebSocketProvider] 🔴 App unmounting - cleaning up WebSocket');
      unsubscribe();
      client.destroy();
    };
  }, []); // Empty deps - only run once for app lifetime

  const sendMessage = useCallback((message: ClientMessage) => {
    return client.sendMessage(message);
  }, [client]);

  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    return client.onMessage(handler);
  }, [client]);

  const value: WebSocketContextValue = {
    isConnected: connectionStatus.state === 'connected',
    connectionStatus,
    sendMessage,
    onMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
