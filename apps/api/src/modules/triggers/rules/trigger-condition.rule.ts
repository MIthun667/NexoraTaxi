import { TriggerConditionConfig } from '../triggers.types';

function getNestedValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

export function evaluateTriggerCondition(config: TriggerConditionConfig | null | undefined, payload: unknown): boolean {
  if (!config) {
    return true;
  }

  if (config.all && config.all.length > 0) {
    return config.all.every((condition) => evaluateTriggerCondition(condition, payload));
  }

  if (config.any && config.any.length > 0) {
    return config.any.some((condition) => evaluateTriggerCondition(condition, payload));
  }

  if (!config.field) {
    return true;
  }

  const value = getNestedValue(payload, config.field);

  if (typeof config.exists === 'boolean') {
    const exists = value !== undefined && value !== null;
    if (exists !== config.exists) {
      return false;
    }
  }

  if (config.equals !== undefined && value !== config.equals) {
    return false;
  }

  if (config.notEquals !== undefined && value === config.notEquals) {
    return false;
  }

  if (config.in && !config.in.includes(value)) {
    return false;
  }

  if (typeof config.gte === 'number' && (typeof value !== 'number' || value < config.gte)) {
    return false;
  }

  if (typeof config.lte === 'number' && (typeof value !== 'number' || value > config.lte)) {
    return false;
  }

  if (typeof config.contains === 'string') {
    if (typeof value !== 'string' || !value.toLowerCase().includes(config.contains.toLowerCase())) {
      return false;
    }
  }

  return true;
}

export function extractTriggerFieldValue(source: unknown, fieldPath: string): unknown {
  return getNestedValue(source, fieldPath);
}
