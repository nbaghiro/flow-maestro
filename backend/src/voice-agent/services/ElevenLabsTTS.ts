import { EventEmitter } from "events";
import axios from "axios";

// Type stubs for browser APIs not available in Node.js
type AudioBuffer = any;
type HTMLAudioElement = any;

export interface TTSOptions {
    text: string;
    voice: string;
    voiceProvider: "elevenlabs" | "openai";
    speed?: number;
    stability?: number;
    similarity_boost?: number;
}

/**
 * ElevenLabs Text-to-Speech Service
 * Provides high-quality voice synthesis
 */
export class ElevenLabsTTS extends EventEmitter {
    private currentAudio: HTMLAudioElement | null = null;

    constructor() {
        super();
    }

    /**
     * Synthesize text to speech
     */
    async synthesize(options: TTSOptions): Promise<AudioBuffer> {
        console.log(`[ElevenLabsTTS] Synthesizing: "${options.text}"`);

        if (options.voiceProvider === "elevenlabs") {
            return await this.synthesizeElevenLabs(options);
        } else if (options.voiceProvider === "openai") {
            return await this.synthesizeOpenAI(options);
        } else {
            throw new Error(`Unsupported TTS provider: ${options.voiceProvider}`);
        }
    }

    /**
     * Synthesize using ElevenLabs API
     */
    private async synthesizeElevenLabs(options: TTSOptions): Promise<AudioBuffer> {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            throw new Error("ELEVENLABS_API_KEY environment variable is required");
        }

        const voiceId = options.voice || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel

        try {
            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    text: options.text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: options.stability || 0.5,
                        similarity_boost: options.similarity_boost || 0.75,
                    },
                },
                {
                    headers: {
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": apiKey,
                    },
                    responseType: "arraybuffer",
                }
            );

            // Convert MP3 to AudioBuffer
            const audioBuffer = await this.decodeAudioData(response.data);

            console.log(`[ElevenLabsTTS] Synthesis complete (${audioBuffer.duration}s)`);

            return audioBuffer;
        } catch (error: any) {
            console.error("[ElevenLabsTTS] Synthesis error:", error.response?.data || error.message);
            throw new Error(`ElevenLabs TTS failed: ${error.message}`);
        }
    }

    /**
     * Synthesize using OpenAI TTS API
     */
    private async synthesizeOpenAI(options: TTSOptions): Promise<AudioBuffer> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY environment variable is required");
        }

        const voice = options.voice || "alloy"; // Options: alloy, echo, fable, onyx, nova, shimmer

        try {
            const response = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: "tts-1",
                    input: options.text,
                    voice,
                    speed: options.speed || 1.0,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    responseType: "arraybuffer",
                }
            );

            // Convert to AudioBuffer
            const audioBuffer = await this.decodeAudioData(response.data);

            console.log(`[ElevenLabsTTS] OpenAI synthesis complete (${audioBuffer.duration}s)`);

            return audioBuffer;
        } catch (error: any) {
            console.error("[ElevenLabsTTS] OpenAI TTS error:", error.response?.data || error.message);
            throw new Error(`OpenAI TTS failed: ${error.message}`);
        }
    }

    /**
     * Decode audio data to AudioBuffer
     */
    private async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        // In Node.js, we need to use a different approach
        // For now, return a mock AudioBuffer structure
        // In production, you'd use a library like node-wav or similar

        const duration = arrayBuffer.byteLength / (16000 * 2); // Estimate based on 16kHz, 16-bit

        return {
            duration,
            length: arrayBuffer.byteLength,
            numberOfChannels: 1,
            sampleRate: 16000,
            getChannelData: (_channel: number) => new Float32Array(0),
            copyFromChannel: () => {},
            copyToChannel: () => {},
        } as AudioBuffer;
    }

    /**
     * Stop current playback
     */
    async stop(): Promise<void> {
        if (this.currentAudio) {
            // Note: pause() requires DOM lib, using any type workaround
            (this.currentAudio as any).pause?.();
            this.currentAudio = null;
        }

        console.log("[ElevenLabsTTS] Stopped");
    }
}
