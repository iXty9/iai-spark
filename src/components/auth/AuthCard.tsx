
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import { useAuthSettings } from '@/hooks/admin/useAuthSettings';

interface AuthCardProps {
  children: React.ReactNode;
}

export const AuthCard = ({ children }: AuthCardProps) => {
  const { authSettings } = useAuthSettings();
  
  return (
    <Card className="w-full max-w-md mx-auto glass-panel border-0 shadow-xl backdrop-blur-md bg-background/90">
      <CardHeader className="space-y-4 text-center pb-8">
        {/* Enhanced Logo Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
              <img 
                src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
                alt="Ixty AI Logo" 
                className="h-8 w-8 relative z-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Ixty AI
            </CardTitle>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Rocket className="h-3 w-3" />
              <span>{authSettings.tagline}</span>
            </div>
          </div>
        </div>
        
        <CardDescription className="text-center text-muted-foreground leading-relaxed px-2">
          {authSettings.welcomeDescription}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-6 pb-6">
        {children}
      </CardContent>
    </Card>
  );
};
