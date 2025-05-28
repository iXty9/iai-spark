import React, { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardCheck, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { BrowserInfoPanel } from './BrowserInfoPanel';
import { DomInfoPanel } from './DomInfoPanel';
import { EventsActionsPanel } from './EventsActionsPanel';
import { toast } from "@/hooks/use-toast";
import { sendDebugInfo } from '@/utils/debug';

const MAX_LOG = 100, MAX_CONSOLE = 50;
const nowISO = () => new Date().toISOString();

const getState = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && /safari/i.test(userAgent);
  return {
    screen: 'Initializing...',
    messagesCount: 0, isLoading: false, hasInteracted: false, isTransitioning: false,
    lastAction: 'None', lastError: null, timestamp: nowISO(),
    inputState: 'Ready', authState: 'Unknown', lastWebhookCall: null, lastWebhookResponse: null,
    browserInfo: {
      userAgent, platform: navigator?.platform, viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio, isIOSSafari: isIOS
    },
    performanceInfo: {
      memory: (performance)?.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : undefined,
      navigationTiming: performance.timing ? {
        loadEventEnd: performance.timing.loadEventEnd,
        domComplete: performance.timing.domComplete
      } : undefined,
      fps: 0
    },
    domInfo: {
      bodyChildren: document.body?.children.length || 0,
      totalElements: document.getElementsByTagName('*').length,
      inputElements: document.getElementsByTagName('input').length
    },
    supabaseInfo: {
      connectionStatus: 'unknown', lastConnectionAttempt: null, connectionLatency: null,
      authStatus: 'unknown', retryCount: 0, lastError: null, environment: null, isInitialized: false
    },
    bootstrapInfo: { stage: 'not_started', startTime: null, completionTime: null, steps: [], lastError: null },
    environmentInfo: {
      type: null,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      publicVars: {}
    },
    storageInfo: { availableSpace: null, usedSpace: null, appKeys: [], errors: [] },
    consoleLogs: []
  }
};

const logTypes = ['log','warn','info','error'];

