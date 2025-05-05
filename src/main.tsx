
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { applySiteTitle } from './utils/site-utils.ts'

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  createRoot(rootElement).render(<App />);
  
  // Apply site title from settings
  applySiteTitle().catch(err => {
    console.error("Failed to apply site title:", err);
  });
}

// Remove problematic CSP meta tags that were causing issues
// DO NOT add meta tags with CSP policies here as they're conflicting with headers
