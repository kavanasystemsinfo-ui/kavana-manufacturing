import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { tenantRoutes } from '../modules/tenant/tenant.routes.js';
import { catalogRoutes } from '../modules/catalog/catalog.routes.js';
import { orderRoutes } from '../modules/order/order.routes.js';
import { inventoryRoutes } from '../modules/inventory/inventory.routes.js';
import { productionRoutes } from '../modules/production/production.routes.js';
import { qualityRoutes } from '../modules/quality/quality.routes.js';
import { maintenanceRoutes } from '../modules/maintenance/maintenance.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';
import { intelligenceRoutes } from '../modules/intelligence/intelligence.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/tenants', tenantRoutes);
routes.use('/catalog', catalogRoutes);
routes.use('/orders', orderRoutes);
routes.use('/inventory', inventoryRoutes);
routes.use('/production', productionRoutes);
routes.use('/quality', qualityRoutes);
routes.use('/maintenance', maintenanceRoutes);
routes.use('/analytics', analyticsRoutes);
routes.use('/intelligence', intelligenceRoutes);
