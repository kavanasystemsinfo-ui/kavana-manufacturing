import { describe, expect, it } from 'vitest';
import { detectImageType, validatePhoto, MAX_PHOTO_BYTES } from './photo-validator.js';

// PNG 1x1 transparente real (base64)
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('detectImageType', () => {
  it('detecta PNG por magic bytes', () => {
    expect(detectImageType(PNG_1PX)).toBe('png');
  });

  it('detecta JPEG por cabecera FF D8 FF', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(16)]);
    expect(detectImageType(jpeg)).toBe('jpeg');
  });

  it('detecta WebP por RIFF....WEBP', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]);
    expect(detectImageType(webp)).toBe('webp');
  });

  it('detecta GIF por GIF87a/GIF89a', () => {
    expect(detectImageType(Buffer.from('GIF89a'))).toBe('gif');
  });

  it('devuelve null para un archivo que no es imagen', () => {
    expect(detectImageType(Buffer.from('esto no es una imagen'))).toBeNull();
  });

  it('devuelve null para buffer vacío o demasiado corto', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });

  it('devuelve null para null/undefined', () => {
    expect(detectImageType(null as unknown as Buffer)).toBeNull();
    expect(detectImageType(undefined as unknown as Buffer)).toBeNull();
  });
});

describe('validatePhoto', () => {
  it('acepta un PNG real y devuelve su mime y tamaño', () => {
    const result = validatePhoto(PNG_1PX);
    expect(result).toEqual({ ok: true, mime: 'image/png', size: PNG_1PX.length });
  });

  it('rechaza archivos que no son imagen con razón explícita', () => {
    const result = validatePhoto(Buffer.from('texto plano'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Solo se permiten imágenes');
  });

  it('rechaza archivos vacíos', () => {
    const result = validatePhoto(Buffer.alloc(0));
    expect(result.ok).toBe(false);
  });

  it('rechaza archivos de más de 5MB', () => {
    const big = Buffer.concat([PNG_1PX, Buffer.alloc(MAX_PHOTO_BYTES)]);
    const result = validatePhoto(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('5MB');
  });

  it('rechaza null/undefined', () => {
    expect(validatePhoto(null).ok).toBe(false);
    expect(validatePhoto(undefined).ok).toBe(false);
  });
});
