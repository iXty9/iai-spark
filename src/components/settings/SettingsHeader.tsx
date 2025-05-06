
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SettingsHeader() {
  const navigate = useNavigate();
  
  const handleGoBack = () => {
    navigate('/');
  };
  
  return (
    <CardHeader className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute left-2 top-2" 
        onClick={handleGoBack}
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <CardTitle className="text-center">Settings</CardTitle>
      <CardDescription className="text-center">
        Customize your app experience
      </CardDescription>
    </CardHeader>
  );
}
