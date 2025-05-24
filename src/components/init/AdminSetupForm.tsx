
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AdminSetupFormProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  config: any;
}

export function AdminSetupForm({ onSuccess, onError, config }: AdminSetupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim() !== '' && password.trim() !== '' && username.trim() !== '';

  const handleCreateAdmin = async () => {
    if (!isValid) return;

    setIsCreating(true);
    setError(null);
    if (onError) onError('');

    try {
      // Mock admin creation for now
      // In a real implementation, this would call the createInitialAdmin function
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess();
    } catch (err: any) {
      const errorMsg = `Failed to create admin user: ${err.message || 'Unknown error'}`;
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create Admin Account</CardTitle>
        <CardDescription>
          Set up the initial administrator account for your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password"
            placeholder="Enter a secure password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Choose a strong password for your admin account.
          </p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <Button 
          onClick={handleCreateAdmin} 
          disabled={!isValid || isCreating} 
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Admin Account...
            </>
          ) : (
            'Create Admin Account'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
