
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
      const buildHash = Math.random().toString(36).substr(2, 9);
      
      const version = {
        version: "1.0.0",
        buildTime,
        buildHash,
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
