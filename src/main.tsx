
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/theme.css'
import { applySiteTitle } from './utils/site-utils.ts'
import { productionThemeService } from './services/production-theme-service.ts'

// Create the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  // Initialize theme service as early as possible
  productionThemeService.initialize().catch(err => {
    console.error("Failed to initialize theme service:", err);
  });
  
  createRoot(rootElement).render(<App />);
  
  // Apply site title from settings
  applySiteTitle().catch(err => {
    console.error("Failed to apply site title:", err);
  });
}
