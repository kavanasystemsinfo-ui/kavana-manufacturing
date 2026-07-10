# ESPECIFICACIÓN TÉCNICA: GOBERNANZA JSONB, PANEL DE ADMINISTRACIÓN Y VALIDACIÓN DINÁMICA DE CAMPOS PERSONALIZADOS (CUSTOM FIELDS)

Esta especificación técnica define los mecanismos de gobernanza para la configuración de inquilinos y la validación en caliente de esquemas dinámicos (*Custom Fields*) en Kavana Manufacturing. El sistema aprovecha las capacidades semánticas de `JSONB` en PostgreSQL para ofrecer una arquitectura *Cross-Sector* polimórfica sin incurrir en alteración de esquemas relacionales ni penalizaciones por re-lecturas persistentes.

---

## 1. ARQUITECTURA DE EXTENSIBILIDAD NO-DDL (CROSS-SECTOR)

Para evitar la "degradación por catálogo" y la ejecución riesgosa de migraciones concurrentes en un entorno SaaS masivo, Kavana Manufacturing utiliza un enfoque híbrido:
1. **Esquema Rígido para Métricas Universales:** Columnas nativas de tipo numérico e indexadas para valores deterministas (`target_quantity`, `produced_quantity`, `status`).
2. **Esquema Maleable para Variables del Sector:** Almacenamiento semiestructurado mediante la columna `custom_fields` (`JSONB`) en la tabla `production_orders`.

La regla de validación de estos campos dinámicos no vive en el código del backend de forma estática; se inyecta dinámicamente leyendo la sub-estructura `custom_fields_schema` guardada dentro de la propia `feature_matrix` del inquilino.

---

## 2. ESTRUCTURA DEL ESQUEMA DE METADATOS DEL INQUILINO

El administrador del inquilino (*Tenant Admin*) define las reglas de su planta desde su panel de gestión. Esta configuración muta la matriz de características del inquilino de la siguiente manera:

