import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppSettingBoolean } from '@/hooks/use-app-setting-boolean';
import { updateAppSetting } from '@/services/admin/settingsService';
import { settingsCacheService } from '@/services/settings-cache-service';
import { useToast } from '@/hooks/use-toast';

interface HarnessEnableToggleProps {
  harnessKey: string;
  harnessName: string;
  defaultEnabled?: boolean;
}

export function HarnessEnableToggle({ harnessKey, harnessName, defaultEnabled = true }: HarnessEnableToggleProps) {
  const settingKey = `ai_harness_${harnessKey}_enabled`;
  const { value, isLoading } = useAppSettingBoolean(settingKey, defaultEnabled);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      await updateAppSetting(settingKey, checked ? 'true' : 'false');
      await settingsCacheService.refresh();
      toast({
        title: `${harnessName} ${checked ? 'enabled' : 'disabled'}`,
        description: `The ${harnessName} harness is now ${checked ? 'available' : 'unavailable'}.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to update setting',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Enable {harnessName}</CardTitle>
        <CardDescription>
          When disabled, this harness is unavailable to all users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor={`toggle-${harnessKey}`} className="text-sm">
            {value ? 'Enabled' : 'Disabled'}
          </Label>
          <Switch
            id={`toggle-${harnessKey}`}
            checked={value}
            disabled={isLoading || saving}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
