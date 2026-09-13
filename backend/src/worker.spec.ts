import { describe, it, expect, vi } from 'vitest';
import { bootstrap } from './worker.js';

describe('worker bootstrap', () => {
  it('should call NestFactory.createApplicationContext', async () => {
    const createAppCtxSpy = vi.spyOn(require('@nestjs/core'), 'NestFactory').mockImplementation(() => ({
      createApplicationContext: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined)
      })
    }) as any);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onSpy = vi.fn();
    vi.stubGlobal('process', {
      on: onSpy,
      exit: vi.fn()
    } as any);
    await bootstrap();
    expect(createAppCtxSpy).toHaveBeenCalled();
    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    consoleSpy.mockRestore();
  });
});