import { describe, it, expect, vi } from 'vitest';

// El worker arranca el contexto REAL de Nest con Redis: en CI no hay Redis
// y NestFactory aborta el proceso al fallar la inicialización. Se mockea el
// módulo entero: lo que se prueba es el cableado de shutdown del bootstrap,
// no la integración con BullMQ.
vi.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('worker bootstrap', () => {
  it('arranca el contexto de Nest y registra el apagado limpio', async () => {
    const { bootstrap } = await import('./worker.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onSpy = vi.fn();
    const exitSpy = vi.fn();
    vi.stubGlobal('process', {
      env: { REDIS_HOST: 'localhost', REDIS_PORT: '6379' },
      on: onSpy,
      exit: exitSpy,
    } as any);
    await bootstrap();
    const { NestFactory } = await import('@nestjs/core');
    expect(NestFactory.createApplicationContext).toHaveBeenCalled();
    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    logSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
