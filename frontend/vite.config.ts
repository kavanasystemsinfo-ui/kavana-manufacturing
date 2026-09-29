import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Con el prefijo global api/v1 del backend, TODO el tráfico API va ya
      // versionado: la ruta que llega al proxy es la que Express sirve.
      // El destino se puede mover con VITE_API_TARGET: en el VPS el 3001 lo
      // ocupa la demo de Docker, así que el E2E arranca su backend en otro
      // puerto y apunta aquí. Sin la variable, el comportamiento es el de siempre.
      '/api/v1': process.env.VITE_API_TARGET ?? 'http://localhost:3001',
    },
  },
});
