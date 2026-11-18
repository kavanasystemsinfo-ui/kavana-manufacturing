const API_TIMEOUT_MS = 15000;

/** Lee el token guardado; sin sesión devuelve null (nunca un token falso). */
export function leerToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('kavana_dev_token');
}

/**
 * `callApiWithTimeout` lanza `SesionCaducadaError` cuando el servidor responde
 * 401: la sesión terminó y seguir enviando el token muerto solo enmascara el
 * problema. Quien la capture debe limpiar la sesión y volver al login.
 */
export class SesionCaducadaError extends Error {
  constructor() {
    super('La sesión ha caducado. Vuelve a entrar.');
    this.name = 'SesionCaducadaError';
  }
}

/** `timeoutMs` permite esperar más en las cargas de pantalla, donde el servidor puede estar arrancando en frío. */
export async function callApiWithTimeout<T>(url: string, options: RequestInit = {}, timeoutMs: number = API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const token = leerToken();
  const authHeader: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(options.headers ?? {}),
      },
    });

    if (response.status === 401) {
      throw new SesionCaducadaError();
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.message) {
          errorMsg = Array.isArray(errData.message) ? errData.message.join(', ') : errData.message;
        } else if (errData.error) {
          errorMsg = errData.error;
        }
      } catch (e) {
        // ignore parse error
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // Cortar por tiempo no es un fallo del usuario: se dice en claro en vez de «signal is aborted».
    if (controller.signal.aborted) {
      throw new Error('El servidor tarda en responder. Inténtalo de nuevo en unos segundos.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
