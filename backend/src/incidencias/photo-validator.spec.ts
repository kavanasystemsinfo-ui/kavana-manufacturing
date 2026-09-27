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

  it('rechaza archivos que superan MAX_PHOTO_BYTES', () => {
    const big = Buffer.concat([PNG_1PX, Buffer.alloc(MAX_PHOTO_BYTES)]);
    const result = validatePhoto(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(String(MAX_PHOTO_BYTES / (1024 * 1024)));
  });

  it('acepta un archivo justo por debajo de MAX_PHOTO_BYTES', () => {
    const ok = Buffer.concat([PNG_1PX, Buffer.alloc(MAX_PHOTO_BYTES - PNG_1PX.length - 1)]);
    const result = validatePhoto(ok);
    expect(result.ok).toBe(true);
  });

  it('rechaza null/undefined', () => {
    expect(validatePhoto(null).ok).toBe(false);
    expect(validatePhoto(undefined).ok).toBe(false);
  });
});

// Estos casos NO son repeticiones de los de arriba: son los que Stryker
// destapó. Los tests anteriores definen los límites con la MISMA constante que
// el código (MAX_PHOTO_BYTES) y solo comprueban el mime del PNG, así que mutar
// el valor de la constante, los mimes de JPEG/WebP/GIF o los textos del motivo
// pasaba desapercibido. Aquí los valores van escritos a mano.
const MAX_PHOTO_BYTES_EXPECTED = 10485760; // 10 * 1024 * 1024, en crudo

function pngHeader(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function fillerWithHeader(header: Buffer, totalLength: number): Buffer {
  const rest = Math.max(0, totalLength - header.length);
  return Buffer.concat([header, Buffer.alloc(rest, 1)]);
}

describe('photo-validator — contrato exacto (valores literales)', () => {
  it('el tamaño máximo son 10 MB exactos', () => {
    expect(MAX_PHOTO_BYTES).toBe(MAX_PHOTO_BYTES_EXPECTED);
  });

  for (const [format, header] of [
    ['png', pngHeader()],
    ['jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])],
    ['gif', Buffer.from('GIF87a')],
  ] as Array<[string, Buffer]>) {
    it(`devuelve el mime exacto de ${format}`, () => {
      const result = validatePhoto(fillerWithHeader(header, 64));
      expect(result).toEqual({ ok: true, mime: `image/${format}`, size: 64 });
    });
  }

  it('devuelve el motivo exacto cuando no hay archivo', () => {
    expect(validatePhoto(Buffer.alloc(0))).toEqual({ ok: false, reason: 'No se ha subido ningún archivo' });
  });

  it('devuelve el motivo exacto cuando no es una imagen', () => {
    expect(validatePhoto(Buffer.from('texto plano'))).toEqual({
      ok: false,
      reason: 'Solo se permiten imágenes (PNG, JPEG, WebP o GIF)',
    });
  });

  it('devuelve el motivo exacto al pasarse de tamaño', () => {
    expect(validatePhoto(fillerWithHeader(pngHeader(), MAX_PHOTO_BYTES_EXPECTED + 1))).toEqual({
      ok: false,
      reason: 'La imagen supera el tamaño máximo de 10MB',
    });
  });

  it('acepta justo el límite y rechaza un byte más', () => {
    const atLimit = validatePhoto(fillerWithHeader(pngHeader(), MAX_PHOTO_BYTES_EXPECTED));
    expect(atLimit).toEqual({ ok: true, mime: 'image/png', size: MAX_PHOTO_BYTES_EXPECTED });

    expect(validatePhoto(fillerWithHeader(pngHeader(), MAX_PHOTO_BYTES_EXPECTED + 1)).ok).toBe(false);
  });
});

describe('photo-validator — casos límite de detección', () => {
  it('un PNG al que le falta el último byte de la firma no es PNG', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]))).toBeNull();
  });

  it('los buffers de menos de 6 bytes no se inspeccionan', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBeNull();
  });

  for (const [name, buffer] of [
    ['JPEG sin el tercer byte de firma', Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00, 0x00])],
    ['RIFF con WEBP en otra posición', Buffer.concat([Buffer.from('WEBP'), Buffer.from('RIFF'), Buffer.alloc(8)])],
    ['RIFF truncado antes del marcador WEBP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBQ')])],
    ['GIF con versión inexistente', Buffer.from('GIF88a')],
    ['texto que empieza por GIF pero no es GIF', Buffer.from('GIF89b')],
  ] as Array<[string, Buffer]>) {
    it(`${name} no se detecta como imagen`, () => {
      expect(detectImageType(buffer)).toBeNull();
    });
  }

  it('un WebP de 11 bytes no llega al mínimo de 12', () => {
    const short = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEB')]);
    expect(short).toHaveLength(11);
    expect(detectImageType(short)).toBeNull();
  });

  it('un GIF de 6 bytes exactos sí se detecta', () => {
    expect(detectImageType(Buffer.from('GIF89a'))).toBe('gif');
  });
});
