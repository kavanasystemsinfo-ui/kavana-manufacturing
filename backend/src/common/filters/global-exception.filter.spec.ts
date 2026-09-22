import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { GlobalExceptionFilter } from './global-exception.filter.js';

function createHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/production/time-logs/mine', headers: {} }),
    }),
  } as any;
  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  it('convierte un ZodError en 400 con el campo que falla, no en 500', () => {
    const { host, status, json } = createHost();
    let zodError: unknown;
    try {
      z.object({ from: z.string().datetime({ offset: true }) }).parse({ from: 'no-es-fecha' });
    } catch (error) {
      zodError = error;
    }

    new GlobalExceptionFilter().catch(zodError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message.join(' ')).toContain('from');
  });

  it('respeta el status de una HttpException', () => {
    const { host, status } = createHost();

    new GlobalExceptionFilter().catch(new NotFoundException('No existe'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('mantiene el 500 para errores inesperados', () => {
    const { host, status } = createHost();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    new GlobalExceptionFilter().catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('un BadRequestException sigue siendo 400', () => {
    const { host, status } = createHost();

    new GlobalExceptionFilter().catch(new BadRequestException('Datos inválidos'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});
