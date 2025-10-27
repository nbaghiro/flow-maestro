/**
 * Shared utility functions for node executors
 */

/**
 * Interpolate variables in a string using ${varName} syntax
 * Supports nested object paths and array indices:
 * - Simple: ${username}
 * - Nested: ${user.profile.name}
 * - Array indices: ${users[0].name}
 * - Complex: ${paper.link[0].$.href}
 *
 * @param str - String containing ${...} placeholders
 * @param context - Object with variable values
 * @param options - Optional configuration
 * @returns String with variables replaced
 */
export function interpolateVariables(
    str: string,
    context: Record<string, any>,
    options?: { stringifyObjects?: boolean }
): string {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        // Split path handling array indices like: firstPaper.link[0].$.href
        // Results in: ['firstPaper', 'link', '0', '$', 'href']
        const keys = varName
            .replace(/\[(\w+)\]/g, '.$1')  // Convert [0] to .0
            .replace(/\['([^']+)'\]/g, '.$1')  // Convert ['key'] to .key
            .replace(/\["([^"]+)"\]/g, '.$1')  // Convert ["key"] to .key
            .split('.')
            .filter((k: string) => k !== '');  // Remove empty strings

        let value: any = context;

        for (const key of keys) {
            if (value === null || value === undefined) {
                return match;  // Return original if path is invalid
            }
            value = value[key];
        }

        if (value === undefined) {
            return match;
        }

        // Handle object values
        if (typeof value === 'object' && options?.stringifyObjects) {
            return JSON.stringify(value);
        }

        return String(value);
    });
}

/**
 * Advanced interpolation that supports object merging and complex expressions
 * Primarily used by output nodes that need to construct complex JSON
 */
export function interpolateWithObjectSupport(str: string, context: Record<string, any>): any {
    // First, always interpolate variables in the string
    const interpolated = interpolateVariables(str, context, { stringifyObjects: true });

    // If the result looks like a JSON object/array, try to parse it
    if (typeof interpolated === 'string') {
        const trimmed = interpolated.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                return JSON.parse(interpolated);
            } catch (e) {
                // If JSON parsing fails, return the interpolated string
                return interpolated;
            }
        }
    }

    return interpolated;
}

/**
 * Deep clone an object to avoid mutation
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as any;
    }
    if (obj instanceof Object) {
        const cloned = {} as any;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
