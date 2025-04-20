
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { UserRound, Mail, Key, ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    username: '',
    phone_number: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(registerData.email, registerData.password, registerData.username, registerData.phone_number);
      // Don't navigate - user needs to confirm email first
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="register-email" 
              name="email" 
              type="email" 
              placeholder="your@email.com" 
              required 
              value={registerData.email}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="username" 
              name="username" 
              required
              placeholder="Choose a username"
              value={registerData.username}
              onChange={handleChange}
              className="pl-10"
              minLength={3}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="phone_number" 
              name="phone_number" 
              type="tel"
              placeholder="+1234567890"
              value={registerData.phone_number}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="register-password" 
              name="password" 
              type="password" 
              required 
              value={registerData.password}
              onChange={handleChange}
              className="pl-10"
              minLength={6}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          type="submit" 
          className="w-full bg-[#ea384c] hover:bg-[#dd3333]" 
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </CardFooter>
    </form>
  );
};
