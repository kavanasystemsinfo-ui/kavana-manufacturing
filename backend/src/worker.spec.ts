import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('./queue/queue.module.js', () => ({
  QueueModule: class QueueModule {},
}));

describe('worker bootstrap', () => {
  let bootstrap: () => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    const workerModule = await import('./worker.js');
    bootstrap = workerModule.bootstrap;
  });

  it('arranca el contexto de Nest y registra el apagado limpio', async () => {
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
