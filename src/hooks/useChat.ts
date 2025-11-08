/**
 * High-level Chat Hook
 * Abstracts WebSocket complexity for chat UI
 * Now uses app-level WebSocket context for persistent connection
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { UseChatReturn, ChatMessage, ServerMessage } from '@/types/websocket';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { DeploymentProgress, DEPLOYMENT_STAGES, DeploymentStageStatus } from '@/types/deployment';
import { parseBackendLog, calculateDuration, generateDeploymentId } from '@/lib/websocket/deploymentParser';

/**
 * Hook for chat functionality
 * Manages messages, typing state, and connection status
 */
export const useChat = (): UseChatReturn => {
  const navigate = useNavigate();
  const { 
    connectionStatus, 
    isConnected, 
    sendMessage: wsSendMessage,
    onMessage,
  } = useWebSocketContext();
  
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(null);
  
  // Debug: Log state changes
  useEffect(() => {
    console.log('[useChat] isTyping state changed to:', isTyping);
  }, [isTyping]);
  
  useEffect(() => {
    console.log('[useChat] isConnected state changed to:', isConnected);
  }, [isConnected]);
  
  // ========================================================================
  // Message Creators (defined first to avoid circular dependencies)
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
  // Deployment Progress Management
  // ========================================================================
  
  const updateDeploymentStage = useCallback((message: string) => {
    const stageUpdate = parseBackendLog(message);
    
    if (!stageUpdate) return;
    
    setDeploymentProgress(prev => {
      if (!prev) {
        // Initialize deployment progress
        return {
          deploymentId: generateDeploymentId(),
          serviceName: 'Your App',
          stages: DEPLOYMENT_STAGES.map(stage => ({ ...stage })),
          currentStage: stageUpdate.stage,
          overallProgress: stageUpdate.progress || 0,
          startTime: new Date().toISOString(),
          status: 'deploying',
        };
      }
      
      // Update existing progress
      const updatedStages = prev.stages.map(stage => {
        if (stage.id === stageUpdate.stage) {
          const isCompleting = stageUpdate.status === 'success';
          return {
            ...stage,
            status: stageUpdate.status,
            details: stageUpdate.details,
            message: stageUpdate.message,
            startTime: stage.startTime || new Date().toISOString(),
            endTime: isCompleting ? new Date().toISOString() : undefined,
            duration: isCompleting
              ? calculateDuration(stage.startTime || new Date().toISOString(), new Date().toISOString())
              : undefined,
          };
        }
        return stage;
      });
      
      return {
        ...prev,
        stages: updatedStages,
        currentStage: stageUpdate.stage,
        overallProgress: stageUpdate.progress || prev.overallProgress,
      };
    });
  }, []);

  const handleServerMessage = useCallback((serverMessage: ServerMessage) => {
    console.log('[useChat] Received server message:', serverMessage.type);
    
    switch (serverMessage.type) {
      case 'connected':
        console.log('[useChat] Connected to server:', serverMessage.message);
        break;
        
      case 'typing':
        console.log('[useChat] Setting typing to true');
        setIsTyping(true);
        break;
      
      case 'deployment_started':
        console.log('[useChat] 🚀 Deployment started:', (serverMessage as any).deployment_id);
        setIsTyping(false);
        
        // Initialize deployment progress with all stages as waiting
        setDeploymentProgress({
          deploymentId: (serverMessage as any).deployment_id || generateDeploymentId(),
          serviceName: 'Your App',
          stages: DEPLOYMENT_STAGES.map(stage => ({ ...stage })),
          currentStage: '',
          overallProgress: 0,
          startTime: new Date().toISOString(),
          status: 'deploying',
        });
        break;
      
      case 'deployment_progress':
        console.log('[useChat] 📊 Deployment progress:', (serverMessage as any).stage, (serverMessage as any).status);
        
        setDeploymentProgress((prev) => {
          // If we receive progress but no deployment exists, create one
          // This handles reconnection scenarios where we missed deployment_started
          if (!prev) {
            console.warn('[useChat] ⚠️ Received progress but no deployment exists, creating new deployment state');
            const progressMsg = serverMessage as any;
            
            return {
              deploymentId: progressMsg.deployment_id || generateDeploymentId(),
              serviceName: 'Your App',
              stages: DEPLOYMENT_STAGES.map(stage => ({
                ...stage,
                status: stage.id === progressMsg.stage ? progressMsg.status : 'waiting',
                message: stage.id === progressMsg.stage ? progressMsg.message : 'Waiting...',
              })),
              currentStage: progressMsg.stage,
              overallProgress: 0,
              startTime: new Date().toISOString(),
              status: 'deploying',
            };
          }
          
          const progressMsg = serverMessage as any;
          const updatedStages = prev.stages.map(stage => {
            if (stage.id === progressMsg.stage) {
              return {
                ...stage,
                status: progressMsg.status as DeploymentStageStatus,
                message: progressMsg.message,
                details: progressMsg.details ? Object.entries(progressMsg.details).map(([k, v]) => `${k}: ${v}`) : [],
                startTime: progressMsg.status === 'in-progress' ? new Date().toISOString() : stage.startTime,
                endTime: progressMsg.status === 'success' || progressMsg.status === 'error' 
                  ? new Date().toISOString() 
                  : stage.endTime,
                duration: progressMsg.status === 'success' || progressMsg.status === 'error'
                  ? calculateDuration(stage.startTime || new Date().toISOString(), new Date().toISOString())
                  : undefined,
              };
            }
            return stage;
          });
          
          // Calculate overall progress based on completed stages
          const completedStages = updatedStages.filter(s => s.status === 'success').length;
          const overallProgress = Math.round((completedStages / updatedStages.length) * 100);
          
          return {
            ...prev,
            stages: updatedStages,
            currentStage: progressMsg.stage,
            overallProgress: progressMsg.progress || overallProgress,
          };
        });
        break;
        
      case 'message':
        console.log('[useChat] Setting typing to false, adding message');
        setIsTyping(false);
        
        // Check if message contains deployment info
        if (serverMessage.data.content) {
          updateDeploymentStage(serverMessage.data.content);
        }
        
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
        
        // Also update deployment stages
        if (serverMessage.data.message) {
          updateDeploymentStage(serverMessage.data.message);
        }
        break;
        
      case 'deployment_complete':
        setIsTyping(false);
        
        // Mark deployment as complete
        setDeploymentProgress(prev => prev ? {
          ...prev,
          status: 'success',
          overallProgress: 100,
          deploymentUrl: serverMessage.data.url,
        } : null);
        
        addDeploymentCompleteMessage(serverMessage.data);
        break;
        
      case 'error':
        setIsTyping(false);
        
        // Handle specific error codes
        const errorCode = (serverMessage as any).code;
        
        if (errorCode === 'API_KEY_REQUIRED' || errorCode === 'INVALID_API_KEY') {
          sonnerToast.error(
            serverMessage.message,
            {
              duration: 10000,
              action: {
                label: 'Add API Key',
                onClick: () => navigate('/settings')
              },
            }
          );
        } else if (errorCode === 'QUOTA_EXCEEDED') {
          sonnerToast.error(
            serverMessage.message,
            {
              duration: 10000,
              action: {
                label: 'Check Quota',
                onClick: () => window.open('https://ai.google.dev/aistudio', '_blank')
              },
            }
          );
          
          // Add error message to chat
          const errorMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `❌ **API Quota Exceeded**\n\n${serverMessage.message}\n\n**What to do:**\n• Check your Gemini API quota at [Google AI Studio](https://ai.google.dev/aistudio)\n• Wait a few minutes for the quota to reset\n• Consider upgrading your API plan if you need higher limits`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        } else {
          // For other errors, also show in chat
          const errorMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `❌ **Error**\n\n${serverMessage.message}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
        
        // Mark deployment as failed if active
        if (deploymentProgress) {
          setDeploymentProgress(prev => prev ? {
            ...prev,
            status: 'failed',
            error: {
              message: serverMessage.message,
              stage: prev.currentStage,
              autoFixable: false,
              canRollback: false,
            },
          } : null);
        }
        
        handleErrorMessage(serverMessage);
        break;
        
      default:
        console.warn('[useChat] Unknown message type:', serverMessage);
    }
  }, [addAssistantMessage, addAnalysisMessage, updateDeploymentProgress, addDeploymentCompleteMessage, handleErrorMessage, updateDeploymentStage, deploymentProgress, navigate]);
  
  useEffect(() => {
    const unsubscribe = onMessage((serverMessage: ServerMessage) => {
      handleServerMessage(serverMessage);
    });
    
    return unsubscribe;
  }, [onMessage, handleServerMessage]);
  
  // ========================================================================
  // Public Methods
  // ========================================================================
  
  const sendMessage = useCallback((content: string, files?: File[] | Record<string, any>) => {
    // Determine if files is actually files or context
    const isFileArray = Array.isArray(files) && files.length > 0 && files[0] instanceof File;
    const contextData = isFileArray ? undefined : files as Record<string, any> | undefined;
    const uploadedFiles = isFileArray ? files as File[] : undefined;

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: uploadedFiles && uploadedFiles.length > 0 
        ? `${content}\n\n📎 Attached: ${uploadedFiles.map(f => f.name).join(', ')}`
        : content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    // TODO: Handle file upload to backend
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('[useChat] Files to upload:', uploadedFiles.map(f => f.name));
      // Future: Upload files to backend and get URLs
    }
    
    // Send to backend
    const success = wsSendMessage({
      type: 'message',
      message: content,
      context: contextData,
    });
    
    if (!success) {
      toast({
        title: 'Message Queued',
        description: 'Your message will be sent when connection is restored.',
      });
    }
  }, [wsSendMessage, toast]);
  
  /**
   * Send structured data to backend (for env vars, etc.)
   */
  const sendStructuredMessage = useCallback((type: string, data: any) => {
    if (!isConnected) {
      console.warn('[useChat] Not connected, cannot send structured message');
      return;
    }
    
    console.log(`[useChat] Sending structured message: ${type}`, data);
    
    wsSendMessage({
      type,
      ...data,
    });
  }, [isConnected, wsSendMessage]);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
  }, []);
  
  // ========================================================================
  // Connection Status Handling
  // ========================================================================
  
  useEffect(() => {
    if (connectionStatus.state === 'error') {
      // Reset typing state on connection error
      setIsTyping(false);
      toast({
        title: 'Connection Error',
        description: connectionStatus.error || 'Failed to connect to server',
        variant: 'destructive',
      });
    } else if (connectionStatus.state === 'reconnecting') {
      // Reset typing state when reconnecting
      setIsTyping(false);
      toast({
        title: 'Reconnecting...',
        description: `Attempt ${connectionStatus.reconnectAttempt || 1}`,
      });
    } else if (connectionStatus.state === 'connected' && connectionStatus.reconnectAttempt) {
      // Successfully reconnected
      console.log('[useChat] ✅ Successfully reconnected!');
      toast({
        title: 'Reconnected!',
        description: deploymentProgress 
          ? 'Deployment updates will resume.' 
          : 'Connection restored.',
      });
    }
  }, [connectionStatus, toast, deploymentProgress]);
  
  // ========================================================================
  // Return
  // ========================================================================
  
  return {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    clearMessages,
    connectionStatus,
    sendStructuredMessage,
    deploymentProgress,
    setDeploymentProgress,
    connect: () => console.log('[useChat] connect() is handled by WebSocketProvider'),
    disconnect: () => console.log('[useChat] disconnect() is handled by WebSocketProvider'),
  };
};

// ========================================================================
// Helper Functions
// ========================================================================

function formatAnalysisMessage(data: any): string {
  return `**Analysis Complete** ✅\n\n${data.summary || 'No summary available'}`;
}

function formatDeploymentProgress(data: any): string {
  const progress = data.progress || 0;
  const stage = data.stage || 'unknown';
  
  return `**Deployment Progress** 🚀\n\nStage: ${stage}\nProgress: ${progress}%`;
}

function formatDeploymentComplete(data: any): string {
  return `**Deployment Complete!** 🎉\n\nYour app is now live at:\n${data.url}`;
}
