import { interpolateVariables } from './utils';

export interface VariableNodeConfig {
    operation: 'set' | 'get' | 'delete';
    variableName: string;
    value?: string;
    scope: 'workflow' | 'global' | 'temporary';
    valueType?: 'auto' | 'string' | 'number' | 'boolean' | 'json';
}

export interface VariableNodeResult {
    [key: string]: any;
}

/**
 * Execute Variable node - manages workflow variables
 */
export async function executeVariableNode(
    config: VariableNodeConfig,
    context: Record<string, any>,
    globalStore?: Map<string, any>
): Promise<VariableNodeResult> {
    console.log(`[Variable] Operation: ${config.operation} on '${config.variableName}' (${config.scope})`);

    const store = config.scope === 'global' ? globalStore : context;
    if (!store) {
        throw new Error(`Storage for scope '${config.scope}' not available`);
    }

    switch (config.operation) {
        case 'set':
            return setVariable(config, context, store);
        case 'get':
            return getVariable(config, store);
        case 'delete':
            return deleteVariable(config, store);
        default:
            throw new Error(`Unsupported variable operation: ${config.operation}`);
    }
}

function setVariable(
    config: VariableNodeConfig,
    context: Record<string, any>,
    store: any
): VariableNodeResult {
    let value: any = interpolateVariables(config.value || '', context);

    // Type conversion
    if (config.valueType && config.valueType !== 'auto') {
        value = convertType(value, config.valueType);
    }

    if (store instanceof Map) {
        store.set(config.variableName, value);
    } else {
        store[config.variableName] = value;
    }

    console.log(`[Variable] Set '${config.variableName}' = ${JSON.stringify(value).substring(0, 100)}`);

    return { [config.variableName]: value };
}

function getVariable(
    config: VariableNodeConfig,
    store: any
): VariableNodeResult {
    const value = store instanceof Map
        ? store.get(config.variableName)
        : store[config.variableName];

    console.log(`[Variable] Get '${config.variableName}' = ${JSON.stringify(value).substring(0, 100)}`);

    return { [config.variableName]: value };
}

function deleteVariable(
    config: VariableNodeConfig,
    store: any
): VariableNodeResult {
    if (store instanceof Map) {
        store.delete(config.variableName);
    } else {
        delete store[config.variableName];
    }

    console.log(`[Variable] Deleted '${config.variableName}'`);

    return {};
}

function convertType(value: any, type: string): any {
    switch (type) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'boolean':
            return value === 'true' || value === true;
        case 'json':
            return typeof value === 'string' ? JSON.parse(value) : value;
        default:
            return value;
    }
}

