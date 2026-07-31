import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { postgresPool } from '../../db/postgres.provider.js';

/**
 * Job de ingestión de documentos para el AI Advisor.
 *
 * Procesa manuales, especificaciones u otros documentos de texto
 * y los indexa como contexto para el RAG del AI Advisor.
 *
 * Flujo:
 *   1. Recibe un path a un documento o texto raw
 *   2. Lo chunk-ea en fragmentos de ~500 tokens
 *   3. Los indexa en una tabla de contexto para el advisor
 */
interface IngestDocumentJob {
  tenantId: string;
  /** Tipo de documento: 'manual', 'spec', 'procedure', 'raw' */
  docType: 'manual' | 'spec' | 'procedure' | 'raw';
  /** Título descriptivo */
  title: string;
  /** Contenido del documento (texto plano) */
  content: string;
  /** Etiquetas opcionales para filtrar por categoría */
  tags?: string[];
}

@Processor('document-ingest')
export class DocumentIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentIngestProcessor.name);
  private readonly MAX_CONTENT_BYTES = 10 * 1024 * 1024; // 10 MB
  private readonly ALLOWED_DOC_TYPES = ['manual', 'spec', 'procedure', 'raw'];

  async process(job: Job<IngestDocumentJob>): Promise<{ chunks: number; indexed: number }> {
    const { tenantId, docType, title, content, tags } = job.data;

    // ── Input validation ──
    if (!tenantId || typeof tenantId !== 'string' || tenantId.length < 10) {
      throw new Error(`Invalid tenantId: ${tenantId}`);
    }
    if (!this.ALLOWED_DOC_TYPES.includes(docType)) {
      throw new Error(`Invalid docType: ${docType}. Allowed: ${this.ALLOWED_DOC_TYPES.join(', ')}`);
    }
    if (!title || typeof title !== 'string' || title.length > 500) {
      throw new Error(`Invalid title: must be 1-500 chars`);
    }
    if (!content || typeof content !== 'string') {
      throw new Error('content is required and must be a string');
    }
    if (Buffer.byteLength(content, 'utf8') > this.MAX_CONTENT_BYTES) {
      throw new Error(`content exceeds ${this.MAX_CONTENT_BYTES / (1024 * 1024)} MB limit`);
    }

    this.logger.log(`Ingest: ${docType} "${title.slice(0, 50)}..." (${content.length} chars), tenant=${tenantId}`);

    const pool = postgresPool;
    const client = await pool.connect();

    try {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);

      // 1. Registrar documento fuente
      const docResult = await client.query(`
        INSERT INTO ai_context_documents (tenant_id, doc_type, title, content_raw, tags, chunk_count)
        VALUES ($1, $2, $3, $4, $5, 0)
        ON CONFLICT (tenant_id, title) DO UPDATE SET content_raw = $4, tags = $5, updated_at = NOW()
        RETURNING id
      `, [tenantId, docType, title, content, tags || []]);

      const docId = docResult.rows[0].id;

      // 2. Chunkear en párrafos de ~500 tokens (~2000 chars) con solapamiento
      const CHUNK_SIZE = 2000;
      const OVERLAP = 200;
      const chunks: string[] = [];
      let pos = 0;

      while (pos < content.length) {
        const end = Math.min(pos + CHUNK_SIZE, content.length);
        const chunk = content.slice(pos, end).trim();
        if (chunk.length > 0) chunks.push(chunk);
        pos += CHUNK_SIZE - OVERLAP;
      }

      // 3. Indexar chunks
      let indexed = 0;
      for (const [i, chunk] of chunks.entries()) {
        await client.query(`
          INSERT INTO ai_context_chunks (tenant_id, document_id, chunk_index, content)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (tenant_id, document_id, chunk_index) DO NOTHING
        `, [tenantId, docId, i, chunk]);
        indexed++;
      }

      // 4. Actualizar contador de chunks
      await client.query(
        'UPDATE ai_context_documents SET chunk_count = $1 WHERE id = $2',
        [indexed, docId],
      );

      this.logger.log(`Ingest completo: doc=${docId}, chunks=${indexed}, tenant=${tenantId}`);
      return { chunks: chunks.length, indexed };

    } finally {
      client.release();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Document ingest completed: job ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Document ingest failed: job ${job.id} — ${err.message}`);
  }
}
