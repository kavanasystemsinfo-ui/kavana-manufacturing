export interface CustomFieldUI {
  key: string;
  label: string;
  value: any;
  type: string;
}

export function mapCustomFieldsToUI(
  customFields?: Record<string, any>,
  schemaFields?: any[]
): CustomFieldUI[] {
  if (!customFields || typeof customFields !== 'object') {
    return [];
  }

  const result: CustomFieldUI[] = [];
  const schemaMap = new Map<string, any>();

  if (Array.isArray(schemaFields)) {
    for (const field of schemaFields) {
      if (field && field.key) {
        schemaMap.set(field.key, field);
      }
    }
  }

  for (const [key, value] of Object.entries(customFields)) {
    const schemaDef = schemaMap.get(key);
    
    // Fallback: Si no hay schema, usamos la key capitalizada
    let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    let type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';

    if (schemaDef) {
      label = schemaDef.label || label;
      type = schemaDef.type || type;
    }

    result.push({
      key,
      label,
      value,
      type
    });
  }

  return result;
}
