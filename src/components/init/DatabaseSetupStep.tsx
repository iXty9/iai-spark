
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Database } from 'lucide-react';
import { initializationService } from '@/services/config/initialization-service';

interface DatabaseSetupStepProps {
  onComplete: () => void;
}

export const DatabaseSetupStep: React.FC<DatabaseSetupStepProps> = ({ onComplete }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      const result = await initializationService.initialize();
      
      if (result.isComplete) {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setError(result.error || 'Database initialization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Initialize your database with the required tables and configuration.
        </p>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-md">
            <CheckCircle className="h-4 w-4" />
            <span>Database initialized successfully!</span>
          </div>
        )}
        
        <Button 
          onClick={handleInitialize}
          disabled={isInitializing || success}
          className="w-full"
        >
          {isInitializing ? 'Initializing...' : success ? 'Complete!' : 'Initialize Database'}
        </Button>
      </CardContent>
    </Card>
  );
};
