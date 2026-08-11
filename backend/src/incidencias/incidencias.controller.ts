import {
  Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Inject,
  NotFoundException, HttpException, UseGuards, UseInterceptors,
  UploadedFile, Req, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { IncidenciasService } from './incidencias.service.js';
import { IncidenciaUploadsService } from './incidencia-uploads.service.js';
import { createIncidenciaSchema, updateIncidenciaSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

// Límite de multer algo por encima de la validación real (5MB en el service)
// para que los errores de tamaño lleguen como 400 con mensaje claro, no como
// el 413 genérico de multer.
const MULTER_FILE_LIMIT_BYTES = 6 * 1024 * 1024;

// Tipo mínimo del archivo que inyecta FileInterceptor (evita depender de
// @types/multer solo por un tipo).
interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value: string): void {
  if (!UUID_RE.test(value)) {
    throw new BadRequestException('Identificador de sesión inválido');
  }
}

@Controller('incidencias')
export class IncidenciasController {
  /** Rate limit en memoria por IP para el endpoint público de subida móvil. */
  private readonly uploadAttempts = new Map<string, number[]>();

  constructor(
    @Inject(IncidenciasService) private readonly service: IncidenciasService,
    @Inject(IncidenciaUploadsService) private readonly uploads: IncidenciaUploadsService,
  ) {}

  @Get()
  async list() {
    return this.service.list(getTenantContext().tenantId);
  }

  @Get('stats')
  async stats() {
    return this.service.getStats(getTenantContext().tenantId);
  }

  /** Crea una sesión de subida para el operario (auth). Devuelve session_id + TTL. */
  @Post('upload-session')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  @UseGuards(RolesGuard)
  async createUploadSession() {
    const ctx = getTenantContext();
    return this.uploads.createSession(ctx.tenantId, ctx.userId);
  }

  /**
   * Subida pública desde el móvil (POST multipart, campo "foto").
   * El sessionId es la credencial de un solo uso; el tenant se resuelve desde
   * la propia sesión (ver IncidenciaUploadsService.attachPhoto).
   */
  @Post('upload-mobile/:sessionId')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: MULTER_FILE_LIMIT_BYTES } }))
  async uploadMobile(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Req() req: Request,
  ) {
    this.enforceUploadRateLimit(req.ip ?? 'unknown');
    requireUuid(sessionId);
    if (!file || !file.buffer) {
      throw new BadRequestException('No se ha subido ningún archivo (campo "foto")');
    }
    return this.uploads.attachPhoto(sessionId, file.buffer);
  }

  /** Polling del modal del operario (auth): estado de la sesión, sin bytes. */
  @Get('upload-session/:sessionId')
  async getUploadSession(@Param('sessionId') sessionId: string) {
    requireUuid(sessionId);
    const session = await this.uploads.getSession(getTenantContext().tenantId, sessionId);
    if (!session) throw new NotFoundException('Sesión de subida no encontrada');
    return session;
  }

  /** Bytes de la foto para el preview del modal (auth, tenant aislado). */
  @Get('upload-session/:sessionId/photo')
  async getUploadPhoto(@Param('sessionId') sessionId: string, @Res() res: Response) {
    requireUuid(sessionId);
    const photo = await this.uploads.getPhoto(getTenantContext().tenantId, sessionId);
    if (!photo) throw new NotFoundException('Foto no encontrada');
    res.setHeader('Content-Type', photo.mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(photo.buffer);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const incidencia = await this.service.getById(getTenantContext().tenantId, id);
    if (!incidencia) throw new BadRequestException('Incidencia not found.');
    return incidencia;
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createIncidenciaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.create(getTenantContext().tenantId, parsed.data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateIncidenciaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.update(getTenantContext().tenantId, id, parsed.data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(getTenantContext().tenantId, id);
    return { deleted: true };
  }

  /** Ventana deslizante de 20 subidas por IP cada 10 minutos. */
  private enforceUploadRateLimit(ip: string): void {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const maxAttempts = 20;
    const recent = (this.uploadAttempts.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= maxAttempts) {
      throw new HttpException(
        'Demasiados intentos de subida. Inténtalo de nuevo más tarde.',
        429,
      );
    }
    recent.push(now);
    this.uploadAttempts.set(ip, recent);
  }
}
