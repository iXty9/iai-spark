
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminTabsProps {
  webhookContent: ReactNode;
  appSettingsContent: ReactNode;
  userManagementContent: ReactNode;
  environmentContent: ReactNode;
  seoContent: ReactNode;
  themeContent: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminTabs({ 
  webhookContent, 
  appSettingsContent, 
  userManagementContent, 
  environmentContent,
  seoContent,
  themeContent,
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
      <TabsList className="w-full grid grid-cols-6">
        <TabsTrigger value="app-settings">App Settings</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="environment">Environment</TabsTrigger>
      </TabsList>
      
      <TabsContent value="app-settings" className="mt-6">
        {appSettingsContent}
      </TabsContent>
      
      <TabsContent value="seo" className="mt-6">
        {seoContent}
      </TabsContent>
      
      <TabsContent value="theme" className="mt-6">
        {themeContent}
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
