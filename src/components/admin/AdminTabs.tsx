
import React, { ReactNode, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Users, Webhook, Globe, Palette, Server, Shield, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminTabsProps {
  webhookContent: ReactNode;
  appSettingsContent: ReactNode;
  userManagementContent: ReactNode;
  environmentContent: ReactNode;
  seoContent: ReactNode;
  themeContent: ReactNode;
  authenticationContent: ReactNode;
  pwaContent: ReactNode;
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
  authenticationContent,
  pwaContent,
  activeTab = "app-settings", 
  onTabChange 
}: AdminTabsProps) {
  const tabItems = [
    { value: "app-settings", label: "App Settings", icon: Settings, shortLabel: "App" },
    { value: "seo", label: "SEO", icon: Globe, shortLabel: "SEO" },
    { value: "theme", label: "Theme", icon: Palette, shortLabel: "Theme" },
    { value: "pwa", label: "PWA", icon: Smartphone, shortLabel: "PWA" },
    { value: "authentication", label: "Authentication", icon: Shield, shortLabel: "Auth" },
    { value: "webhooks", label: "Webhooks", icon: Webhook, shortLabel: "Hooks" },
    { value: "users", label: "Users", icon: Users, shortLabel: "Users" },
    { value: "environment", label: "Environment", icon: Server, shortLabel: "Env" }
  ];

  const [scrollOffset, setScrollOffset] = useState(0);
  const TABS_PER_VIEW = 5;
  const maxOffset = Math.max(0, tabItems.length - TABS_PER_VIEW);

  const handleValueChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };

  const scrollLeft = () => {
    setScrollOffset(Math.max(0, scrollOffset - 1));
  };

  const scrollRight = () => {
    setScrollOffset(Math.min(maxOffset, scrollOffset + 1));
  };

  const visibleTabs = tabItems.slice(scrollOffset, scrollOffset + TABS_PER_VIEW);

  const getCurrentTabLabel = () => {
    const currentTab = tabItems.find(tab => tab.value === activeTab);
    return currentTab ? currentTab.label : "Select Tab";
  };

  // Auto-scroll to show active tab
  useEffect(() => {
    const activeTabIndex = tabItems.findIndex(tab => tab.value === activeTab);
    if (activeTabIndex !== -1) {
      const currentViewStart = scrollOffset;
      const currentViewEnd = scrollOffset + TABS_PER_VIEW - 1;
      
      if (activeTabIndex < currentViewStart) {
        // Active tab is to the left of current view
        setScrollOffset(activeTabIndex);
      } else if (activeTabIndex > currentViewEnd) {
        // Active tab is to the right of current view
        setScrollOffset(Math.max(0, activeTabIndex - TABS_PER_VIEW + 1));
      }
    }
  }, [activeTab, tabItems, scrollOffset, TABS_PER_VIEW]);

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      {/* Desktop tabs with scrolling */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollLeft}
            disabled={scrollOffset === 0}
            className="flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <TabsList className="flex-1">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1 md:gap-2 min-h-[40px] flex-1">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden lg:inline text-xs">{tab.label}</span>
                  <span className="lg:hidden text-xs">{tab.shortLabel}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <Button
            variant="outline"
            size="sm"
            onClick={scrollRight}
            disabled={scrollOffset === maxOffset}
            className="flex-shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
      
      <TabsContent value="pwa" className="mt-6">
        {pwaContent}
      </TabsContent>
      
      <TabsContent value="authentication" className="mt-6">
        {authenticationContent}
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
