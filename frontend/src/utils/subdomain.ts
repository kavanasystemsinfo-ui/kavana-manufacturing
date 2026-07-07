export function getSubdomain(): string | null {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

export function getTenantFromUrl(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/([a-zA-Z0-9_-]+)(\/|$)/);
  if (match) {
    const segment = match[1];
    const reserved = ['admin', 'global-admin', 'supervisor', 'operator', 'health', 'api'];
    if (!reserved.includes(segment)) {
      return segment;
    }
  }
  return null;
}
