import { interpolateVariables } from './utils';

export type ComparisonOperator =
    | '=='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'contains'
    | 'startsWith'
    | 'endsWith';

export interface ConditionalNodeConfig {
    leftValue: string;
    operator: ComparisonOperator;
    rightValue: string;
}

export interface ConditionalNodeResult {
    conditionMet: boolean;
    branch: 'true' | 'false';
    leftValue: any;
    rightValue: any;
    operator: ComparisonOperator;
}

/**
 * Execute Conditional node - evaluates a condition and returns which branch to take
 */
export async function executeConditionalNode(
    config: ConditionalNodeConfig,
    context: Record<string, any>
): Promise<ConditionalNodeResult> {
    // Interpolate variables in both values
    const leftInterpolated = interpolateVariables(config.leftValue, context);
    const rightInterpolated = interpolateVariables(config.rightValue, context);

    // Try to parse as JSON if it looks like a JSON value
    const leftValue = parseValue(leftInterpolated);
    const rightValue = parseValue(rightInterpolated);

    console.log(`[Conditional] Evaluating: ${JSON.stringify(leftValue)} ${config.operator} ${JSON.stringify(rightValue)}`);

    // Evaluate the condition
    const conditionMet = evaluateCondition(leftValue, config.operator, rightValue);
    const branch = conditionMet ? 'true' : 'false';

    console.log(`[Conditional] Result: ${conditionMet} → taking '${branch}' branch`);

    return {
        conditionMet,
        branch,
        leftValue,
        rightValue,
        operator: config.operator
    };
}

/**
 * Parse a string value into its appropriate type (number, boolean, null, or keep as string)
 */
function parseValue(value: string): any {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
        return num;
    }

    // Parse booleans
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null' || lower === 'undefined') return null;

    // Try to parse as JSON (for objects/arrays)
    if ((value.trim().startsWith('{') && value.trim().endsWith('}')) ||
        (value.trim().startsWith('[') && value.trim().endsWith(']'))) {
        try {
            return JSON.parse(value);
        } catch {
            // Not valid JSON, return as string
        }
    }

    return value;
}

/**
 * Evaluate a condition based on operator
 */
function evaluateCondition(left: any, operator: ComparisonOperator, right: any): boolean {
    switch (operator) {
        case '==':
            return equals(left, right);
        case '!=':
            return !equals(left, right);
        case '>':
            return compare(left, right) > 0;
        case '<':
            return compare(left, right) < 0;
        case '>=':
            return compare(left, right) >= 0;
        case '<=':
            return compare(left, right) <= 0;
        case 'contains':
            return contains(left, right);
        case 'startsWith':
            return startsWith(left, right);
        case 'endsWith':
            return endsWith(left, right);
        default:
            throw new Error(`Unknown operator: ${operator}`);
    }
}

/**
 * Compare two values for equality with type coercion
 */
function equals(left: any, right: any): boolean {
    // Handle null/undefined
    if (left === null || left === undefined) {
        return right === null || right === undefined;
    }

    // Type coercion for numbers
    if (typeof left === 'number' || typeof right === 'number') {
        return Number(left) === Number(right);
    }

    // String comparison (case-insensitive)
    if (typeof left === 'string' || typeof right === 'string') {
        return String(left).toLowerCase() === String(right).toLowerCase();
    }

    // Boolean comparison
    if (typeof left === 'boolean' || typeof right === 'boolean') {
        return Boolean(left) === Boolean(right);
    }

    // Object/Array comparison (JSON stringify)
    return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Compare two values numerically or lexicographically
 */
function compare(left: any, right: any): number {
    const leftNum = Number(left);
    const rightNum = Number(right);

    if (isNaN(leftNum) || isNaN(rightNum)) {
        // Fall back to string comparison
        return String(left).localeCompare(String(right));
    }

    return leftNum - rightNum;
}

/**
 * Check if value contains searchValue (for strings and arrays)
 */
function contains(value: any, searchValue: any): boolean {
    if (typeof value === 'string') {
        return value.toLowerCase().includes(String(searchValue).toLowerCase());
    }

    if (Array.isArray(value)) {
        return value.some((item) => equals(item, searchValue));
    }

    return false;
}

/**
 * Check if value starts with searchValue
 */
function startsWith(value: any, searchValue: any): boolean {
    const str = String(value);
    const search = String(searchValue);
    return str.toLowerCase().startsWith(search.toLowerCase());
}

/**
 * Check if value ends with searchValue
 */
function endsWith(value: any, searchValue: any): boolean {
    const str = String(value);
    const search = String(searchValue);
    return str.toLowerCase().endsWith(search.toLowerCase());
}
