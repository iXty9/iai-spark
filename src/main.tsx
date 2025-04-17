
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add viewport meta tag for better mobile compatibility
const meta = document.createElement('meta');
meta.name = 'viewport';
meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
document.getElementsByTagName('head')[0].appendChild(meta);

// Add meta tag to ensure mobile browsers allow images from external domains
const metaCSP = document.createElement('meta');
metaCSP.httpEquiv = 'Content-Security-Policy';
metaCSP.content = "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; img-src * 'self' data: blob: https:; connect-src * 'self' https: wss:;";
document.getElementsByTagName('head')[0].appendChild(metaCSP);

createRoot(document.getElementById("root")!).render(<App />);
