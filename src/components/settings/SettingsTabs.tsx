
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsTabsProps {
  children: ReactNode;
}

export function SettingsTabs({ children }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="appearance">
      <TabsList className="w-full">
        <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
        <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
        <TabsTrigger value="import-export" className="flex-1">Import/Export</TabsTrigger>
      </TabsList>
      
      {children}
    </Tabs>
  );
}
