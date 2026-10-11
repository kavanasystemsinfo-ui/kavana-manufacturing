import { describe, expect, it } from 'vitest';
import { HealthController, HEALTH_PAYLOAD } from './health.controller.js';

describe('HealthController', () => {
  it('devuelve el payload canónico de salud', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: 'ok', service: 'kavana-v3-backend' });
  });

  it('el payload exportado es el mismo que sirve el controlador', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual(HEALTH_PAYLOAD);
    expect(HEALTH_PAYLOAD.status).toBe('ok');
  });
});
