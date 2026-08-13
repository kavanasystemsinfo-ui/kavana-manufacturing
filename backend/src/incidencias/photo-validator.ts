// Validación de imágenes por MAGIC BYTES en vez de confiar en el mimetype
// declarado por el cliente (que es falseable). Cubre los formatos que acepta
// la demo: PNG, JPEG, WebP y GIF.
//
// 10MB: el móvil comprime la foto antes de subir (canvas, máx 1600px, JPEG),
// así que el límite real suele ser <1MB; los 10MB son red de seguridad para
// móviles antiguos o navegadores donde la compresión falle y la foto suba
// tal cual desde la cámara.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

export type DetectedImageType = 'png' | 'jpeg' | 'webp' | 'gif';

const MIME_BY_TYPE: Record<DetectedImageType, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (!buffer || buffer.length < 6) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'png';

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';

  // WebP: 'RIFF' <size> 'WEBP' (necesita al menos 12 bytes)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';

  // GIF: 'GIF87a' | 'GIF89a'
  const head = buffer.toString('ascii', 0, 6);
  if (head === 'GIF87a' || head === 'GIF89a') return 'gif';

  return null;
}

export type PhotoValidation =
  | { ok: true; mime: string; size: number }
  | { ok: false; reason: string };

export function validatePhoto(buffer: Buffer | null | undefined): PhotoValidation {
  if (!buffer || buffer.length === 0) {
    return { ok: false, reason: 'No se ha subido ningún archivo' };
  }
  if (buffer.length > MAX_PHOTO_BYTES) {
    return { ok: false, reason: `La imagen supera el tamaño máximo de ${MAX_PHOTO_BYTES / (1024 * 1024)}MB` };
  }
  const type = detectImageType(buffer);
  if (!type) {
    return { ok: false, reason: 'Solo se permiten imágenes (PNG, JPEG, WebP o GIF)' };
  }
  return { ok: true, mime: MIME_BY_TYPE[type], size: buffer.length };
}
