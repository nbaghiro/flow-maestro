import { EventEmitter } from "events";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

// Type stub for MediaStream (browser API not available in Node.js)
type MediaStream = any;

export interface TranscriptResult {
    text: string;
    confidence: number;
    is_final: boolean;
    language?: string;
}

/**
 * Deepgram Speech-to-Text Service
 * Provides streaming STT with real-time transcription
 */
export class DeepgramSTT extends EventEmitter {
    private deepgram: any;
    private connection: any;
    private isActive: boolean = false;

    constructor() {
        super();

        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            throw new Error("DEEPGRAM_API_KEY environment variable is required");
        }

        this.deepgram = createClient(apiKey);
    }

    /**
     * Start streaming STT from media stream
     */
    async start(mediaStream: MediaStream, options: {
        language?: string;
        model?: string;
        punctuate?: boolean;
        interimResults?: boolean;
    } = {}): Promise<void> {
        if (this.isActive) {
            console.warn("[DeepgramSTT] Already active, stopping previous session");
            await this.stop();
        }

        console.log("[DeepgramSTT] Starting streaming transcription");

        this.isActive = true;

        try {
            // Create live transcription connection
            this.connection = this.deepgram.listen.live({
                model: options.model || "nova-2",
                language: options.language || "en-US",
                punctuate: options.punctuate !== false,
                interim_results: options.interimResults !== false,
                encoding: "linear16",
                sample_rate: 16000,
                channels: 1,
            });

            // Handle transcription results
            this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                const result = data.channel?.alternatives?.[0];
                if (!result) return;

                const transcriptResult: TranscriptResult = {
                    text: result.transcript,
                    confidence: result.confidence || 0,
                    is_final: data.is_final || false,
                    language: options.language,
                };

                // Only emit if there's actual text
                if (transcriptResult.text) {
                    this.emit("transcript", transcriptResult);

                    console.log(
                        `[DeepgramSTT] ${transcriptResult.is_final ? "Final" : "Interim"}: "${transcriptResult.text}" (${transcriptResult.confidence})`
                    );
                }
            });

            // Handle errors
            this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
                console.error("[DeepgramSTT] Error:", error);
                this.emit("error", error);
            });

            // Handle connection close
            this.connection.on(LiveTranscriptionEvents.Close, () => {
                console.log("[DeepgramSTT] Connection closed");
                this.isActive = false;
            });

            // Get audio from media stream and send to Deepgram
            await this.streamAudio(mediaStream);
        } catch (error) {
            console.error("[DeepgramSTT] Failed to start:", error);
            this.isActive = false;
            throw error;
        }
    }

    /**
     * Stop streaming STT
     */
    async stop(): Promise<void> {
        if (!this.isActive) return;

        console.log("[DeepgramSTT] Stopping transcription");

        this.isActive = false;

        if (this.connection) {
            try {
                this.connection.finish();
                this.connection = null;
            } catch (error) {
                console.error("[DeepgramSTT] Error stopping connection:", error);
            }
        }
    }

    /**
     * Stream audio from MediaStream to Deepgram
     */
    private async streamAudio(mediaStream: MediaStream): Promise<void> {
        // Create MediaRecorder to capture audio
        const audioContext = new (globalThis as any).AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e: any) => {
            if (!this.isActive || !this.connection) return;

            const inputData = e.inputBuffer.getChannelData(0);

            // Convert Float32Array to Int16Array
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            // Send to Deepgram
            try {
                this.connection.send(int16Data.buffer);
            } catch (error) {
                console.error("[DeepgramSTT] Error sending audio:", error);
            }
        };
    }
}
