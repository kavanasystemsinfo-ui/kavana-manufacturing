import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechnicalAdvisorService } from './technical-advisor.service.js';

describe('TechnicalAdvisorService', () => {
  let service: TechnicalAdvisorService;

  beforeEach(() => {
    service = new TechnicalAdvisorService();
  });

  it('indexa el corpus de documentación del repo', () => {
    const stats = service.estadisticasCorpus();
    expect(stats.chunks).toBeGreaterThan(20);
    expect(stats.fuentes).toBeGreaterThan(5);
  });

  it('encuentra documentación relevante con búsqueda TF-IDF', () => {
    const docs = (service as any).buscar('offline first sincronización', 5);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].fuente).toBeTruthy();
    expect(docs[0].texto.length).toBeGreaterThan(60);
  });

  it('detecta preguntas complejas de arquitectura', () => {
    expect((service as any).esCompleja('¿Por qué elegiste offline-first y qué tradeoffs tuvo?')).toBe(true);
    expect((service as any).esCompleja('¿Cuántas órdenes hay hoy?')).toBe(false);
  });

  it('devuelve "no documentado" si no hay contexto suficiente', async () => {
    const result = await service.responder('fake-key-123', 'zzz qqq xxx yyy');
    expect(result.respuesta).toContain('No encuentro nada en la documentación');
    expect(result.fuentes).toEqual([]);
  });

  it('falla claro si no hay API key', async () => {
    await expect(service.responder('', '¿qué es esto?')).rejects.toThrow('OPENROUTER_API_KEY no configurada');
  });
});
