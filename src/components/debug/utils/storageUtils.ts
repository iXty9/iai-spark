
export function collectStorage(setState: any, isDevMode: boolean) {
  if (!isDevMode) return;

  try {
    const appKeys: string[] = [];
    const ls = localStorage;
    const len = ls.length; 
    let tSize = 0;
    for(let i = 0; i < len; i++) {
      const k = ls.key(i);
      if(k && (k.startsWith('app:') || k.startsWith('supabase') || k.startsWith('sb-'))) {
        appKeys.push(k);
        tSize += (ls.getItem(k)?.length || 0);
      }
    }
    let available = null;
    try {
      let tst = '';
      const chunk = 'a'.repeat(1024);
      for(let i = 0; i < 10; i++) {
        tst += chunk;
        ls.setItem('__t', tst);
        if(tst.length >= 1024*1024) break;
      }
      available = tst.length; 
      ls.removeItem('__t');
    } catch {
      available = 0;
    }
    setState((s: any) => { 
      const n = {
        ...s,
        storageInfo: {
          availableSpace: available,
          usedSpace: tSize,
          appKeys,
          errors: []
        }
      }; 
      window.debugState = n; 
      return n; 
    });
  } catch(e: any) {
    setState((s: any) => { 
      const n = {
        ...s,
        storageInfo: {
          ...s.storageInfo, 
          errors: [...(s.storageInfo.errors||[]), e.message]
        }
      };
      window.debugState = n;
      return n;
    });
  }
}
