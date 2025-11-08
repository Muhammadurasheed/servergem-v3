import { useState } from 'react';
import { Upload, Edit3, SkipForward } from 'lucide-react';
import { EnvFileUpload, EnvVariable } from './EnvFileUpload';
import { ManualEnvInput } from './ManualEnvInput';

// Re-export EnvVariable for use in other components
export type { EnvVariable };

interface EnvVariablesInputProps {
  onEnvSubmit: (envVars: EnvVariable[]) => void;
  onSkip?: () => void;
  sendMessageToBackend?: (type: string, data: any) => void;
}

export function EnvVariablesInput({ onEnvSubmit, onSkip, sendMessageToBackend }: EnvVariablesInputProps) {
  const [inputMethod, setInputMethod] = useState<'upload' | 'manual' | null>(null);
  
  const handleEnvSubmit = (envVars: EnvVariable[]) => {
    console.log('[EnvVariablesInput] Submitting env vars to backend:', envVars.length);
    
    // Send to backend via WebSocket
    if (sendMessageToBackend) {
      sendMessageToBackend('env_vars_uploaded', {
        variables: envVars.map(env => ({
          key: env.key,
          value: env.value,
          isSecret: env.isSecret
        })),
        count: envVars.length
      });
    }
    
    // Also call parent callback
    onEnvSubmit(envVars);
  };

  if (!inputMethod) {
    return (
      <div className="env-input-choice">
        <h3 className="choice-title">Environment Variables</h3>
        <p className="choice-description">
          Your app needs environment variables. How would you like to provide them?
        </p>
        
        <div className="choice-buttons">
          <button 
            onClick={() => setInputMethod('upload')}
            className="choice-btn recommended"
          >
            <Upload size={24} />
            <div className="choice-content">
              <span className="choice-btn-title">Upload .env File</span>
              <span className="choice-btn-subtitle">Easiest • Recommended</span>
            </div>
          </button>
          
          <button 
            onClick={() => setInputMethod('manual')}
            className="choice-btn"
          >
            <Edit3 size={24} />
            <div className="choice-content">
              <span className="choice-btn-title">Enter Manually</span>
              <span className="choice-btn-subtitle">Type key-value pairs</span>
            </div>
          </button>
        </div>
        
        {onSkip && (
          <button 
            onClick={onSkip}
            className="skip-btn"
          >
            <SkipForward size={16} />
            Skip (I'll add them later)
          </button>
        )}
      </div>
    );
  }

  if (inputMethod === 'upload') {
    return (
      <div className="env-input-container">
        <button 
          onClick={() => setInputMethod(null)}
          className="back-btn"
        >
          ← Back to options
        </button>
        <EnvFileUpload 
          onEnvParsed={handleEnvSubmit}
          onEnvsSentToBackend={() => {
            console.log('[EnvVariablesInput] Env vars sent to backend successfully');
          }}
        />
      </div>
    );
  }

  return (
    <div className="env-input-container">
      <button 
        onClick={() => setInputMethod(null)}
        className="back-btn"
      >
        ← Back to options
      </button>
      <ManualEnvInput onEnvSubmit={handleEnvSubmit} />
    </div>
  );
}
