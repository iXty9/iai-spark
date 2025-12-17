import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ============================================
// EARLY URL DEBUG - Capture URL state BEFORE React mounts
// This is the earliest possible moment to see if hash tokens exist
// ============================================
const earlyUrlState = {
  href: window.location.href,
  hash: window.location.hash,
  search: window.location.search,
  pathname: window.location.pathname,
  timestamp: new Date().toISOString()
};
console.log('[EARLY DEBUG] Initial URL state BEFORE React:', earlyUrlState);

// Check if this looks like a password reset redirect
if (earlyUrlState.search.includes('mode=reset') || earlyUrlState.pathname.includes('/auth')) {
  console.log('[EARLY DEBUG] Auth page detected - checking for tokens in hash...');
  console.log('[EARLY DEBUG] Hash length:', earlyUrlState.hash.length);
  console.log('[EARLY DEBUG] Hash contains access_token:', earlyUrlState.hash.includes('access_token'));
  console.log('[EARLY DEBUG] Hash contains type=recovery:', earlyUrlState.hash.includes('type=recovery'));
  
  // Log any existing localStorage auth tokens
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('sb-') && key?.includes('auth-token')) {
      console.log('[EARLY DEBUG] Found existing localStorage auth token:', key);
    }
  }
}

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  // Remove early theme service initialization - let the coordinated service handle it
  createRoot(rootElement).render(<App />);
}
