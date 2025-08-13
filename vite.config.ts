
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Plugin to generate version.json during build
const generateVersionPlugin = () => {
  return {
    name: 'generate-version',
    buildStart() {
      const buildTime = new Date().toISOString();
      const buildHash = process.env.NODE_ENV === 'production' 
        ? Math.random().toString(36).substr(2, 12) // Longer hash for prod
        : 'dev-build';
      
      const version = {
        version: "1.0.0",
        buildTime,
        buildHash,
        environment: process.env.NODE_ENV || 'development',
        cacheNames: {
          static: `ixty-ai-static-${buildHash}`,
          dynamic: `ixty-ai-dynamic-${buildHash}`
        }
      };
      
      // Write version.json to public directory
      fs.writeFileSync(
        path.resolve(__dirname, 'public/version.json'),
        JSON.stringify(version, null, 2)
      );
      
      console.log('Generated version.json:', version);
    },
    configureServer(server: any) {
      // In development, regenerate version on each request to version.json
      server.middlewares.use('/version.json', (req: any, res: any, next: any) => {
        if (process.env.NODE_ENV === 'development') {
          const devVersion = {
            version: "1.0.0-dev",
            buildTime: new Date().toISOString(),
            buildHash: `dev-${Date.now()}`,
            environment: 'development',
            cacheNames: {
              static: `ixty-ai-static-dev-${Date.now()}`,
              dynamic: `ixty-ai-dynamic-dev-${Date.now()}`
            }
          };
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify(devVersion, null, 2));
          return;
        }
        next();
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Configure base path for production assets
  base: "./",
  plugins: [
    react(),
    generateVersionPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
