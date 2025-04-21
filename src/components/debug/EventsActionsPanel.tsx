
import React from "react";

export function EventsActionsPanel({
  lastAction,
  lastError,
  timestamp,
  lastWebhookResponse = null
}: {
  lastAction: string;
  lastError: string | null;
  timestamp: string;
  lastWebhookResponse?: any;
}) {
  // Format webhook response for display
  const formatWebhookResponse = (response: any) => {
    if (!response) return null;
    return typeof response === 'object' ? JSON.stringify(response, null, 2) : response;
  };
  
  return (
    <>
      <div className="col-span-2 font-bold text-orange-300">Events & Actions</div>
      <div className="col-span-2">
        <span className="text-orange-200">Last Action:</span> {lastAction}
      </div>
      {lastError && (
        <div className="col-span-2">
          <span className="text-red-400">Error:</span> {lastError}
        </div>
      )}
      
      {lastWebhookResponse && (
        <div className="col-span-2">
          <span className="text-green-400">Raw Webhook Response:</span>
          <pre className="text-[10px] overflow-x-auto max-h-20 bg-black/50 p-1 mt-1">
            {formatWebhookResponse(lastWebhookResponse)}
          </pre>
        </div>
      )}
      
      <div className="col-span-2 text-gray-400 text-[10px]">{timestamp}</div>
    </>
  );
}
