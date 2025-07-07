
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Rocket, Heart, Zap, Sparkles, Crown, Award, Trophy } from 'lucide-react';
import { useAuthSettings } from '@/hooks/admin/useAuthSettings';

const ICON_COMPONENTS = {
  star: Star,
  rocket: Rocket,
  heart: Heart,
  zap: Zap,
  sparkles: Sparkles,
  crown: Crown,
  award: Award,
  trophy: Trophy,
};

interface AuthCardProps {
  children: React.ReactNode;
}

export const AuthCard = ({ children }: AuthCardProps) => {
  const { authSettings } = useAuthSettings();
  
  const IconComponent = ICON_COMPONENTS[authSettings.taglineIcon as keyof typeof ICON_COMPONENTS] || Star;
  
  return (
    <Card className="w-full max-w-md mx-auto glass-panel border-0 shadow-xl backdrop-blur-md bg-background/90">
      <CardHeader className="space-y-4 text-center pb-8">
        {/* Enhanced Logo Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative flex items-center justify-center p-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
              <img 
                src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
                alt="Ixty AI Logo" 
                className="h-[5.3rem] w-[5.3rem] relative z-10 animate-heartbeat"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Ixty AI
            </CardTitle>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <IconComponent className="h-4 w-4" />
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
