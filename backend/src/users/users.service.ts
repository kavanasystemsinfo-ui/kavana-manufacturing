import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import type { CreateUserDto, UpdateUserDto } from './dto.js';

const USER_SELECT = `id, username, role, first_name, last_name, employee_number, is_active, operator_category, default_workstation_id, last_login, created_at, updated_at`;

@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto) {
    const passwordHash = this.hashPassword(dto.password);
    try {
      const result = await tenantQuery(
        postgresPool,
        `INSERT INTO users (tenant_id, username, password_hash, role, first_name, last_name, employee_number, operator_category, default_workstation_id)
         VALUES (get_current_tenant(), $1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${USER_SELECT}`,
        [
          dto.username,
          passwordHash,
          dto.role,
          dto.first_name ?? null,
          dto.last_name ?? null,
          dto.employee_number ?? null,
          dto.operator_category ?? 'peon_especialista',
          dto.default_workstation_id ?? null,
        ],
      );
      return result.rows[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new InternalServerErrorException('Username or employee number already exists for this tenant');
      }
      throw new InternalServerErrorException(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listUsers() {
    const result = await tenantQuery(
      postgresPool,
      `SELECT ${USER_SELECT}
       FROM users
       WHERE tenant_id = get_current_tenant()
       ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  async getUser(userId: string) {
    const result = await tenantQuery(
      postgresPool,
      `SELECT ${USER_SELECT}
       FROM users
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const setClauses: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (dto.username !== undefined) {
      setClauses.push(`username = $${paramIndex}`);
      values.push(dto.username);
      paramIndex++;
    }
    if (dto.password !== undefined) {
      setClauses.push(`password_hash = $${paramIndex}`);
      values.push(this.hashPassword(dto.password));
      paramIndex++;
    }
    if (dto.role !== undefined) {
      setClauses.push(`role = $${paramIndex}`);
      values.push(dto.role);
      paramIndex++;
    }
    if (dto.first_name !== undefined) {
      setClauses.push(`first_name = $${paramIndex}`);
      values.push(dto.first_name);
      paramIndex++;
    }
    if (dto.last_name !== undefined) {
      setClauses.push(`last_name = $${paramIndex}`);
      values.push(dto.last_name);
      paramIndex++;
    }
    if (dto.employee_number !== undefined) {
      setClauses.push(`employee_number = $${paramIndex}`);
      values.push(dto.employee_number);
      paramIndex++;
    }
    if (dto.operator_category !== undefined) {
      setClauses.push(`operator_category = $${paramIndex}`);
      values.push(dto.operator_category);
      paramIndex++;
    }
    if (dto.default_workstation_id !== undefined) {
      setClauses.push(`default_workstation_id = $${paramIndex}`);
      values.push(dto.default_workstation_id);
      paramIndex++;
    }
    if (dto.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      values.push(dto.is_active);
      paramIndex++;
    }
    if (setClauses.length === 0) {
      return this.getUser(userId);
    }
    setClauses.push('updated_at = NOW()');
    values.push(userId);

    const result = await tenantQuery(
      postgresPool,
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE tenant_id = get_current_tenant() AND id = $${paramIndex}
       RETURNING ${USER_SELECT}`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async deleteUser(userId: string) {
    const result = await tenantQuery(
      postgresPool,
      `DELETE FROM users
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
  }
}
