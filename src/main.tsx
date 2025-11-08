
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Boot start logging
console.log('🚀 Boot start:', new Date().toISOString());

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  // Remove early theme service initialization - let the coordinated service handle it
  console.log('📦 Creating React root');
  createRoot(rootElement).render(<App />);
}
