import type { JsonObject, JsonValue } from '@flowmaestro/shared';
import { interpolateWithObjectSupport } from './utils';

export interface OutputNodeConfig {
    outputName: string;
    value: string;
    format: 'json' | 'string' | 'number' | 'boolean';
    description?: string;
}

export interface OutputNodeResult {
    outputs: JsonObject;
}

/**
 * Execute Output node - sets workflow output values
 */
export async function executeOutputNode(
    config: OutputNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // Interpolate variables in value
    let value: JsonValue = interpolateWithObjectSupport(config.value, context);

    // Format conversion
    value = formatValue(value, config.format);

    console.log(`[Output] Set output '${config.outputName}' (${config.format})`);

    // Return outputs directly at top level (like other executors do with outputVariable)
    return {
        [config.outputName]: value
    } as unknown as JsonObject;
}

function formatValue(value: JsonValue, format: string): JsonValue {
    switch (format) {
        case 'json':
            return typeof value === 'string' ? JSON.parse(value) : value;
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'boolean':
            return Boolean(value);
        default:
            return value;
    }
}

