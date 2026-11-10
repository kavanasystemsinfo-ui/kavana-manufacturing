import { describe, it, expect } from 'vitest';
import { modelosGratis, esOpenRouter, MODELOS_GRATIS_POR_DEFECTO } from './modelos-gratis.js';

describe('modelosGratis', () => {
  it('descarta modelos de pago y usa los de por defecto', () => {
    expect(modelosGratis('deepseek/deepseek-chat', 'openai/gpt-4o-mini')).toEqual(MODELOS_GRATIS_POR_DEFECTO);
  });
  it('respeta un modelo gratuito configurado y lo pone primero, sin duplicados y con máximo 3', () => {
    const r = modelosGratis('poolside/laguna-s-2.1:free', MODELOS_GRATIS_POR_DEFECTO[0]);
    expect(r[0]).toBe('poolside/laguna-s-2.1:free');
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
    expect(r.every((m) => m.endsWith(':free'))).toBe(true);
  });
  it('detecta OpenRouter por la URL base', () => {
    expect(esOpenRouter('https://openrouter.ai/api/v1')).toBe(true);
    expect(esOpenRouter('https://api.deepseek.com/v1')).toBe(false);
  });
});
