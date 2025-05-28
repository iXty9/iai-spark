
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Image } from 'lucide-react';

interface SettingsTabsProps {
  children: React.ReactNode;
}

export const SettingsTabs = ({ children }: SettingsTabsProps) => {
  return (
    <Tabs defaultValue="appearance" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="appearance" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Appearance</span>
        </TabsTrigger>
        <TabsTrigger value="background" className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          <span className="hidden sm:inline">Background</span>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};
