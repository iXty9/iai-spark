
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface DatabaseSetupStepProps {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  onSuccess: () => void;
  onBack: () => void;
  onProgress: (current: number, total: number, message: string) => void;
}

export const DatabaseSetupStep = ({
  supabaseUrl,
  anonKey,
  serviceKey,
  onSuccess,
  onBack,
  onProgress
}: DatabaseSetupStepProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  // Function to simulate database setup
  // In a real app, this would make actual calls to set up database tables
  const runDatabaseSetup = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      // Simulate steps with progress updates
      const totalSteps = 5;
      
      // Step 1
      onProgress(1, totalSteps, "Creating database tables...");
      await new Promise(r => setTimeout(r, 1500));
      
      // Step 2
      onProgress(2, totalSteps, "Setting up authentication...");
      await new Promise(r => setTimeout(r, 1000));
      
      // Step 3
      onProgress(3, totalSteps, "Creating initial schema...");
      await new Promise(r => setTimeout(r, 1200));
      
      // Step 4
      onProgress(4, totalSteps, "Setting up storage buckets...");
      await new Promise(r => setTimeout(r, 800));
      
      // Step 5
      onProgress(5, totalSteps, "Finalizing setup...");
      await new Promise(r => setTimeout(r, 1000));
      
      // Complete
      setSetupComplete(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Optional: Auto-run setup when component mounts
    // runDatabaseSetup();
  }, []);

  return (
    <Card className="w-full p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">Database Setup</h2>
        
        <p className="text-center text-muted-foreground">
          We'll now initialize your database with the necessary tables and configuration.
        </p>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={runDatabaseSetup}
            disabled={isRunning || setupComplete}
          >
            {isRunning ? 'Setting Up...' : setupComplete ? 'Setup Complete' : 'Start Database Setup'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isRunning}
          >
            Back
          </Button>
        </div>
      </div>
    </Card>
  );
};
