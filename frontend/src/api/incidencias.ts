// API de sesiones de foto de incidencias (flujo QR + móvil).
// 1. El operario abre el modal → createUploadSession() → QR con la URL.
// 2. El móvil escanea y sube la foto a uploadMobilePhoto(sessionId, file).
// 3. El modal hace polling de getUploadSession(sessionId) y, cuando la sesión
//    llega con has_photo, usa photo_data_url directamente como <img src>.
//
// Todo pasa por callApiWithTimeout (auth automático); la única excepción es la
// subida móvil, que es pública y usa FormData (fetch añade el boundary).
import { callApiWithTimeout } from './client.js';

const API_BASE = '/api';

export interface UploadSession {
  session_id: string;
  status: 'pending' | 'uploaded' | 'used' | 'expired';
  expires_at: string;
  has_photo: boolean;
  incidencia_id: string | null;
  photo_data_url?: string | null;
}

export async function createUploadSession(): Promise<UploadSession> {
  return callApiWithTimeout<UploadSession>(`${API_BASE}/incidencias/upload-session`, {
    method: 'POST',
  });
}

export async function getUploadSession(sessionId: string): Promise<UploadSession> {
  return callApiWithTimeout<UploadSession>(`${API_BASE}/incidencias/upload-session/${sessionId}`);
}

/**
 * Subida desde el móvil (endpoint público, el sessionId es la credencial).
 * FormData: NO se fija Content-Type para que fetch añada el boundary correcto.
 */
export async function uploadMobilePhoto(sessionId: string, file: File): Promise<{ ok: boolean }> {
  const form = new FormData();
  form.append('foto', file);
  const res = await fetch(`${API_BASE}/incidencias/upload-mobile/${sessionId}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    let message = `Error al subir la foto (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data.message) {
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      }
    } catch {
      // sin body JSON: mantener el mensaje por defecto
    }
    throw new Error(message);
  }
  return res.json();
}
