import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { limpiarUsuariosVisitantes } = require('../../scripts/limpiar-demo-visitantes.cjs');

type Fila = { id: string; username: string };

function clienteFalso(filas: Fila[], conActividad: string[] = []) {
  const consultas: { sql: string; params: unknown[] }[] = [];
  return {
    consultas,
    async query(sql: string, params: unknown[] = []) {
      consultas.push({ sql, params });
      if (sql.startsWith('SELECT id, username FROM users')) return { rows: filas };
      if (sql.startsWith('DELETE FROM users')) {
        if (conActividad.includes(params[1] as string)) {
          throw Object.assign(new Error('fk'), { code: '23503' });
        }
        return { rowCount: 1 };
      }
      return { rowCount: 1 };
    },
  };
}

describe('limpieza de usuarios creados por visitantes de la demo', () => {
  it('busca solo usuarios recientes y nunca los públicos de la demo', async () => {
    const c = clienteFalso([]);
    await limpiarUsuariosVisitantes(c, 100);
    const sel = c.consultas[0];
    expect(sel.sql).toContain('created_at >= $2');
    expect(sel.params[2]).toEqual(['1094', '047', 'admin']);
  });

  it('borra los usuarios de visitantes', async () => {
    const c = clienteFalso([{ id: 'u1', username: 'zz-prueba' }]);
    const r = await limpiarUsuariosVisitantes(c, 100);
    expect(r).toEqual({ borrados: 1, desactivados: 0 });
  });

  it('si el usuario ya tiene actividad lo desactiva en vez de fallar', async () => {
    const c = clienteFalso(
      [{ id: 'u1', username: 'a' }, { id: 'u2', username: 'b' }],
      ['u1'],
    );
    const r = await limpiarUsuariosVisitantes(c, 100);
    expect(r).toEqual({ borrados: 1, desactivados: 1 });
    expect(c.consultas.some((q) => q.sql.startsWith('UPDATE users SET is_active=false'))).toBe(true);
  });

  it('un error distinto de clave foránea se propaga', async () => {
    const c = clienteFalso([{ id: 'u1', username: 'a' }]);
    c.query = async (sql: string) => {
      if (sql.startsWith('SELECT')) return { rows: [{ id: 'u1', username: 'a' }] } as never;
      throw new Error('caída de red');
    };
    await expect(limpiarUsuariosVisitantes(c, 100)).rejects.toThrow('caída de red');
  });
});
