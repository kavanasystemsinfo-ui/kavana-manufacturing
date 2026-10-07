import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': process.env.VITE_API_TARGET ?? 'http://localhost:3001',
    },
  },
  preview: {
    port: 4174,
    proxy: {
      '/api/v1': process.env.VITE_API_TARGET ?? 'http://localhost:3001',
    },
  },
  // Force esbuild instead of rolldown for compatibility
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
  },
});