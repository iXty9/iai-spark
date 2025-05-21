
import React from 'react';
import { BootstrapState } from '../services/supabase/bootstrap/bootstrap-states';

interface BootstrapScreenProps {
  state: string;
  error?: any;
}

export const BootstrapScreen = ({ state, error }: BootstrapScreenProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md w-full p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold">Application Bootstrap</h1>
        <div className="text-left">
          <p>Current state: {state}</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
              <h3 className="font-bold">Error</h3>
              <p>{error.toString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
