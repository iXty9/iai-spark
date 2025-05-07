
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

export default function Index() {
  const location = useLocation();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  useEffect(() => {
    // Check if we have a success message from shared config
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('shared_config') === 'success') {
      setShowSuccessMessage(true);
      
      // Clear the parameter from the URL without page refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('shared_config');
      window.history.replaceState({}, document.title, newUrl.toString());
      
      // Hide the success message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div className="container py-10">
      {showSuccessMessage && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Connection Successful</AlertTitle>
          <AlertDescription className="text-green-700">
            Your shared Supabase configuration has been applied successfully.
          </AlertDescription>
        </Alert>
      )}

      <h1 className="text-3xl font-bold mb-6">Welcome</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in or create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth">
              <Button className="w-full">Go to Auth</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              View and edit your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile">
              <Button className="w-full" variant="outline">View Profile</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>
              Access admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin">
              <Button className="w-full" variant="secondary">Admin Panel</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Configure application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings">
              <Button className="w-full" variant="outline">Settings</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
            <CardDescription>
              Configure Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/supabase-auth">
              <Button className="w-full" variant="default">Configure Database</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
