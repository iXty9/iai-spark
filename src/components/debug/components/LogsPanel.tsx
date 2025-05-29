
import React from 'react';

interface LogsPanelProps {
  logs: Array<{timestamp: string, message: string}>;
  consoleLogs: Array<{timestamp: string, type: string, message: string}>;
  maxLog: number;
  maxConsole: number;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  logs,
  consoleLogs,
  maxLog,
  maxConsole
}) => {
  const logsView = (arr: any[], max: number, empty: string, colorFn?: (type: string) => string) => (
    <div className="max-h-32 overflow-y-auto bg-black/40 p-1 rounded text-[10px]">
      {arr.length
        ? arr.map((entry, i) => <div key={i} className="mb-1">
          <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
          {colorFn && entry.type && <span className={colorFn(entry.type)}> [{entry.type}]</span>}: {entry.message}
        </div>)
        : <div className="text-gray-500">{empty}</div>
      }
    </div>
  );

  const smallPanel = (title: string, col: string, body: React.ReactNode) =>
    <div className="col-span-2 mt-2">
      <div className={col + " font-bold mb-1"}>{title}</div>
      <div className="text-[10px]">{body}</div>
    </div>;

  return (
    <>
      {smallPanel('Recent Log Entries ('+logs.length+'/'+maxLog+')',"text-orange-300",logsView(logs,maxLog,"No logs yet"))}
      {smallPanel('Console Logs ('+consoleLogs.length+'/'+maxConsole+')',"text-blue-300",logsView(consoleLogs,maxConsole,"No console logs captured",(t:string)=>(
        t==='error'?' text-red-400':t==='warn'?' text-yellow-400':t==='info'?' text-blue-400':' text-green-400')))}
    </>
  );
};
