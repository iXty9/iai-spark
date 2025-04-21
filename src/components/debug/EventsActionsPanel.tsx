
import React from "react";

export function EventsActionsPanel({
  lastAction,
  lastError,
  timestamp
}: {
  lastAction: string;
  lastError: string | null;
  timestamp: string;
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
      <div className="col-span-2 text-gray-400 text-[10px]">{timestamp}</div>
    </>
  );
}
