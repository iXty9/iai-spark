import { HighLevelConnectionCard } from './integrations/HighLevelConnectionCard';

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to enhance your experience
        </p>
      </div>
      
      <HighLevelConnectionCard />
      
      {/* Future integrations can be added here */}
    </div>
  );
}