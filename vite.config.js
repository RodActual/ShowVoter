import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths work correctly after build
  build: {
    outDir: 'build' // Vite defaults to 'dist', but we keep 'build' for Firebase Hosting compatibility
  }
});