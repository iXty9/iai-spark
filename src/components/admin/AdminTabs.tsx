
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminTabsProps {
  webhookContent: ReactNode;
  appSettingsContent: ReactNode;
  userManagementContent: ReactNode;
}

export function AdminTabs({ webhookContent, appSettingsContent, userManagementContent }: AdminTabsProps) {
  return (
    <Tabs defaultValue="app-settings">
      <TabsList className="w-full">
        <TabsTrigger value="app-settings" className="flex-1">App Settings</TabsTrigger>
        <TabsTrigger value="webhooks" className="flex-1">Webhooks</TabsTrigger>
        <TabsTrigger value="users" className="flex-1">User Management</TabsTrigger>
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
    </Tabs>
  );
}
