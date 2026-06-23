import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Webhook, Sparkles } from 'lucide-react';
import { WebhookSettings } from '@/components/admin/webhooks/WebhookSettings';
import { HarnessEnableToggle } from './HarnessEnableToggle';

export function AISettings() {
  const [subTab, setSubTab] = useState<string>('webhooks');

  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full max-w-md">
        <TabsTrigger value="webhooks" className="flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          <span>Webhooks</span>
        </TabsTrigger>
        <TabsTrigger value="hermes" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Hermes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="webhooks" className="space-y-6 mt-6">
        <HarnessEnableToggle harnessKey="webhooks" harnessName="Webhooks" defaultEnabled={true} />
        <WebhookSettings />
      </TabsContent>

      <TabsContent value="hermes" className="space-y-6 mt-6">
        <HarnessEnableToggle harnessKey="hermes" harnessName="Hermes" defaultEnabled={false} />
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Hermes Configuration</CardTitle>
            <CardDescription>
              Configuration for the Hermes harness will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
