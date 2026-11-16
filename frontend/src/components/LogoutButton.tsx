import { cerrarSesion } from '../utils/session.js';

/**
 * «Salir» pequeño para la cabecera de los paneles (junto al selector de
 * diseño). Antes era un botón flotante de 64 px que tapaba el panel.
 */
export function LogoutButton() {
  const empresa = localStorage.getItem('kavana_tenant_name');
  return (
    <button
      type="button"
      onClick={cerrarSesion}
      title={empresa ? `Cerrar sesión (${empresa})` : 'Cerrar sesión'}
      className="rounded-md px-2.5 py-1 min-h-[40px] sm:min-h-0 text-xs font-medium text-slate-300 ring-1 ring-slate-500/60 transition hover:bg-slate-500/20 hover:text-white"
    >
      Salir
    </button>
  );
}
