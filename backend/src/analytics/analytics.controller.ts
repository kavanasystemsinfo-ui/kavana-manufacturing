import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import {
  DowntimeParetoQuerySchema,
  OeeDailyQuerySchema,
  OeeHourlyQuerySchema,
  ProductionDailyQuerySchema,
} from './dto.js';
import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

/**
 * Agregados del panel de supervisión. Solo lectura y con los mismos roles que
 * el resto del MES: el frontend los usa para pintar Producción Diaria, el
 * Pareto de Paradas y la Tendencia OEE con datos de verdad.
 */
@Controller('analytics')
@UseGuards(RolesGuard)
export class AnalyticsController {
  // @Inject explícito: tsx (esbuild) no emite design:paramtypes, así que sin
  // el token el servicio entra como undefined en tiempo de ejecución.
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('production-daily')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  async getProductionDaily(@Query() query: unknown) {
    const { days } = ProductionDailyQuerySchema.parse(query);
    return this.analyticsService.getProductionDaily(days);
  }

  @Get('downtime-pareto')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  async getDowntimePareto(@Query() query: unknown) {
    const { days } = DowntimeParetoQuerySchema.parse(query);
    return this.analyticsService.getDowntimePareto(days);
  }

  @Get('oee-daily')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  async getOeeDaily(@Query() query: unknown) {
    const { days } = OeeDailyQuerySchema.parse(query);
    return this.analyticsService.getOeeDaily(days);
  }

  @Get('oee-hourly')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  async getOeeHourly(@Query() query: unknown) {
    const { hours } = OeeHourlyQuerySchema.parse(query);
    return this.analyticsService.getOeeHourly(hours);
  }
}
