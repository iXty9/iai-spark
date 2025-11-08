
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  // Remove early theme service initialization - let the coordinated service handle it
  createRoot(rootElement).render(<App />);
}
