import { interpolateWithObjectSupport } from './utils';

export interface OutputNodeConfig {
    outputName: string;
    value: string;
    format: 'json' | 'string' | 'number' | 'boolean';
    description?: string;
}

export interface OutputNodeResult {
    outputs: Record<string, any>;
}

/**
 * Execute Output node - sets workflow output values
 */
export async function executeOutputNode(
    config: OutputNodeConfig,
    context: Record<string, any>
): Promise<OutputNodeResult> {
    // Interpolate variables in value
    let value: any = interpolateWithObjectSupport(config.value, context);

    // Format conversion
    value = formatValue(value, config.format);

    console.log(`[Output] Set output '${config.outputName}' (${config.format})`);

    return {
        outputs: {
            [config.outputName]: value
        }
    };
}

function formatValue(value: any, format: string): any {
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

