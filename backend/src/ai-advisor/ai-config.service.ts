import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { postgresPool } from '../db/postgres.provider.js';

export interface TenantAiConfig {
  provider: string;
  api_key: string;
  model: string;
  base_url: string | null;
}

const ENCRYPTION_ALGO = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const envKey = process.env.AI_CONFIG_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    return scryptSync(envKey, 'kavana-ai-salt', 32);
  }
  const fallback = process.env.JWT_SECRET || 'kavana-dev-fallback-key-change-me';
  return scryptSync(fallback, 'kavana-ai-salt', 32);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, dataHex, tagHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ENCRYPTION_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export async function getTenantAiConfig(tenantId: string): Promise<TenantAiConfig | null> {
  const result = await postgresPool.query(
    'SELECT ai_config FROM tenants WHERE id = $1',
    [tenantId],
  );
  if (result.rowCount === 0 || !result.rows[0].ai_config) return null;
  const config = result.rows[0].ai_config;

  return {
    provider: config.provider || '',
    api_key: config.api_key_encrypted ? decrypt(config.api_key_encrypted) : '',
    model: config.model || '',
    base_url: config.base_url || null,
  };
}

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);

  async getConfig(tenantId: bigint): Promise<TenantAiConfig | null> {
    const result = await postgresPool.query(
      'SELECT ai_config FROM tenants WHERE id = $1',
      [tenantId.toString()],
    );
    if (result.rowCount === 0) return null;
    const config = result.rows[0].ai_config || {};

    return {
      provider: config.provider || '',
      api_key: config.api_key_encrypted ? decrypt(config.api_key_encrypted) : '',
      model: config.model || '',
      base_url: config.base_url || null,
    };
  }

  async saveConfig(tenantId: bigint, userId: string, config: { provider: string; api_key: string; model: string; base_url?: string | null }): Promise<void> {
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current config to preserve existing api_key if masked key sent
      const current = await this.getConfig(tenantId);

      const finalApiKey = (config.api_key && config.api_key.startsWith('••••'))
        ? (current?.api_key || '')
        : config.api_key;

      const aiConfig = {
        provider: config.provider,
        api_key_encrypted: finalApiKey ? encrypt(finalApiKey) : '',
        model: config.model,
        base_url: config.base_url || null,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      const result = await client.query(
        `UPDATE tenants SET ai_config = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [tenantId.toString(), JSON.stringify(aiConfig)],
      );

      if (result.rowCount === 0) {
        throw new ForbiddenException('Tenant not found.');
      }

      await client.query('COMMIT');
      this.logger.log(`AI config updated for tenant ${tenantId} — provider=${config.provider}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
