import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Con el prefijo global api/v1 del backend, TODO el tráfico API va ya
      // versionado: la ruta que llega al proxy es la que Express sirve.
      '/api/v1': 'http://localhost:3001',
    },
  },
});
