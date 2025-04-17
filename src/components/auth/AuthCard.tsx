
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthCardProps {
  children: React.ReactNode;
}

export const AuthCard = ({ children }: AuthCardProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
              alt="Ixty AI Logo" 
              className="h-12 w-12 mr-3"
            />
            <CardTitle className="text-2xl font-bold text-[#ea384c]">Ixty AI</CardTitle>
          </div>
          <CardDescription>
            Sign in to your account or create a new one to start chatting.
          </CardDescription>
        </CardHeader>
        {children}
      </Card>
    </div>
  );
};
