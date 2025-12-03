
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Generate a unique build hash for this deployment
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
    return Date.now().toString(36);
  }
  return 'dev-stable';
};

const BUILD_HASH = getBuildHash();

// Plugin to generate version.json and inject build hash into sw.js
const generateVersionPlugin = () => {
  return {
    name: 'generate-version',
    buildStart() {
      const buildTime = new Date().toISOString();
      
      const version = {
        version: "1.0.0",
        buildTime,
        buildHash: BUILD_HASH,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
      };
      
      // Write version.json to public directory
      fs.writeFileSync(
        path.resolve(__dirname, 'public/version.json'),
        JSON.stringify(version, null, 2)
      );
      
      console.log('✅ Generated version.json:', version);
    },
    writeBundle() {
      // Inject build hash into sw.js after build
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8');
        content = content.replace('__BUILD_HASH__', BUILD_HASH);
        fs.writeFileSync(swPath, content);
        console.log('✅ Injected build hash into sw.js:', BUILD_HASH);
      }
    },
    configureServer(server: any) {
      // In development, serve a stable version to prevent constant updates
      server.middlewares.use('/version.json', (req: any, res: any, next: any) => {
        const devVersion = {
          version: "1.0.0-dev",
          buildTime: new Date().toISOString(),
          buildHash: BUILD_HASH,
          environment: 'development'
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(JSON.stringify(devVersion, null, 2));
      });
      
      // Also serve sw.js with build hash replaced in dev
      server.middlewares.use('/sw.js', (req: any, res: any, next: any) => {
        const swPath = path.resolve(__dirname, 'public/sw.js');
        if (fs.existsSync(swPath)) {
          let content = fs.readFileSync(swPath, 'utf-8');
          content = content.replace('__BUILD_HASH__', BUILD_HASH);
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(content);
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
