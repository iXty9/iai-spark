
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Moon, Sun, Upload, Palette } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// ThemeSettings interface for localStorage and Supabase
interface ThemeSettings {
  mode: 'light' | 'dark';
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  backgroundImage: string | null;
  backgroundOpacity: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, profile, updateProfile } = useAuth();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  
  // Theme color state
  const [lightTheme, setLightTheme] = useState({
    backgroundColor: '#ffffff',
    primaryColor: '#ea384c',
    textColor: '#000000',
    accentColor: '#9b87f5'
  });
  
  const [darkTheme, setDarkTheme] = useState({
    backgroundColor: '#121212',
    primaryColor: '#ea384c',
    textColor: '#ffffff',
    accentColor: '#9b87f5'
  });

  // Load saved settings from profile or localStorage on mount
  useEffect(() => {
    try {
      // First try to load from profile if user is logged in
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
      } else {
        // Fallback to localStorage
        const savedLightTheme = localStorage.getItem('lightTheme');
        const savedDarkTheme = localStorage.getItem('darkTheme');
        const savedBackgroundImage = localStorage.getItem('backgroundImage');
        const savedBackgroundOpacity = localStorage.getItem('backgroundOpacity');
        
        if (savedLightTheme) {
          setLightTheme(JSON.parse(savedLightTheme));
        }
        
        if (savedDarkTheme) {
          setDarkTheme(JSON.parse(savedDarkTheme));
        }
        
        if (savedBackgroundImage) {
          setBackgroundImage(savedBackgroundImage);
        }
        
        if (savedBackgroundOpacity) {
          setBackgroundOpacity(parseFloat(savedBackgroundOpacity));
        }
      }
      
      // Apply settings to DOM
      applyThemeSettings();
      
    } catch (error) {
      console.error('Error loading saved theme settings:', error);
    }
  }, [profile, user]);

  // Apply theme settings to the document
  const applyThemeSettings = () => {
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
    const root = document.documentElement;
    
    root.style.setProperty('--background-color', currentTheme.backgroundColor);
    root.style.setProperty('--primary-color', currentTheme.primaryColor);
    root.style.setProperty('--text-color', currentTheme.textColor);
    root.style.setProperty('--accent-color', currentTheme.accentColor);
    
    // Apply background image if available
    if (backgroundImage) {
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      
      // Fix: Set the background opacity using CSS variable
      document.documentElement.style.setProperty('--bg-opacity', backgroundOpacity.toString());
      
      // Add the class that uses the CSS variable for background opacity
      document.body.classList.add('with-bg-image');
    } else {
      document.body.style.backgroundImage = 'none';
      document.body.classList.remove('with-bg-image');
    }
  };

  useEffect(() => {
    applyThemeSettings();
  }, [theme, lightTheme, darkTheme, backgroundImage, backgroundOpacity]);

  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLightTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDarkTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result.toString();
        setBackgroundImage(imageUrl);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    try {
      // Create theme settings object
      const themeSettings: ThemeSettings = {
        mode: theme as 'light' | 'dark',
        backgroundColor: theme === 'light' ? lightTheme.backgroundColor : darkTheme.backgroundColor,
        primaryColor: theme === 'light' ? lightTheme.primaryColor : darkTheme.primaryColor,
        textColor: theme === 'light' ? lightTheme.textColor : darkTheme.textColor,
        accentColor: theme === 'light' ? lightTheme.accentColor : darkTheme.accentColor,
        backgroundImage,
        backgroundOpacity: backgroundOpacity.toString()
      };
      
      // Save to localStorage for immediate use
      localStorage.setItem('lightTheme', JSON.stringify(lightTheme));
      localStorage.setItem('darkTheme', JSON.stringify(darkTheme));
      
      if (backgroundImage) {
        localStorage.setItem('backgroundImage', backgroundImage);
      } else {
        localStorage.removeItem('backgroundImage');
      }
      
      localStorage.setItem('backgroundOpacity', backgroundOpacity.toString());
      
      // If user is logged in, save to profile
      if (user) {
        const fullThemeSettings = {
          mode: theme,
          lightTheme,
          darkTheme,
          backgroundImage,
          backgroundOpacity: backgroundOpacity.toString()
        };
        
        await updateProfile({ theme_settings: JSON.stringify(fullThemeSettings) });
      }
      
      // Apply settings immediately
      applyThemeSettings();
      
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
    
    // Clear localStorage
    localStorage.removeItem('lightTheme');
    localStorage.removeItem('darkTheme');
    localStorage.removeItem('backgroundImage');
    localStorage.removeItem('backgroundOpacity');
    
    // If user is logged in, clear profile settings
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
    // Go back to previous page instead of always going to home
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <Label>Theme Mode</Label>
                  </div>
                  <RadioGroup 
                    defaultValue={theme} 
                    className="flex items-center space-x-4"
                    onValueChange={value => setTheme(value as 'light' | 'dark')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="theme-light" />
                      <Label htmlFor="theme-light" className="flex items-center">
                        <Sun className="h-4 w-4 mr-1" />
                        Light
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Label htmlFor="theme-dark" className="flex items-center">
                        <Moon className="h-4 w-4 mr-1" />
                        Dark
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">
                    {theme === 'dark' ? 'Dark Theme Colors' : 'Light Theme Colors'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {theme === 'light' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="backgroundColor">Background Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="backgroundColor"
                              name="backgroundColor"
                              type="color"
                              value={lightTheme.backgroundColor}
                              onChange={handleLightThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={lightTheme.backgroundColor}
                              onChange={handleLightThemeChange}
                              name="backgroundColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryColor">Primary Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="primaryColor"
                              name="primaryColor"
                              type="color"
                              value={lightTheme.primaryColor}
                              onChange={handleLightThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={lightTheme.primaryColor}
                              onChange={handleLightThemeChange}
                              name="primaryColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="textColor"
                              name="textColor"
                              type="color"
                              value={lightTheme.textColor}
                              onChange={handleLightThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={lightTheme.textColor}
                              onChange={handleLightThemeChange}
                              name="textColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accentColor">Accent Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="accentColor"
                              name="accentColor"
                              type="color"
                              value={lightTheme.accentColor}
                              onChange={handleLightThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={lightTheme.accentColor}
                              onChange={handleLightThemeChange}
                              name="accentColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="backgroundColor">Background Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="backgroundColor"
                              name="backgroundColor"
                              type="color"
                              value={darkTheme.backgroundColor}
                              onChange={handleDarkThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={darkTheme.backgroundColor}
                              onChange={handleDarkThemeChange}
                              name="backgroundColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryColor">Primary Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="primaryColor"
                              name="primaryColor"
                              type="color"
                              value={darkTheme.primaryColor}
                              onChange={handleDarkThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={darkTheme.primaryColor}
                              onChange={handleDarkThemeChange}
                              name="primaryColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="textColor"
                              name="textColor"
                              type="color"
                              value={darkTheme.textColor}
                              onChange={handleDarkThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={darkTheme.textColor}
                              onChange={handleDarkThemeChange}
                              name="textColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accentColor">Accent Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="accentColor"
                              name="accentColor"
                              type="color"
                              value={darkTheme.accentColor}
                              onChange={handleDarkThemeChange}
                              className="w-12 h-8"
                            />
                            <Input
                              type="text"
                              value={darkTheme.accentColor}
                              onChange={handleDarkThemeChange}
                              name="accentColor"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="background" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Background Image</h3>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      {backgroundImage ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden">
                          <img
                            src={backgroundImage}
                            alt="Background preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setBackgroundImage(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full h-48 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground">No background image set</p>
                        </div>
                      )}
                    </div>
                    
                    <Button variant="outline" asChild className="w-full">
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Background Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackgroundImageUpload}
                          className="hidden"
                        />
                      </label>
                    </Button>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="opacity">Background Opacity</Label>
                        <span>{Math.round(backgroundOpacity * 100)}%</span>
                      </div>
                      <Slider
                        id="opacity"
                        min={0}
                        max={1}
                        step={0.05}
                        value={[backgroundOpacity]}
                        onValueChange={(value) => setBackgroundOpacity(value[0])}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
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