```json
{
  "schema_version": "3.1.0",
  "tenant_context": {
    "tier": "enterprise_gold"
  },
  "resource_quotas": {
    "entities": {
      "max_custom_fields": 10
    }
  },
  "custom_fields_schema": {
    "production_orders": {
      "fields": [
        {
          "key": "grosor_mm",
          "label": "Grosor del Material (mm)",
          "type": "number",
          "required": true,
          "min": 0.1,
          "max": 50.0
        },
        {
          "key": "color_id",
          "label": "Código de Color (Pantone)",
          "type": "string",
          "required": false,
          "pattern": "^#[0-9A-Fa-f]{6}$"
        }
      ]
    }
  }
}

3. IMPLEMENTACIÓN DEL VALIDADOR DINÁMICO EN BACKEND (NESTJS)

Para blindar la base de datos contra cargas malformadas o tipos de datos erróneos que corrompan los reportes analíticos, el backend intercepta la creación/actualización de órdenes de producción, extrae el esquema guardado en la caché de alto rendimiento L1/L2 (Redis) y valida el payload utilizando un compilador de esquemas en tiempo de ejecución (Zod o Ajv).
Servicio de Validación Dinámica (CustomFieldsValidatorService)
TypeScript

import { Injectable, BadRequestException } from '@nestjs/common';
import { FeatureCacheService } from '../auth/feature-cache.service';
import { TenantContextStorage } from '../auth/tenant-context.storage';
import { z } from 'zod';

@Injectable()
export class CustomFieldsValidatorService {
  constructor(private readonly featureCacheService: FeatureCacheService) {}

  /**
   * Valida los campos personalizados enviados por el cliente contra el esquema de su Tier
   */
  async validateCustomFields(entityType: 'production_orders', payload: Record<string, any>): Promise<void> {
    const ctx = TenantContextStorage.getContext();
    if (!ctx) throw new BadRequestException('Security Error: No operational tenant context.');

    // 1. Obtener matriz de características (Mitiga el impuesto TOAST leyendo de caché L1/L2)
    const featureMatrix = await this.featureCacheService.getFeatureMatrix(ctx.tenantId.toString());
    if (!featureMatrix || !featureMatrix.custom_fields_schema?.[entityType]) {
      // Si el inquilino no tiene campos configurados, el payload debe estar vacío
      if (payload && Object.keys(payload).length > 0) {
        throw new BadRequestException('This tenant does not support custom fields configuration.');
      }
      return;
    }

    const schemaConfig = featureMatrix.custom_fields_schema[entityType];
    const allowedMaxFields = featureMatrix.resource_quotas?.entities?.max_custom_fields || 5;

    // 2. Control de Límites Duros de Recursos (Gobernanza de Infraestructura)
    if (Object.keys(payload).length > allowedMaxFields) {
      throw new BadRequestException(`Resource limit exceeded. Your tier allows a maximum of ${allowedMaxFields} custom fields.`);
    }

    // 3. Construcción del Validador Dinámico Zod Runtime
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of schemaConfig.fields) {
      let validator: z.ZodTypeAny;

      switch (field.type) {
        case 'number':
          validator = z.number();
          if (field.min !== undefined) validator = (validator as z.ZodNumber).min(field.min);
          if (field.max !== undefined) validator = (validator as z.ZodNumber).max(field.max);
          break;
        case 'string':
          validator = z.string();
          if (field.pattern) validator = (validator as z.ZodString).regex(new RegExp(field.pattern));
          break;
        default:
          validator = z.any();
      }

      if (!field.required) {
        validator = validator.optional().nullable();
      }

      shape[field.key] = validator;
    }

    const runtimeSchema = z.object(shape).strict();

    // 4. Ejecución del análisis sintáctico
    const result = runtimeSchema.safeParse(payload);
    if (!result.success) {
      const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new BadRequestException(`Schema validation failed for Custom Fields: [${errorMessages}]`);
    }
  }
}

4. INTEGRACIÓN CON EL HMI FRONTEND Y FORMULARIOS POLIMÓRFICOS

Para evitar el UI Flashing y garantizar que la pantalla del operario refleje fielmente los campos requeridos de forma inmediata incluso estando Offline, el frontend consume el esquema inyectado de forma síncrona en el arranque.
Consumo en Componente React Táctil Avanzado

El HMI interpreta la matriz del esquema y genera los componentes de entrada bajo el estándar de accesibilidad industrial (visión de túnel y targets mayores a 64px).
TypeScript

import React from 'react';
import { useForm } from 'react-hook-form';

interface FieldDefinition {
  key: string;
  label: string;
  type: 'number' | 'string';
  required: boolean;
}

interface DynamicFormProps {
  fieldsSchema: FieldDefinition[];
  onSubmit: (data: any) => void;
}

export const PolymorphicHmiForm: React.FC<DynamicFormProps> = ({ fieldsSchema, onSubmit }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-2xl mx-auto p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center tracking-wide">
          ESPECIFICACIONES DE CONTROL DE CALIDAD Y LOTE
        </h3>
        
        {fieldsSchema.map((field) => (
          <div key={field.key} className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              step="any"
              {...register(field.key, { required: field.required })}
              className="w-full text-xl bg-slate-800 text-white font-mono p-4 rounded border border-slate-600 focus:outline-none focus:border-cyan-500 transition-colors min-h-[64px]"
              placeholder={`Ingrese ${field.label.toLowerCase()}`}
            />
            
            {errors[field.key] && (
              <span className="text-red-400 font-bold text-sm bg-red-950/40 p-2 rounded border border-red-900/50">
                Este campo operativo es obligatorio para el inicio del lote.
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[72px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black text-xl rounded-lg shadow-lg tracking-wider transition-transform active:scale-[0.98] uppercase"
      >
        {isSubmitting ? 'Validando Seguridad...' : 'Confirmar e Iniciar Producción'}
      </button>
    </form>
  );
};


---

