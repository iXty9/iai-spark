
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DevModeContextType {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  toggleDevMode: () => {},
});

export const useDevMode = () => useContext(DevModeContext);

export const DevModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(false);

  const toggleDevMode = () => {
    const newValue = !isDevMode;
    setIsDevMode(newValue);
    
    // Dispatch event to notify our debug systems
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('devModeChanged', { 
        detail: { isDevMode: newValue } 
      }));
      
      // Add a delay to allow React to stabilize before applying changes
      setTimeout(() => {
        console.log('Dev Mode changed:', newValue);
      }, 0);
    }
  };

  return (
    <DevModeContext.Provider value={{ isDevMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
};
