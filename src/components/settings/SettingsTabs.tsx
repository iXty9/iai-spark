
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsTabsProps {
  children: ReactNode;
  defaultValue?: string;
}

export function SettingsTabs({ children, defaultValue = "appearance" }: SettingsTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="background">Background</TabsTrigger>
        <TabsTrigger value="import-export">Import/Export</TabsTrigger>
      </TabsList>
      
      {children}
    </Tabs>
  );
}
