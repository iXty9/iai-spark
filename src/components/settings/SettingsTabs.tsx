
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsTabsProps {
  appearanceContent: ReactNode;
  backgroundContent: ReactNode;
}

export function SettingsTabs({ appearanceContent, backgroundContent }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="appearance">
      <TabsList className="w-full">
        <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
        <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
      </TabsList>
      
      <TabsContent value="appearance" className="space-y-6 mt-4">
        {appearanceContent}
      </TabsContent>
      
      <TabsContent value="background" className="space-y-6 mt-4">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Background Image</h3>
          {backgroundContent}
        </div>
      </TabsContent>
    </Tabs>
  );
}
