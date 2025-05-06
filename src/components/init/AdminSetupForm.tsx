
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createInitialAdmin } from '@/services/supabase/init-service';
import { Loader2 } from 'lucide-react';

interface AdminSetupFormProps {
  supabaseUrl: string;
  serviceKey: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function AdminSetupForm({ supabaseUrl, serviceKey, onSuccess, onBack }: AdminSetupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form validation
  const isValid = email.includes('@') && 
                  password.length >= 6 && 
                  password === confirmPassword &&
                  username.trim() !== '';
  
  // Handle the create admin button
  const handleCreateAdmin = async () => {
    if (!isValid) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await createInitialAdmin(
        email, 
        password, 
        username,
        supabaseUrl,
        serviceKey
      );
      
      if (result.success) {
        // Configuration is already saved in the init-service
        onSuccess();
      } else {
        setError(result.error || 'Failed to create admin user');
      }
    } catch (err: any) {
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create Initial Admin</CardTitle>
        <CardDescription>
          Set up the first administrator account for your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="admin@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username" 
            placeholder="admin" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password"
            placeholder="••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input 
            id="confirm-password" 
            type="password"
            placeholder="••••••" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={onBack}
          variant="outline"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button 
          onClick={handleCreateAdmin} 
          disabled={!isValid || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Admin...
            </>
          ) : (
            'Create Admin & Complete Setup'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
