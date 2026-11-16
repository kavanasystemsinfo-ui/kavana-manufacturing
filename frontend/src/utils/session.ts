import { purgeLocalData } from '../db/local-db.js';

/** Borra de localStorage todo lo que identifica la sesión. */
export function limpiarSesionLocal(): void {
  localStorage.removeItem('kavana_dev_token');
  localStorage.removeItem('kavana_tenant_id');
  localStorage.removeItem('kavana_user_id');
  localStorage.removeItem('kavana_role');
  localStorage.removeItem('kavana_tenant_name');
  localStorage.removeItem('kavana_workstation_name');
}

/**
 * Cierra la sesión y recarga la aplicación. Recargar (en vez de cambiar solo el
 * estado) mata también los temporizadores y la cola en memoria, y el usuario ve
 * que ha salido de verdad.
 */
export function cerrarSesion(): void {
  limpiarSesionLocal();
  void purgeLocalData();
  window.location.reload();
}
