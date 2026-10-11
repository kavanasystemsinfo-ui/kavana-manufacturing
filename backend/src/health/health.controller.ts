import { Controller, Get } from '@nestjs/common';

// Payload canónico de salud: lo consume el healthcheck de Render (/api/v1/health)
// y la ruta bare /health que registra main.ts para load balancers y la rewritación
// de Vercel. Una sola fuente para no divergir las dos respuestas.
export const HEALTH_PAYLOAD = {
  status: 'ok',
  service: 'kavana-v3-backend',
} as const;

@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; service: string } {
    return { ...HEALTH_PAYLOAD };
  }
}
