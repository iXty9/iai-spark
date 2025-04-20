
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  createRoot(rootElement).render(<App />);
}

// Remove problematic CSP meta tags that were causing issues
// DO NOT add meta tags with CSP policies here as they're conflicting with headers
