import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeTargetSize,
  needsCompression,
  compressImage,
  MAX_COMPRESSED_BYTES,
  MAX_COMPRESSED_DIMENSION,
} from './imageCompress.js';

describe('computeTargetSize', () => {
  it('mantiene las dimensiones si ya caben en el máximo', () => {
    expect(computeTargetSize(1200, 900)).toEqual({ width: 1200, height: 900 });
  });

  it('reduce el lado mayor al máximo preservando el aspect ratio', () => {
    const result = computeTargetSize(4000, 3000, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
  });

  it('reduce cuando el lado alto es el mayor (vertical)', () => {
    const result = computeTargetSize(3000, 4000, 1600);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1600);
  });

  it('redondea a enteros', () => {
    const result = computeTargetSize(2000, 1333, 1600);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });
});

describe('needsCompression', () => {
  it('devuelve true si el archivo supera el límite', () => {
    expect(needsCompression(MAX_COMPRESSED_BYTES + 1)).toBe(true);
  });

  it('devuelve false si está en el límite o por debajo', () => {
    expect(needsCompression(MAX_COMPRESSED_BYTES)).toBe(false);
    expect(needsCompression(1024)).toBe(false);
  });
});

describe('compressImage', () => {
  let mockCanvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; toBlob: ReturnType<typeof vi.fn> };
  let mockBitmap: { width: number; height: number; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockBitmap = { width: 4032, height: 3024, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
    const mockCtx = { drawImage: vi.fn() };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob(['fake-jpeg'], { type: 'image/jpeg' }))),
    };
    vi.stubGlobal('document', { createElement: vi.fn(() => mockCanvas) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redimensiona al máximo de lado mayor y exporta JPEG', async () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const out = await compressImage(file);
    expect(mockCanvas.width).toBe(MAX_COMPRESSED_DIMENSION);
    expect(mockCanvas.height).toBe(1200);
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', expect.any(Number));
    expect(out.type).toBe('image/jpeg');
    expect(out.name.endsWith('.jpg')).toBe(true);
  });

  it('cierra el bitmap tras usarlo', async () => {
    const file = new File(['x'], 'foto.png');
    await compressImage(file);
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  it('deja de bajar calidad cuando el blob ya cabe en el límite', async () => {
    let qualityCalls: (number | undefined)[] = [];
    mockCanvas.toBlob = vi.fn((cb: (b: Blob | null) => void, _type: string, quality?: number) => {
      qualityCalls.push(quality);
      cb(new Blob([`fake-${quality ?? 0}`], { type: 'image/jpeg' }));
    });
    const file = new File(['x'], 'foto.png');
    await compressImage(file);
    expect(qualityCalls.length).toBe(1);
    expect(qualityCalls[0]).toBeGreaterThanOrEqual(0.4);
  });
});
