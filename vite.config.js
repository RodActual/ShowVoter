import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths work correctly after build
  build: {
    outDir: 'build', // vercel.json outputDirectory
    chunkSizeWarningLimit: 700, // firebase chunk is ~625 kB (187 kB gzipped)
    rollupOptions: {
      output: {
        // Firebase is most of the bundle and changes rarely; a separate chunk caches better.
        manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] }
      }
    }
  }
});