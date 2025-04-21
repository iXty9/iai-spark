
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
          <span className="text-green-400">Webhook Response:</span>
          <pre className="text-[10px] overflow-x-auto max-h-20 bg-black/50 p-1 mt-1">
            {typeof lastWebhookResponse === 'object' 
              ? JSON.stringify(lastWebhookResponse, null, 2)
              : lastWebhookResponse}
          </pre>
        </div>
      )}
      
      <div className="col-span-2 text-gray-400 text-[10px]">{timestamp}</div>
    </>
  );
}
