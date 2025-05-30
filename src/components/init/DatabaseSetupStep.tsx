
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeSupabaseDb } from '@/services/supabase/init-service';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/utils/logging';

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
  const [showExecSqlHelp, setShowExecSqlHelp] = useState(false);
  const [isReconnection, setIsReconnection] = useState(false);
  const [reconnectionMessage, setReconnectionMessage] = useState<string | null>(null);
  
  // Handle the initialize database button
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setShowExecSqlHelp(false);
    setIsReconnection(false);
    setReconnectionMessage(null);
    
    try {
      logger.info('Starting database initialization', { module: 'database-setup' });
      
      const result = await initializeSupabaseDb(supabaseUrl, serviceKey, anonKey);
      
      if (result.success) {
        setInitialized(true);
        
        // Check if this was a reconnection to existing database
        if (result.reconnected) {
          setIsReconnection(true);
          setReconnectionMessage(result.detail || 'Connected to existing database structure successfully.');
          logger.info('Reconnected to existing database', { module: 'database-setup' });
        } else {
          logger.info('Database initialized successfully', { module: 'database-setup' });
        }
        
        // Configuration is saved in the init service
        setTimeout(onSuccess, 1500); // Show success state before continuing
      } else {
        setError(result.error || 'Database initialization failed');
        logger.error('Database initialization failed', { 
          error: result.error, 
          module: 'database-setup' 
        });
        
        // Check if the error is related to missing exec_sql function
        if (result.error?.includes('function exec_sql(text) does not exist') ||
            result.error?.includes('exec_sql function')) {
          setShowExecSqlHelp(true);
        }
      }
    } catch (err: any) {
      const errorMessage = `Error: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      logger.error('Database initialization exception', err, { module: 'database-setup' });
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
          
          {initialized && !isReconnection && (
            <div className="flex items-center gap-2 text-green-500 mt-4">
              <CheckCircle className="h-5 w-5" />
              <span>Database initialized successfully!</span>
            </div>
          )}
          
          {initialized && isReconnection && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <Info className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-700">Reconnection Successful</AlertTitle>
              <AlertDescription className="text-green-600">
                {reconnectionMessage || 'Connected to existing database. Your data remains intact.'}
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm mt-4">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {showExecSqlHelp && (
            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Required Function</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  The <code>exec_sql</code> function is missing in your Supabase database. 
                  We tried to create it automatically but encountered an issue.
                </p>
                <p>
                  Please try again. If the problem persists, you can manually create the function
                  in the Supabase SQL Editor with the following SQL:
                </p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {`CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`}
                </pre>
              </AlertDescription>
            </Alert>
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
              {isReconnection ? 'Reconnecting...' : 'Initializing Database...'}
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
