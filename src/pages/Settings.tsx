
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeColors } from '@/types/theme';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, profile, updateProfile } = useAuth();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  
  const [lightTheme, setLightTheme] = useState<ThemeColors>({
    backgroundColor: '#ffffff',
    primaryColor: '#ea384c',
    textColor: '#000000',
    accentColor: '#9b87f5'
  });
  
  const [darkTheme, setDarkTheme] = useState<ThemeColors>({
    backgroundColor: '#121212',
    primaryColor: '#ea384c',
    textColor: '#ffffff',
    accentColor: '#9b87f5'
  });

  useEffect(() => {
    try {
      if (user && profile && profile.theme_settings) {
        try {
          const themeSettings = JSON.parse(profile.theme_settings);
          
          if (themeSettings.mode) {
            setTheme(themeSettings.mode);
          }
          
          if (themeSettings.lightTheme) {
            setLightTheme(themeSettings.lightTheme);
          }
          
          if (themeSettings.darkTheme) {
            setDarkTheme(themeSettings.darkTheme);
          }
          
          if (themeSettings.backgroundImage) {
            setBackgroundImage(themeSettings.backgroundImage);
          }
          
          if (themeSettings.backgroundOpacity !== undefined) {
            setBackgroundOpacity(parseFloat(themeSettings.backgroundOpacity));
          }
        } catch (e) {
          console.error('Error parsing theme settings from profile:', e);
        }
      }
    } catch (error) {
      console.error('Error loading saved theme settings:', error);
    }
  }, [profile, user]);

  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLightTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDarkTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        setBackgroundImage(event.target.result.toString());
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    try {
      const themeSettings = {
        mode: theme,
        lightTheme,
        darkTheme,
        backgroundImage,
        backgroundOpacity: backgroundOpacity.toString()
      };
      
      if (user) {
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
      }
      
      toast({
        title: "Settings saved",
        description: "Your theme settings have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    }
  };

  const handleResetSettings = () => {
    setLightTheme({
      backgroundColor: '#ffffff',
      primaryColor: '#ea384c',
      textColor: '#000000',
      accentColor: '#9b87f5'
    });
    
    setDarkTheme({
      backgroundColor: '#121212',
      primaryColor: '#ea384c',
      textColor: '#ffffff',
      accentColor: '#9b87f5'
    });
    
    setBackgroundImage(null);
    setBackgroundOpacity(0.1);
    
    if (user) {
      updateProfile({ theme_settings: null })
        .then(() => {
          toast({
            title: "Settings reset",
            description: "Your theme settings have been reset to defaults",
          });
        })
        .catch((error) => {
          console.error('Error resetting theme settings in profile:', error);
        });
    } else {
      toast({
        title: "Settings reset",
        description: "Your theme settings have been reset to defaults",
      });
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card>
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
        <CardContent>
          <Tabs defaultValue="appearance">
            <TabsList className="w-full">
              <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
              <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-6 mt-4">
              <AppearanceSettings
                theme={theme}
                lightTheme={lightTheme}
                darkTheme={darkTheme}
                onThemeChange={value => setTheme(value)}
                onLightThemeChange={handleLightThemeChange}
                onDarkThemeChange={handleDarkThemeChange}
              />
            </TabsContent>
            
            <TabsContent value="background" className="space-y-6 mt-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">Background Image</h3>
                <BackgroundSettings
                  backgroundImage={backgroundImage}
                  backgroundOpacity={backgroundOpacity}
                  onBackgroundImageUpload={handleBackgroundImageUpload}
                  onOpacityChange={value => setBackgroundOpacity(value[0])}
                  onRemoveBackground={() => setBackgroundImage(null)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleResetSettings}>
            Reset to Defaults
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleGoBack}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save Changes
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
