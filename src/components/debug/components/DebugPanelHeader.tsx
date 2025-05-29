
import React from 'react';
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardCheck, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface DebugPanelHeaderProps {
  copied: boolean;
  isExpanded: boolean;
  isSending: boolean;
  sendingStatus: string;
  onCopy: () => void;
  onToggleExpand: () => void;
  onSend: () => void;
}

export const DebugPanelHeader: React.FC<DebugPanelHeaderProps> = ({
  copied,
  isExpanded,
  isSending,
  sendingStatus,
  onCopy,
  onToggleExpand,
  onSend
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-red-400">DEBUG PANEL</h3>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={onSend} 
            disabled={isSending} 
            title={isSending ? sendingStatus || "Sending..." : "Send Bug Report"}
          >
            <Send size={16} className={isSending ? "animate-pulse" : ""}/>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={onCopy} 
            title="Copy debug info to clipboard"
          >
            {copied ? <ClipboardCheck size={16}/> : <Clipboard size={16}/>}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={onToggleExpand} 
            title={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
          </Button>
        </div>
      </div>
      {isSending && sendingStatus && (
        <div className="text-blue-400 text-[10px] mb-1">{sendingStatus}</div>
      )}
    </>
  );
};
