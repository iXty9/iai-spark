
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, Webhook, Globe, Palette, Server } from 'lucide-react';

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

  const tabItems = [
    { value: "app-settings", label: "App Settings", icon: Settings, shortLabel: "App" },
    { value: "seo", label: "SEO", icon: Globe, shortLabel: "SEO" },
    { value: "theme", label: "Theme", icon: Palette, shortLabel: "Theme" },
    { value: "webhooks", label: "Webhooks", icon: Webhook, shortLabel: "Hooks" },
    { value: "users", label: "Users", icon: Users, shortLabel: "Users" },
    { value: "environment", label: "Environment", icon: Server, shortLabel: "Env" }
  ];

  const getCurrentTabLabel = () => {
    const currentTab = tabItems.find(tab => tab.value === activeTab);
    return currentTab ? currentTab.label : "Select Tab";
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      {/* Desktop tabs */}
      <div className="hidden md:block">
        <TabsList className="w-full grid grid-cols-6">
          {tabItems.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.shortLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden">
        <Select value={activeTab} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={getCurrentTabLabel()} />
          </SelectTrigger>
          <SelectContent>
            {tabItems.map(tab => {
              const Icon = tab.icon;
              return (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
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
