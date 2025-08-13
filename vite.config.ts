
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Plugin to generate version.json during build
const generateVersionPlugin = () => {
  // Create a stable build hash for the session
  const sessionBuildHash = process.env.NODE_ENV === 'production' 
    ? Math.random().toString(36).substr(2, 12)
    : 'dev-stable';
  
  return {
    name: 'generate-version',
    buildStart() {
      const buildTime = new Date().toISOString();
      
      const version = {
        version: "1.0.0",
        buildTime,
        buildHash: sessionBuildHash,
        environment: process.env.NODE_ENV || 'development',
        cacheNames: {
          static: `ixty-ai-static-${sessionBuildHash}`,
          dynamic: `ixty-ai-dynamic-${sessionBuildHash}`
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
      // In development, serve a stable version to prevent constant updates
      server.middlewares.use('/version.json', (req: any, res: any, next: any) => {
        if (process.env.NODE_ENV === 'development') {
          const devVersion = {
            version: "1.0.0-dev",
            buildTime: "2024-01-01T00:00:00.000Z", // Stable timestamp for dev
            buildHash: sessionBuildHash,
            environment: 'development',
            cacheNames: {
              static: `ixty-ai-static-${sessionBuildHash}`,
              dynamic: `ixty-ai-dynamic-${sessionBuildHash}`
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
