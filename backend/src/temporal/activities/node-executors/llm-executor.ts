import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CohereClient } from 'cohere-ai';
import { interpolateVariables } from './utils';
import { CredentialRepository } from '../../../storage/repositories/CredentialRepository';
import type { ApiKeyData } from '../../../storage/models/Credential';

const credentialRepository = new CredentialRepository();

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

/**
 * Check if error is retryable (overload, rate limit, or temporary server errors)
 */
function isRetryableError(error: any): boolean {
    // HTTP status codes that should be retried
    const retryableStatusCodes = [429, 503, 529];

    // Check status code
    if (error.status && retryableStatusCodes.includes(error.status)) {
        return true;
    }

    // Check error type for Anthropic SDK
    if (error.type && ['overloaded_error', 'rate_limit_error'].includes(error.type)) {
        return true;
    }

    // Check for common error messages
    if (error.message) {
        const message = error.message.toLowerCase();
        if (message.includes('overloaded') ||
            message.includes('rate limit') ||
            message.includes('too many requests')) {
            return true;
        }
    }

    return false;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    context: string
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry if it's not a retryable error
            if (!isRetryableError(error)) {
                throw error;
            }

            // Don't retry if we've exhausted attempts
            if (attempt >= RETRY_CONFIG.maxRetries) {
                console.error(`[LLM] ${context} - Max retries (${RETRY_CONFIG.maxRetries}) exceeded`);
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
                RETRY_CONFIG.maxDelayMs
            );

            console.warn(
                `[LLM] ${context} - Retryable error (${error.status || error.type}): ${error.message}. ` +
                `Retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
            );

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

export interface LLMNodeConfig {
    provider: 'openai' | 'anthropic' | 'google' | 'cohere';
    model: string;
    credentialId?: string;
    systemPrompt?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    outputVariable?: string;
}

export interface LLMNodeResult {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

/**
 * Get API key from credential or fall back to environment variable
 */
async function getApiKey(credentialId: string | undefined, provider: string, envVarName: string): Promise<string> {
    // Try to get from credential first
    if (credentialId) {
        const credential = await credentialRepository.findByIdWithData(credentialId);
        if (!credential) {
            throw new Error(`Credential with ID ${credentialId} not found`);
        }
        if (credential.provider !== provider) {
            throw new Error(`Credential provider mismatch: expected ${provider}, got ${credential.provider}`);
        }
        if (credential.status !== 'active') {
            throw new Error(`Credential is not active (status: ${credential.status})`);
        }
        const data = credential.data as ApiKeyData;
        if (!data.api_key) {
            throw new Error('API key not found in credential data');
        }
        console.log(`[LLM] Using credential: ${credential.name} (${credential.id})`);
        return data.api_key;
    }

    // Fall back to environment variable for backwards compatibility
    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new Error(
            `No credential provided and ${envVarName} environment variable is not set. ` +
            `Please add a credential in the Credentials page or set the ${envVarName} environment variable.`
        );
    }
    console.log(`[LLM] Using environment variable: ${envVarName}`);
    return apiKey;
}

/**
 * Execute LLM node - calls various LLM providers
 */
export async function executeLLMNode(
    config: LLMNodeConfig,
    context: Record<string, any>
): Promise<LLMNodeResult> {
    // Interpolate variables in prompts
    const systemPrompt = config.systemPrompt
        ? interpolateVariables(config.systemPrompt, context)
        : undefined;
    const userPrompt = interpolateVariables(config.prompt, context);

    console.log(`[LLM] Calling ${config.provider}/${config.model}`);
    console.log(`[LLM] Prompt length: ${userPrompt.length} chars`);

    let result: LLMNodeResult;

    switch (config.provider) {
        case 'openai':
            result = await executeOpenAI(config, systemPrompt, userPrompt);
            break;
        case 'anthropic':
            result = await executeAnthropic(config, systemPrompt, userPrompt);
            break;
        case 'google':
            result = await executeGoogle(config, systemPrompt, userPrompt);
            break;
        case 'cohere':
            result = await executeCohere(config, systemPrompt, userPrompt);
            break;
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    // Wrap result in outputVariable if specified
    if (config.outputVariable) {
        return { [config.outputVariable]: result } as any;
    }

    return result;
}

async function executeOpenAI(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.credentialId, 'openai', 'OPENAI_API_KEY');
    const openai = new OpenAI({ apiKey });

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: config.model,
            messages,
            temperature: config.temperature ?? 0.7,
            max_tokens: config.maxTokens ?? 1000,
            top_p: config.topP ?? 1,
        });

        const text = response.choices[0]?.message?.content || '';
        const usage = response.usage;

        console.log(`[LLM] OpenAI response: ${text.length} chars, ${usage?.total_tokens} tokens`);

        return {
            text,
            usage: usage ? {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens
            } : undefined,
            model: config.model,
            provider: 'openai'
        };
    }, `OpenAI ${config.model}`);
}

async function executeAnthropic(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.credentialId, 'anthropic', 'ANTHROPIC_API_KEY');
    const anthropic = new Anthropic({ apiKey });

    return withRetry(async () => {
        const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens ?? 1000,
            temperature: config.temperature ?? 0.7,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const usage = response.usage;

        console.log(`[LLM] Anthropic response: ${text.length} chars, ${usage.input_tokens + usage.output_tokens} tokens`);

        return {
            text,
            usage: {
                promptTokens: usage.input_tokens,
                completionTokens: usage.output_tokens,
                totalTokens: usage.input_tokens + usage.output_tokens
            },
            model: config.model,
            provider: 'anthropic'
        };
    }, `Anthropic ${config.model}`);
}

async function executeGoogle(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.credentialId, 'google', 'GOOGLE_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 1000,
            topP: config.topP ?? 1,
        }
    });

    // Combine system prompt and user prompt for Google
    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${userPrompt}`
        : userPrompt;

    return withRetry(async () => {
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        console.log(`[LLM] Google response: ${text.length} chars`);

        return {
            text,
            model: config.model,
            provider: 'google'
        };
    }, `Google ${config.model}`);
}

async function executeCohere(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.credentialId, 'cohere', 'COHERE_API_KEY');
    const cohere = new CohereClient({ token: apiKey });

    // Combine system prompt with user prompt
    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${userPrompt}`
        : userPrompt;

    return withRetry(async () => {
        const response = await cohere.generate({
            model: config.model,
            prompt: fullPrompt,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 1000,
            p: config.topP ?? 1,
        });

        const text = response.generations[0]?.text || '';

        console.log(`[LLM] Cohere response: ${text.length} chars`);

        return {
            text,
            model: config.model,
            provider: 'cohere'
        };
    }, `Cohere ${config.model}`);
}

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
