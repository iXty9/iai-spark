
import React from 'react';

interface IOSFallbackInputProps {
  show: boolean;
}

export const IOSFallbackInput: React.FC<IOSFallbackInputProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div 
      id="ios-fallback-input" 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        padding: '8px',
        backgroundColor: 'var(--background)',
        borderTop: '1px solid var(--border)',
        minHeight: '40px',
        display: 'block',
      }}
    >
      <button 
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '20px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
        onClick={() => {
          const realInput = document.querySelector('#message-input-container textarea');
          const container = document.getElementById('message-input-container');
          
          if (container) {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.position = 'relative';
            container.style.bottom = '0';
            container.style.zIndex = '1000';
            
            container.scrollIntoView({ behavior: 'smooth', block: 'end' });
            
            if (realInput) {
              setTimeout(() => {
                (realInput as HTMLTextAreaElement).focus();
              }, 300);
            }
          }
        }}
      >
        Tap here to type your message...
      </button>
    </div>
  );
};
