/**
 * High-level Chat Hook
 * Abstracts WebSocket complexity for chat UI
 */

import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { UseChatReturn, ChatMessage, ServerMessage } from '@/types/websocket';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for chat functionality
 * Manages messages, typing state, and connection status
 */
export const useChat = (): UseChatReturn => {
  const { 
    connectionStatus, 
    isConnected, 
    sendMessage: wsSendMessage,
    onMessage,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useWebSocket();
  
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // ========================================================================
  // Message Handlers
  // ========================================================================
  
  useEffect(() => {
    const unsubscribe = onMessage((serverMessage: ServerMessage) => {
      handleServerMessage(serverMessage);
    });
    
    return unsubscribe;
  }, [onMessage]);
  
  const handleServerMessage = useCallback((serverMessage: ServerMessage) => {
    console.log('[useChat] Received server message:', serverMessage.type);
    
    switch (serverMessage.type) {
      case 'connected':
        console.log('[useChat] Connected to server:', serverMessage.message);
        break;
        
      case 'typing':
        setIsTyping(true);
        break;
        
      case 'message':
        setIsTyping(false);
        addAssistantMessage({
          content: serverMessage.data.content,
          actions: serverMessage.data.actions,
          metadata: serverMessage.data.metadata,
        });
        break;
        
      case 'analysis':
        setIsTyping(false);
        addAnalysisMessage(serverMessage.data);
        break;
        
      case 'deployment_update':
        updateDeploymentProgress(serverMessage.data);
        break;
        
      case 'deployment_complete':
        setIsTyping(false);
        addDeploymentCompleteMessage(serverMessage.data);
        break;
        
      case 'error':
        setIsTyping(false);
        handleErrorMessage(serverMessage);
        break;
        
      default:
        console.warn('[useChat] Unknown message type:', serverMessage);
    }
  }, []);
  
  // ========================================================================
  // Message Creators
  // ========================================================================
  
  const addAssistantMessage = useCallback((data: {
    content: string;
    actions?: any[];
    metadata?: Record<string, any>;
  }) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: data.content,
      timestamp: new Date(),
      actions: data.actions,
      metadata: data.metadata,
    };
    
    setMessages(prev => [...prev, message]);
  }, []);
  
  const addAnalysisMessage = useCallback((data: any) => {
    const content = formatAnalysisMessage(data);
    addAssistantMessage({ content });
  }, [addAssistantMessage]);
  
  const updateDeploymentProgress = useCallback((data: any) => {
    // Find existing deployment message or create new one
    setMessages(prev => {
      const existingIndex = prev.findIndex(
        msg => msg.metadata?.type === 'deployment_progress'
      );
      
      const progressMessage: ChatMessage = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `msg_${Date.now()}`,
        role: 'assistant',
        content: formatDeploymentProgress(data),
        timestamp: new Date(),
        metadata: { type: 'deployment_progress', ...data },
      };
      
      if (existingIndex >= 0) {
        const newMessages = [...prev];
        newMessages[existingIndex] = progressMessage;
        return newMessages;
      } else {
        return [...prev, progressMessage];
      }
    });
  }, []);
  
  const addDeploymentCompleteMessage = useCallback((data: any) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: formatDeploymentComplete(data),
      timestamp: new Date(),
      deploymentUrl: data.url,
      actions: [
        { id: 'view_logs', label: '📊 View Logs', type: 'button', action: 'view_logs' },
        { id: 'setup_cicd', label: '🔄 Set Up CI/CD', type: 'button', action: 'setup_cicd' },
        { id: 'custom_domain', label: '🌐 Custom Domain', type: 'button', action: 'custom_domain' },
      ],
    };
    
    setMessages(prev => [...prev, message]);
    
    // Show success toast
    toast({
      title: '🎉 Deployment Successful!',
      description: `Your app is live at ${data.url}`,
    });
  }, [toast]);
  
  const handleErrorMessage = useCallback((serverMessage: any) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `❌ **Error:** ${serverMessage.message}`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, message]);
    
    toast({
      title: 'Error',
      description: serverMessage.message,
      variant: 'destructive',
    });
  }, [toast]);
  
  // ========================================================================
  // Public Methods
  // ========================================================================
  
  const sendMessage = useCallback((content: string, context?: Record<string, any>) => {
    // Add user message to UI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to backend
    const success = wsSendMessage({
      type: 'message',
      message: content,
      context,
    });
    
    if (!success) {
      toast({
        title: 'Message Queued',
        description: 'Your message will be sent when connection is restored.',
      });
    }
  }, [wsSendMessage, toast]);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // ========================================================================
  // Connection Status Handling
  // ========================================================================
  
  useEffect(() => {
    if (connectionStatus.state === 'error') {
      toast({
        title: 'Connection Error',
        description: connectionStatus.error || 'Failed to connect to server',
        variant: 'destructive',
      });
    } else if (connectionStatus.state === 'reconnecting') {
      toast({
        title: 'Reconnecting...',
        description: `Attempt ${connectionStatus.reconnectAttempt || 1}`,
      });
    }
  }, [connectionStatus, toast]);
  
  // ========================================================================
  // Return
  // ========================================================================
  
  return {
    messages,
    isConnected,
    isTyping,
    connectionStatus,
    sendMessage,
    clearMessages,
    connect: wsConnect,
    disconnect: wsDisconnect,
  };
};

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatAnalysisMessage(data: any): string {
  return `
🔍 **Analysis Complete**

**Framework:** ${data.framework} (${data.language})
**Entry Point:** \`${data.entry_point || 'Not found'}\`
**Dependencies:** ${data.dependencies.length} packages
${data.database ? `**Database:** ${data.database}` : ''}
${data.env_vars.length > 0 ? `**Environment Variables:** ${data.env_vars.length} detected` : ''}

${data.recommendations.length > 0 ? `\n**Recommendations:**\n${data.recommendations.map((r: string) => `• ${r}`).join('\n')}` : ''}

${data.warnings.length > 0 ? `\n**Warnings:**\n${data.warnings.map((w: string) => `• ${w}`).join('\n')}` : ''}
  `.trim();
}

function formatDeploymentProgress(data: any): string {
  return `
🚀 **Deploying...**

**Stage:** ${data.stage}
**Progress:** ${data.progress}%

${data.message}

${data.logs ? `\n\`\`\`\n${data.logs.slice(-5).join('\n')}\n\`\`\`` : ''}
  `.trim();
}

function formatDeploymentComplete(data: any): string {
  return `
🎉 **Deployment Successful!**

Your app is live at:

**Service:** ${data.service_name}
**Region:** ${data.region}

✅ Auto HTTPS enabled
✅ Auto-scaling configured
✅ Health checks active
✅ Monitoring enabled

What would you like to do next?
  `.trim();
}
