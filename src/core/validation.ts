import { Ajv, type ErrorObject } from 'ajv';
import configSchema from './schemas/config.schema.json' with { type: 'json' };
import ruleSchema from './schemas/rule.schema.json' with { type: 'json' };
import skillSchema from './schemas/skill.schema.json' with { type: 'json' };

export type SchemaName = 'config' | 'rule' | 'skill';

const schemas = {
  config: configSchema,
  rule: ruleSchema,
  skill: skillSchema,
};

const ajv = new Ajv({ allErrors: true, strict: true });

export function validateDocument(
  schemaName: SchemaName,
  data: unknown,
): { valid: true } | { valid: false; errors: ErrorObject[] } {
  const validate = ajv.compile(schemas[schemaName]);
  if (validate(data)) {
    return { valid: true };
  }

  return { valid: false, errors: validate.errors ?? [] };
}

export function formatValidationErrors(errors: ErrorObject[]): string {
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}