export const StateDebugPanel = ({
  messages, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, lastWebhookCall = null
}) => {
  const { isDevMode } = useDevMode();
  const [state, setState] = useState(getState);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setExp] = useState(true);
  const [fps, setFps] = useState(0);
  const [lastWebhookResponse, setWebhookResp] = useState(null);
  const [isSending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const addLog = m => setLogs(l => [{timestamp: nowISO(), message: m}, ...l].slice(0, MAX_LOG));
  const addConsole = (type, args) => {
    const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    setConsoleLogs(l => ([{timestamp:nowISO(),type, message:msg},...l]).slice(0,MAX_CONSOLE));
    window.debugState && (window.debugState.consoleLogs=consoleLogs);
  };

  const events = [
    ['chatDebug', e=>{ addLog(e.detail.lastAction||'Debug event');
        setState(s=>{ let ns={...s,...e.detail,timestamp:nowISO()}; window.debugState=ns; return ns;}); }],
    ['webhookCall',e=>{if(e.detail.status==='RESPONSE_RECEIVED'){ setWebhookResp(e.detail.responseData); addLog(`Webhook response: ${e.detail.webhookType||'Unknown'}`)} }],
    ['supabaseConnection',e=>{
      const d=e.detail; addLog(`Supabase connection: ${d.status}${d.error?'(Error: '+d.error+')':''}`);
      setState(s=>{ let ns={...s,supabaseInfo:{...s.supabaseInfo,...d, lastConnectionAttempt:d.timestamp||nowISO(),retryCount:d.status==='connecting'?(s.supabaseInfo.retryCount||0)+1:s.supabaseInfo.retryCount,isInitialized:d.status==='connected'},timestamp:nowISO()}; window.debugState=ns; return ns; });
    }],
    ['bootstrapProcess',e=>{
      const d=e.detail; addLog(`Bootstrap: ${d.stage}${d.error?'(Error: '+d.error+')':''}`);
      setState(s=>{ let steps=[...(s.bootstrapInfo.steps||[])]; d.step&&steps.push(d.step);
        let ns={...s,bootstrapInfo:{...s.bootstrapInfo, stage:d.stage, startTime: s.bootstrapInfo.startTime||d.timestamp||nowISO(), completionTime:d.stage==='completed'?(d.timestamp||nowISO()):s.bootstrapInfo.completionTime, steps, lastError:d.error||s.bootstrapInfo.lastError},timestamp:nowISO()}; window.debugState=ns; return ns; }); }
    ],
  ];

  // One compact event + console log effect  
  useEffect(()=>{
    logTypes.forEach(type=>{
      const fn = console[type];
      console[type]=function(){addConsole(type,arguments);fn.apply(console,arguments)};
    });
    events.forEach(([n,cb])=>window.addEventListener(n,cb));
    collectStorage();
    const si = setInterval(collectStorage, 3e4), fpsLoop = (()=>{let f, l=performance.now();const loop=()=>{let n=performance.now(),d=n-l;setFps(d>0?Math.min(60,Math.round(1e3/d)):0);l=n;f=requestAnimationFrame(loop)};f=requestAnimationFrame(loop); return ()=>cancelAnimationFrame(f) })();
    return ()=>{ events.forEach(([n,cb])=>window.removeEventListener(n,cb)); logTypes.forEach(type=>{console[type]=console['_'+type]}); clearInterval(si); fpsLoop(); }
    // eslint-disable-next-line
  },[]);

  // Store orig. console (preserve only once)
  useEffect(()=>{ logTypes.forEach(t=>console['_'+t]=console[t]); return ()=>{}; },[]);

  function collectStorage(){
    try {
      const appKeys=[],ls=localStorage, len=ls.length; let tSize=0;
      for(let i=0;i<len;i++){const k=ls.key(i);if(k&&(k.startsWith('app:')||k.startsWith('supabase')||k.startsWith('sb-'))){appKeys.push(k);tSize+=(ls.getItem(k)?.length||0);}}
      let available=null;
      try{
        let tst='',chunk='a'.repeat(1024);
        for(let i=0;i<10;i++){tst+=chunk;ls.setItem('__t',tst);if(tst.length>=1024*1024)break;}
        available=tst.length; ls.removeItem('__t');
      } catch{available=0;}
      setState(s=>{ const n={...s,storageInfo:{availableSpace:available,usedSpace:tSize,appKeys,errors:[]}}; window.debugState=n; return n; });
    }catch(e){
      setState(s=>{ const n={...s,storageInfo:{...s.storageInfo, errors:[...(s.storageInfo.errors||[]),e.message]}};window.debugState=n;return n;});
    }
  }

  // All quick state sync
  useEffect(()=>{
    setState(s=>({
      ...s,
      screen: messages.length===0?'Welcome Screen':'Chat Screen',
      messagesCount: messages.length,isLoading,hasInteracted,lastWebhookCall,lastWebhookResponse,
      inputState: isLoading?'Disabled':message.trim()?'Ready to Send':'Empty',
      authState: isAuthLoading?'Loading...':isAuthenticated?'Authenticated':'Not Authenticated',
      browserInfo: {...s.browserInfo,viewport:{width:window.innerWidth,height:window.innerHeight}},
      performanceInfo: {...s.performanceInfo,
        memory: (performance.memory) ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : undefined, fps },
      domInfo: {
        bodyChildren: document.body?.children.length||0,
        totalElements: document.getElementsByTagName('*').length,
        inputElements: document.getElementsByTagName('input').length
      }
    }));
    // eslint-disable-next-line
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps, lastWebhookCall, lastWebhookResponse]);

  useEffect(()=>{const onResize=()=>setState(s=>({...s,browserInfo:{...s.browserInfo,viewport:{width:window.innerWidth,height:window.innerHeight}}})); window.addEventListener('resize',onResize); return ()=>window.removeEventListener('resize',onResize)},[]);

  // Panel handlers
  const copy = ()=>{navigator.clipboard.writeText(JSON.stringify(state,null,2)).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2e3)}).catch(console.error)};
  const send = async()=>{
    setSending(true);
    try{
      const dbg=(window.debugState)||state, kf=k=>k.startsWith('app:')||k.startsWith('supabase')||k.startsWith('sb-');
      const info={
        ...dbg, timestamp: nowISO(), logs: logs.slice(0,20), consoleLogs: consoleLogs.slice(0,50),
        userAgent: state.browserInfo.userAgent, url: window.location.href,
        localStorage:{ keys: Object.keys(localStorage).filter(kf), totalItems: localStorage.length },
        sessionStorage:{ keys: Object.keys(sessionStorage).filter(kf), totalItems: sessionStorage.length }
      };
      const result=await sendDebugInfo(info);
      if(result.success){toast({title:"Debug Info Sent",description:"Successfully sent debug info to webhook"}); addLog("Debug info sent to webhook");}
      else throw new Error(result.error);
    }catch(e){toast({variant:"destructive",title:"Failed to Send Debug Info",description:e?.message}); addLog(`Error sending debug info: ${e?.message}`);}
    finally{setSending(false)}
  };
  if (!isDevMode) return null;
  // Helper UI render row
  const row=(k,v)=><div><span className="text-yellow-300">{k}:</span> {v}</div>;
  const smallPanel=(title,col,body)=>
    <div className="col-span-2 mt-2">
      <div className={col+" font-bold mb-1"}>{title}</div>
      <div className="text-[10px]">{body}</div>
    </div>;
  const logsView = (arr, max, empty, colorFn) => (
    <div className="max-h-32 overflow-y-auto bg-black/40 p-1 rounded text-[10px]">
      {arr.length
        ? arr.map((entry, i) => <div key={i} className="mb-1">
          <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
          {colorFn && <span className={colorFn(entry.type)}> [{entry.type}]</span> }: {entry.message}
        </div>)
        : <div className="text-gray-500">{empty}</div>
      }
    </div>
  );

  return <div className="fixed left-0 w-full bg-black/90 text-white p-2 z-[9999] font-mono text-xs rounded-t-md border border-gray-700"
    style={{bottom: messages.length>0?'80px':'10px', maxHeight: isExpanded?'40vh':'32px', overflow:isExpanded?'auto':'hidden', transition:'all .3s ease'}}
  >
    <div className="flex justify-between items-center mb-1">
      <h3 className="font-bold text-red-400">DEBUG PANEL</h3>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={send} disabled={isSending} title="Send debug info to webhook"><Send size={16} className={isSending ? "animate-pulse" : ""}/></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={copy} title="Copy debug info to clipboard">{copied?<ClipboardCheck size={16}/>:<Clipboard size={16}/>}</Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={()=>setExp(e=>!e)} title={isExpanded ? "Collapse panel" : "Expand panel"}>{isExpanded?<ChevronDown size={16}/>:<ChevronUp size={16}/>}</Button>
      </div>
    </div>
    {isExpanded && (
      <div className="grid grid-cols-2 gap-1">
        {row('Current Screen', state.screen)}
        {row('Messages', state.messagesCount)}
        {row('Loading', `${state.isLoading}`)}
        {row('Has Interacted', `${state.hasInteracted}`)}
        {row('Input State', state.inputState)}
        {row('Auth', state.authState)}
        {state.lastWebhookCall && <div className="col-span-2"><span className="text-green-400">Last Webhook:</span> {state.lastWebhookCall}</div>}
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <PerformanceMetrics fps={state.performanceInfo.fps??0} memory={state.performanceInfo.memory} />
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <BrowserInfoPanel browserInfo={state.browserInfo} />
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <DomInfoPanel domInfo={state.domInfo}/>
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <EventsActionsPanel lastAction={state.lastAction} lastError={state.lastError} timestamp={state.timestamp} lastWebhookResponse={state.lastWebhookResponse}/>
        {smallPanel('Recent Log Entries ('+logs.length+'/'+MAX_LOG+')',"text-orange-300",logsView(logs,MAX_LOG,"No logs yet"))}
        {smallPanel('Console Logs ('+consoleLogs.length+'/'+MAX_CONSOLE+')',"text-blue-300",logsView(consoleLogs,MAX_CONSOLE,"No console logs captured",t=>(
          t==='error'?' text-red-400':t==='warn'?' text-yellow-400':t==='info'?' text-blue-400':' text-green-400')))}
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
      </div>
    )}
  </div>
};