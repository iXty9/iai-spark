
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Copy, CheckCircle } from 'lucide-react';
import { securityFixMigration } from '@/services/supabase/security-fix-migration';
import { useToast } from '@/hooks/use-toast';

export function SecurityFixPanel() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(securityFixMigration);
      setCopied(true);
      toast({
        title: "SQL copied to clipboard",
        description: "You can now paste it in the Supabase SQL Editor.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy the SQL manually.",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Security Fix Required
        </CardTitle>
        <CardDescription>
          Apply security fixes to prevent search path manipulation attacks on database functions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <Shield className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Action Required</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Your database functions need security updates to prevent potential search path manipulation attacks.
            This is a recommended security enhancement.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium">How to apply the fix:</h4>
          <ol className="list-decimal list-inside text-sm space-y-2">
            <li>Copy the SQL migration below</li>
            <li>Open your Supabase SQL Editor</li>
            <li>Paste and run the SQL commands</li>
            <li>Verify the functions are updated successfully</li>
          </ol>
        </div>

        <div className="relative">
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64 border">
            <code>{securityFixMigration}</code>
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2"
            onClick={handleCopySQL}
          >
            {copied ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy SQL
              </>
            )}
          </Button>
        </div>

        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">What this fixes:</AlertTitle>
          <AlertDescription className="text-green-700">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Prevents search path manipulation attacks</li>
              <li>Ensures functions operate with predictable schema resolution</li>
              <li>Maintains security best practices for SECURITY DEFINER functions</li>
              <li>Resolves Supabase security scanner warnings</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
