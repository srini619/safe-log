import type { FieldsConfig, RedactionStrategy } from "../types/index.js";
import { defaultSensitiveFields } from "./defaults.js";

/** Normalizes a field name for comparison: lowercase, strip separators. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]/g, "");
}

/**
 * Resolves the effective (normalized name -> strategy) map from defaults + user config.
 */
export function buildStrategyMap(
  fields: FieldsConfig | undefined,
  defaultStrategy: RedactionStrategy,
): Map<string, RedactionStrategy> {
  const map = new Map<string, RedactionStrategy>();

  for (const name of defaultSensitiveFields) {
    map.set(normalize(name), defaultStrategy);
  }

  if (Array.isArray(fields)) {
    for (const name of fields) {
      map.set(normalize(name), defaultStrategy);
    }
  } else if (fields && typeof fields === "object") {
    for (const [name, strategy] of Object.entries(fields)) {
      map.set(normalize(name), strategy);
    }
  }

  return map;
}

/**
 * Returns the strategy to apply for a given object key, or undefined if it isn't sensitive.
 * Uses exact normalized-name equality only -- never substring matching -- so fields like
 * "validId" or "monkeyKey" are never mistaken for "id"/"key".
 */
export function matchField(
  key: string,
  strategyByField: Map<string, RedactionStrategy>,
): RedactionStrategy | undefined {
  return strategyByField.get(normalize(key));
}
