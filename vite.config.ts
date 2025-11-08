
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Plugin to generate version.json during build
const generateVersionPlugin = () => {
  // Create a deterministic build hash based on timestamp or git commit
  const getBuildHash = () => {
    if (process.env.NODE_ENV === 'production') {
      // Use git commit hash if available
      const gitHash = process.env.VITE_GIT_COMMIT || 
                      process.env.COMMIT_REF || 
                      process.env.VERCEL_GIT_COMMIT_SHA;
      
      if (gitHash) {
        return gitHash.substring(0, 12);
      }
      
      // Fallback: Use timestamp-based hash (ensures uniqueness per build)
      const timestamp = new Date().toISOString();
      return timestamp.replace(/[-:.TZ]/g, '').substring(0, 14);
    }
    return 'dev-stable';
  };
  
  const sessionBuildHash = getBuildHash();
  
  return {
    name: 'generate-version',
    buildStart() {
      const buildTime = new Date().toISOString();
      
      const version = {
        version: "1.0.0",
        buildTime,
        buildHash: sessionBuildHash,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
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
      
      console.log('✅ Generated version.json:', version);
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
