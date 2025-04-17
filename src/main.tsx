
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add viewport meta tag for better mobile compatibility
const meta = document.createElement('meta');
meta.name = 'viewport';
meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
document.getElementsByTagName('head')[0].appendChild(meta);

// Add meta tag to ensure Safari allows images from external domains
const metaCSP = document.createElement('meta');
metaCSP.httpEquiv = 'Content-Security-Policy';
metaCSP.content = "img-src * 'self' data: https:; default-src 'self';";
document.getElementsByTagName('head')[0].appendChild(metaCSP);

createRoot(document.getElementById("root")!).render(<App />);
