
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminTabsProps {
  webhookContent: ReactNode;
  appSettingsContent: ReactNode;
  userManagementContent: ReactNode;
  environmentContent: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminTabs({ 
  webhookContent, 
  appSettingsContent, 
  userManagementContent, 
  environmentContent,
  activeTab = "app-settings", 
  onTabChange 
}: AdminTabsProps) {
  const handleValueChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      <TabsList className="w-full">
        <TabsTrigger value="app-settings" className="flex-1">App Settings</TabsTrigger>
        <TabsTrigger value="webhooks" className="flex-1">Webhooks</TabsTrigger>
        <TabsTrigger value="users" className="flex-1">User Management</TabsTrigger>
        <TabsTrigger value="environment" className="flex-1">Environment</TabsTrigger>
      </TabsList>
      
      <TabsContent value="app-settings" className="mt-6">
        {appSettingsContent}
      </TabsContent>
      
      <TabsContent value="webhooks" className="mt-6">
        {webhookContent}
      </TabsContent>
      
      <TabsContent value="users" className="mt-6">
        {userManagementContent}
      </TabsContent>
      
      <TabsContent value="environment" className="mt-6">
        {environmentContent}
      </TabsContent>
    </Tabs>
  );
}
