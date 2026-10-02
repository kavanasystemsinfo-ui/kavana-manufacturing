import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// El armazón de la aplicación se guarda en el dispositivo para que una recarga
// sin red no deje al operario fuera. El trabajador de servicio solo cachea
// estáticos: los datos de planta siguen en IndexedDB, que se purga al salir.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Sin trabajador de servicio: la aplicación no cargará sin red.', error);
    });
  });
}
