
import React from 'react';

interface StatusInfoPanelProps {
  state: any;
}

export const StatusInfoPanel: React.FC<StatusInfoPanelProps> = ({ state }) => {
  const row = (k: string, v: any) => <div><span className="text-yellow-300">{k}:</span> {v}</div>;
  
  const smallPanel = (title: string, col: string, body: React.ReactNode) =>
    <div className="col-span-2 mt-2">
      <div className={col + " font-bold mb-1"}>{title}</div>
      <div className="text-[10px]">{body}</div>
    </div>;

  return (
    <>
      {smallPanel('Storage Info',"text-purple-300",<>
        <div><span className="text-purple-200">App Keys:</span> {state.storageInfo.appKeys.length}</div>
        <div><span className="text-purple-200">Used Space:</span> {state.storageInfo.usedSpace?Math.round(state.storageInfo.usedSpace/1024)+' KB':'Unknown'}</div>
        {!!state.storageInfo.errors.length&&<div className="text-red-400">Storage Errors: {state.storageInfo.errors.join(', ')}</div>}
      </>)}
      {smallPanel('Supabase Status',"text-green-300",<>
        <div><span className="text-green-200">Connection:</span> {state.supabaseInfo.connectionStatus}</div>
        <div><span className="text-green-200">Auth Status:</span> {state.supabaseInfo.authStatus}</div>
        <div><span className="text-green-200">Environment:</span> {state.supabaseInfo.environment||'Unknown'}</div>
        {state.supabaseInfo.lastError&&<div className="text-red-400">Last Error: {state.supabaseInfo.lastError}</div>}
      </>)}
    </>
  );
};
