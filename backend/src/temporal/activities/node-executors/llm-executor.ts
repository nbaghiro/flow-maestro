import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CohereClient } from 'cohere-ai';
import { interpolateVariables } from './utils';

export interface LLMNodeConfig {
    provider: 'openai' | 'anthropic' | 'google' | 'cohere';
    model: string;
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({ apiKey });

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

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
}

async function executeAnthropic(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const anthropic = new Anthropic({ apiKey });

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
}

async function executeGoogle(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

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

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    console.log(`[LLM] Google response: ${text.length} chars`);

    return {
        text,
        model: config.model,
        provider: 'google'
    };
}

async function executeCohere(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<LLMNodeResult> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
        throw new Error('COHERE_API_KEY environment variable is not set');
    }

    const cohere = new CohereClient({ token: apiKey });

    // Combine system prompt with user prompt
    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${userPrompt}`
        : userPrompt;

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
}

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
