import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths work correctly after build
  server: {
    proxy: {
      // Forwards API/WebSocket calls to the self-hosted server (see /server) during dev.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:4000', ws: true }
    }
  },
  build: {
    outDir: 'build' // The /server static-file server expects the build here in production.
  }
});