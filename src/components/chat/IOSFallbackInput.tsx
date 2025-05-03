
import React from 'react';

interface IOSFallbackInputProps {
  show: boolean;
}

export const IOSFallbackInput: React.FC<IOSFallbackInputProps> = ({ show }) => {
  if (!show) return null;

  const handleClick = () => {
    const realInput = document.getElementById('message-input-container');
    
    if (realInput) {
      realInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      const textarea = realInput.querySelector('textarea');
      if (textarea) {
        setTimeout(() => {
          textarea.focus();
        }, 300);
      }
    }
  };

  return (
    <div 
      id="ios-fallback-input" 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        padding: '12px',
        backgroundColor: 'var(--background)',
        borderTop: '1px solid var(--border)',
        minHeight: '60px',
        display: 'block',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)'
      }}
    >
      <button 
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '20px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          touchAction: 'manipulation'
        }}
        onClick={handleClick}
      >
        Tap here to type your message...
      </button>
    </div>
  );
};
