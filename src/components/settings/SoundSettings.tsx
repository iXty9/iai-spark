import React, { useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Play, Trash2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { useSoundSettings } from '@/hooks/use-sound-settings';
import { useToast } from '@/hooks/use-toast';
import { SoundType } from '@/types/sound';
import { cn } from '@/lib/utils';

export function SoundSettings() {
  const { toast } = useToast();
  const {
    settings,
    isLoading,
    isUploading,
    uploadingType,
    updateSettings,
    uploadSound,
    removeSound,
    testSound,
    validateFile,
    playTestSound
  } = useSoundSettings();

  const fileInputRefs = {
    toast_notification: useRef<HTMLInputElement>(null),
    chat_message: useRef<HTMLInputElement>(null)
  };

  const handleFileUpload = async (soundType: SoundType, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: validation.error,
      });
      return;
    }

    try {
      // Test the file first at max volume
      const canPlay = await testSound(file, 1.0);
      if (!canPlay) {
        toast({
          variant: "destructive",
          title: "Invalid audio file",
          description: "The selected file cannot be played. Please try a different file.",
        });
        return;
      }

      const success = await uploadSound(file, soundType);
      
      if (success) {
        toast({
          title: "Sound uploaded",
          description: `${soundType === 'toast_notification' ? 'Notification' : 'Chat message'} sound updated successfully`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Failed to upload sound file. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while uploading the sound file.",
      });
    }

    // Reset file input
    if (fileInputRefs[soundType].current) {
      fileInputRefs[soundType].current.value = '';
    }
  };

  const handleRemoveSound = async (soundType: SoundType) => {
    const success = await removeSound(soundType);
    
    if (success) {
      toast({
        title: "Sound removed",
        description: `${soundType === 'toast_notification' ? 'Notification' : 'Chat message'} sound removed successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: "Failed to remove sound. Please try again.",
      });
    }
  };

  const handlePlayTest = async (soundType: SoundType) => {
    const success = await playTestSound(soundType);
    
    if (!success) {
      toast({
        variant: "destructive",
        title: "Test failed",
        description: "Unable to play the test sound. Check your sound settings and try again.",
      });
    } else {
      toast({
        title: "Test successful",
        description: `${soundType === 'toast_notification' ? 'Notification' : 'Chat message'} sound played successfully`,
      });
    }
  };

  const handleToggleSounds = async (enabled: boolean) => {
    const success = await updateSettings({ sounds_enabled: enabled });
    
    if (!success) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update sound settings. Please try again.",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const renderSoundControl = (
    soundType: SoundType,
    title: string,
    description: string
  ) => {
    const hasSound = soundType === 'toast_notification' 
      ? !!settings?.toast_notification_sound 
      : !!settings?.chat_message_sound;

    return (
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            {soundType === 'toast_notification' ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-sm font-medium text-foreground">{title}</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRefs[soundType]}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                onChange={(e) => handleFileUpload(soundType, e.target.files)}
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRefs[soundType].current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {hasSound ? 'Replace' : 'Upload'} Sound
              </Button>

              {hasSound && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayTest(soundType)}
                    disabled={isUploading}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Test
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveSound(soundType)}
                    disabled={isUploading}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </>
              )}
            </div>

            {isUploading && uploadingType === soundType && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                Uploading sound file...
              </div>
            )}

            {hasSound && !isUploading && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                Custom sound uploaded
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Modern Header with Mobile-First Design */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Volume2 className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Sound Settings</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Customize audio notifications and upload your own sound files for a personalized experience.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Sound Toggle */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">Sound Controls</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sounds-enabled" className="text-base font-medium">
                Enable Sounds
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all notification sounds
              </p>
            </div>
            <Switch
              id="sounds-enabled"
              checked={settings?.sounds_enabled ?? true}
              onCheckedChange={handleToggleSounds}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Format Info */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Upload custom sounds in .mp3 or .wav format. Maximum file size is 1MB per sound.
        </AlertDescription>
      </Alert>

      {/* Sound Controls */}
      <div className="space-y-4">
        {renderSoundControl(
          'toast_notification',
          'Toast Notifications',
          'Sound played when you receive toast notifications'
        )}

        {renderSoundControl(
          'chat_message',
          'Chat Messages',
          'Sound played when you receive new chat messages'
        )}
      </div>
    </div>
  );
}