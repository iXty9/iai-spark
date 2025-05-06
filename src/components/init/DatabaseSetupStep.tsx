
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeSupabaseDb } from '@/services/supabase/init-service';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DatabaseSetupStepProps {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function DatabaseSetupStep({ 
  supabaseUrl, 
  anonKey, 
  serviceKey, 
  onSuccess, 
  onBack 
}: DatabaseSetupStepProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Handle the initialize database button
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const result = await initializeSupabaseDb(supabaseUrl, serviceKey, anonKey);
      
      if (result.success) {
        setInitialized(true);
        setTimeout(onSuccess, 1500); // Show success state before continuing
      } else {
        setError(result.error || 'Database initialization failed');
      }
    } catch (err: any) {
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };
  
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>
          Initialize your database with the required tables and security policies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            This will set up all required database tables, functions, and security policies for your application.
          </p>
          
          <div className="bg-muted p-4 rounded-md text-sm">
            <ul className="list-disc pl-5 space-y-1">
              <li>Create user profiles table</li>
              <li>Set up role management</li>
              <li>Configure application settings</li>
              <li>Establish security policies</li>
              <li>Create necessary database functions</li>
            </ul>
          </div>
          
          {initialized && (
            <div className="flex items-center gap-2 text-green-500 mt-4">
              <CheckCircle className="h-5 w-5" />
              <span>Database initialized successfully!</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm mt-4">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={onBack}
          variant="outline"
          disabled={isInitializing || initialized}
        >
          Back
        </Button>
        <Button 
          onClick={handleInitialize} 
          disabled={isInitializing || initialized}
        >
          {isInitializing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing Database...
            </>
          ) : initialized ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Completed
            </>
          ) : (
            'Initialize Database'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
