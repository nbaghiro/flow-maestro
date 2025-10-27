import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { interpolateVariables } from './utils';

export interface VisionNodeConfig {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    operation: 'analyze' | 'generate';

    // For analyze operation
    imageInput?: string; // URL, base64, or ${variable} reference
    prompt?: string; // Analysis prompt
    detail?: 'low' | 'high' | 'auto'; // OpenAI detail level

    // For generate operation (OpenAI only currently)
    generationPrompt?: string;
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number; // Number of images

    // Common parameters
    maxTokens?: number;
    outputFormat?: 'url' | 'base64';
    outputVariable?: string;
}

export interface VisionNodeResult {
    operation: string;
    provider: string;
    model: string;

    // For analyze
    analysis?: string;

    // For generate
    images?: Array<{
        url?: string;
        base64?: string;
        revisedPrompt?: string;
    }>;

    metadata?: {
        processingTime: number;
        tokensUsed?: number;
    };
}

/**
 * Execute Vision node - image analysis and generation
 */
export async function executeVisionNode(
    config: VisionNodeConfig,
    context: Record<string, any>
): Promise<VisionNodeResult> {
    const startTime = Date.now();

    console.log(`[Vision] Provider: ${config.provider}, Operation: ${config.operation}`);

    let result: VisionNodeResult;

    switch (config.provider) {
        case 'openai':
            result = await executeOpenAI(config, context);
            break;

        case 'anthropic':
            result = await executeAnthropic(config, context);
            break;

        case 'google':
            result = await executeGoogle(config, context);
            break;

        default:
            throw new Error(`Unsupported vision provider: ${config.provider}`);
    }

    result.metadata = {
        ...result.metadata,
        processingTime: Date.now() - startTime,
    };

    console.log(`[Vision] Completed in ${result.metadata.processingTime}ms`);

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as any;
    }

    return result;
}

/**
 * Execute OpenAI vision (GPT-4 Vision for analyze, DALL-E for generate)
 */
async function executeOpenAI(
    config: VisionNodeConfig,
    context: Record<string, any>
): Promise<VisionNodeResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({ apiKey });

    if (config.operation === 'analyze') {
        // GPT-4 Vision for image analysis
        const imageUrl = interpolateVariables(config.imageInput || '', context);
        const prompt = interpolateVariables(config.prompt || 'Describe this image in detail', context);

        console.log(`[Vision/OpenAI] Analyzing image: ${imageUrl.substring(0, 100)}...`);

        const response = await openai.chat.completions.create({
            model: config.model || 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: config.detail || 'auto',
                            },
                        },
                    ],
                },
            ],
            max_tokens: config.maxTokens || 1000,
        });

        const analysis = response.choices[0]?.message?.content || '';

        console.log(`[Vision/OpenAI] Analysis complete: ${analysis.length} chars`);

        return {
            operation: 'analyze',
            provider: 'openai',
            model: config.model || 'gpt-4-vision-preview',
            analysis,
            metadata: {
                processingTime: 0,
                tokensUsed: response.usage?.total_tokens,
            },
        };
    } else if (config.operation === 'generate') {
        // DALL-E for image generation
        const prompt = interpolateVariables(config.generationPrompt || '', context);

        console.log(`[Vision/OpenAI] Generating image: "${prompt.substring(0, 100)}..."`);

        const response = await openai.images.generate({
            model: config.model || 'dall-e-3',
            prompt,
            n: config.n || 1,
            size: config.size || '1024x1024',
            quality: config.quality || 'standard',
            style: config.style || 'vivid',
            response_format: config.outputFormat === 'base64' ? 'b64_json' : 'url',
        });

        const images = (response.data || []).map((img: any) => ({
            url: img.url,
            base64: img.b64_json,
            revisedPrompt: img.revised_prompt,
        }));

        console.log(`[Vision/OpenAI] Generated ${images.length} image(s)`);

        return {
            operation: 'generate',
            provider: 'openai',
            model: config.model || 'dall-e-3',
            images,
            metadata: {
                processingTime: 0,
            },
        };
    } else {
        throw new Error(`Unsupported operation for OpenAI: ${config.operation}`);
    }
}

/**
 * Execute Anthropic vision (Claude 3 with vision)
 */
async function executeAnthropic(
    config: VisionNodeConfig,
    context: Record<string, any>
): Promise<VisionNodeResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    if (config.operation !== 'analyze') {
        throw new Error('Anthropic only supports "analyze" operation (no image generation)');
    }

    const anthropic = new Anthropic({ apiKey });

    const imageInput = interpolateVariables(config.imageInput || '', context);
    const prompt = interpolateVariables(config.prompt || 'Describe this image in detail', context);

    console.log(`[Vision/Anthropic] Analyzing image with Claude`);

    // Prepare image content - support URL or base64
    let imageContent: any;

    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        // Download image and convert to base64
        const response = await axios.get(imageInput, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data).toString('base64');
        const contentType = response.headers['content-type'] || 'image/jpeg';

        imageContent = {
            type: 'image' as const,
            source: {
                type: 'base64' as const,
                media_type: contentType,
                data: base64,
            },
        };
    } else if (imageInput.startsWith('data:')) {
        // Extract base64 from data URL
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid data URL format');
        }

        imageContent = {
            type: 'image' as const,
            source: {
                type: 'base64' as const,
                media_type: matches[1],
                data: matches[2],
            },
        };
    } else {
        // Assume it's raw base64
        imageContent = {
            type: 'image' as const,
            source: {
                type: 'base64' as const,
                media_type: 'image/jpeg',
                data: imageInput,
            },
        };
    }

    const response = await anthropic.messages.create({
        model: config.model || 'claude-3-opus-20240229',
        max_tokens: config.maxTokens || 1000,
        messages: [
            {
                role: 'user',
                content: [
                    imageContent,
                    {
                        type: 'text',
                        text: prompt,
                    },
                ],
            },
        ],
    });

    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`[Vision/Anthropic] Analysis complete: ${analysis.length} chars`);

    return {
        operation: 'analyze',
        provider: 'anthropic',
        model: config.model || 'claude-3-opus-20240229',
        analysis,
        metadata: {
            processingTime: 0,
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        },
    };
}

/**
 * Execute Google vision (Gemini with vision)
 */
async function executeGoogle(
    config: VisionNodeConfig,
    context: Record<string, any>
): Promise<VisionNodeResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

    if (config.operation !== 'analyze') {
        throw new Error('Google Gemini only supports "analyze" operation currently');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || 'gemini-pro-vision',
    });

    const imageInput = interpolateVariables(config.imageInput || '', context);
    const prompt = interpolateVariables(config.prompt || 'Describe this image in detail', context);

    console.log(`[Vision/Google] Analyzing image with Gemini`);

    // Prepare image part
    let imagePart: any;

    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        // Download image and convert to base64
        const response = await axios.get(imageInput, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data).toString('base64');
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        imagePart = {
            inlineData: {
                data: base64,
                mimeType,
            },
        };
    } else if (imageInput.startsWith('data:')) {
        // Extract from data URL
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid data URL format');
        }

        imagePart = {
            inlineData: {
                data: matches[2],
                mimeType: matches[1],
            },
        };
    } else {
        // Assume raw base64
        imagePart = {
            inlineData: {
                data: imageInput,
                mimeType: 'image/jpeg',
            },
        };
    }

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const analysis = response.text();

    console.log(`[Vision/Google] Analysis complete: ${analysis.length} chars`);

    return {
        operation: 'analyze',
        provider: 'google',
        model: config.model || 'gemini-pro-vision',
        analysis,
        metadata: {
            processingTime: 0,
        },
    };
}
