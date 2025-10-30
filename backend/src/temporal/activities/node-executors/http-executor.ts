import axios, { AxiosRequestConfig, Method } from 'axios';
import type { JsonObject, JsonValue } from '@flowmaestro/shared';
import { interpolateVariables } from './utils';

export interface HTTPNodeConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Array<{ key: string; value: string }>;
    queryParams?: Array<{ key: string; value: string }>;
    authType?: 'none' | 'basic' | 'bearer' | 'apiKey';
    authCredentials?: string;
    bodyType?: 'json' | 'form' | 'raw';
    body?: string;
    timeout?: number;
    retryCount?: number;
}

export interface HTTPNodeResult {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: JsonValue;
    responseTime: number;
}

/**
 * Execute HTTP node - makes HTTP requests with full configuration support
 */
export async function executeHTTPNode(
    config: HTTPNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    // Interpolate variables in URL
    const url = interpolateVariables(config.url, context);

    // Build headers
    const headers: Record<string, string> = {};
    if (config.headers) {
        config.headers.forEach(({ key, value }) => {
            if (key) {
                headers[key] = interpolateVariables(value, context);
            }
        });
    }

    // Add authentication
    if (config.authType && config.authType !== 'none') {
        const credentials = interpolateVariables(config.authCredentials || '', context);
        switch (config.authType) {
            case 'basic':
                const [username, password] = credentials.split(':');
                const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
                headers['Authorization'] = `Basic ${basicAuth}`;
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${credentials}`;
                break;
            case 'apiKey':
                headers['X-API-Key'] = credentials;
                break;
        }
    }

    // Build query params
    const params: Record<string, string> = {};
    if (config.queryParams) {
        config.queryParams.forEach(({ key, value }) => {
            if (key) {
                params[key] = interpolateVariables(value, context);
            }
        });
    }

    // Build request body
    let data: JsonValue = null;
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        const bodyString = interpolateVariables(config.body, context);

        if (config.bodyType === 'json') {
            try {
                data = JSON.parse(bodyString);
                headers['Content-Type'] = 'application/json';
            } catch (e) {
                throw new Error(`Invalid JSON in request body: ${e}`);
            }
        } else {
            data = bodyString;
        }
    }

    // Configure axios request
    const requestConfig: AxiosRequestConfig = {
        method: config.method as Method,
        url,
        headers,
        params,
        data,
        timeout: (config.timeout || 30) * 1000, // Convert to milliseconds
        validateStatus: () => true // Don't throw on any status code
    };

    // Execute with retries
    const maxRetries = config.retryCount || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[HTTP] ${config.method} ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);

            const response = await axios(requestConfig);
            const responseTime = Date.now() - startTime;

            console.log(`[HTTP] Response: ${response.status} ${response.statusText} (${responseTime}ms)`);

            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
                data: response.data,
                responseTime
            } as unknown as JsonObject;
        } catch (error) {
            lastError = error as Error;
            console.error(`[HTTP] Attempt ${attempt + 1} failed:`, error);

            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
                console.log(`[HTTP] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    throw new Error(`HTTP request failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
