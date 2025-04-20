
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add viewport meta tag for better mobile compatibility
const meta = document.createElement('meta');
meta.name = 'viewport';
meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
document.getElementsByTagName('head')[0].appendChild(meta);

// Add meta tag with updated CSP to handle Cloudflare resources
const metaCSP = document.createElement('meta');
metaCSP.httpEquiv = 'Content-Security-Policy';
metaCSP.content = "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; img-src * 'self' data: blob: https:; connect-src * 'self' https: wss:; script-src * 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src * 'self' 'unsafe-inline';";
document.getElementsByTagName('head')[0].appendChild(metaCSP);

// Add meta tag to disable SRI checking for Cloudflare resources
const metaCSPReport = document.createElement('meta');
metaCSPReport.httpEquiv = 'Content-Security-Policy-Report-Only';
metaCSPReport.content = "require-sri-for script style;";
document.getElementsByTagName('head')[0].appendChild(metaCSPReport);

createRoot(document.getElementById("root")!).render(<App />);
