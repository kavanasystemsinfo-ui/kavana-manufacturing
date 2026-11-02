const API_TIMEOUT_MS = 15000;

/** `timeoutMs` permite esperar más en las cargas de pantalla, donde el servidor puede estar arrancando en frío. */
export async function callApiWithTimeout<T>(url: string, options: RequestInit = {}, timeoutMs: number = API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('kavana_dev_token') || 'mock-token') : 'mock-token';
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

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
