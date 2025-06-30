
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthCardProps {
  children: React.ReactNode;
}

export const AuthCard = ({ children }: AuthCardProps) => {
  return (
    <Card className="w-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
            alt="Ixty AI Logo" 
            className="h-12 w-12 mr-3"
          />
          <CardTitle className="text-2xl font-bold text-[#ea384c]">Ixty AI</CardTitle>
        </div>
        <CardDescription className="text-center">
          Sign in to your account or create a new one to start chatting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
