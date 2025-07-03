import React, { useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Play, Trash2, Volume2, AlertCircle } from 'lucide-react';
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
      // Test the file first
      const canPlay = await testSound(file);
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
    await playTestSound(soundType);
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

  const handleVolumeChange = async (value: number[]) => {
    const volume = value[0];
    const success = await updateSettings({ volume });
    
    if (!success) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update volume. Please try again.",
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {soundType === 'toast_notification' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
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
            <div className="text-sm text-muted-foreground">
              Uploading sound file...
            </div>
          )}

          {hasSound && (
            <div className="text-sm text-muted-foreground">
              ✓ Custom sound uploaded
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Global Sound Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Sound Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Volume</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round((settings?.volume ?? 0.7) * 100)}%
              </span>
            </div>
            <Slider
              value={[settings?.volume ?? 0.7]}
              onValueChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
              disabled={!settings?.sounds_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Format Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
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