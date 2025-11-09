import { EventEmitter } from "events";

// Type stubs for browser Web Audio APIs not available in Node.js
type AudioContext = unknown;
type AnalyserNode = unknown;
type ScriptProcessorNode = unknown;
type MediaStream = unknown;
type AudioProcessingEvent = {
    inputBuffer: { getChannelData: (channel: number) => Float32Array };
};

/**
 * Voice Activity Detector
 * Detects when user starts and stops speaking based on audio energy
 */
export class VoiceActivityDetector extends EventEmitter {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private isActive: boolean = false;
    private isSpeaking: boolean = false;

    // VAD parameters
    private readonly ENERGY_THRESHOLD = 0.01; // Adjust based on testing
    private readonly SPEECH_START_FRAMES = 3; // Frames above threshold to start speech
    private readonly SPEECH_END_FRAMES = 10; // Frames below threshold to end speech

    private framesAboveThreshold: number = 0;
    private framesBelowThreshold: number = 0;

    constructor() {
        super();
    }

    /**
     * Start detecting voice activity
     */
    start(mediaStream: MediaStream): void {
        if (this.isActive) {
            console.warn("[VAD] Already active");
            return;
        }

        console.log("[VAD] Starting voice activity detection");

        this.isActive = true;
        this.isSpeaking = false;
        this.framesAboveThreshold = 0;
        this.framesBelowThreshold = 0;

        try {
            // Create audio context
            const AudioContextClass =
                (
                    globalThis as typeof globalThis & {
                        AudioContext?: new (options: { sampleRate: number }) => unknown;
                        webkitAudioContext?: new (options: { sampleRate: number }) => unknown;
                    }
                ).AudioContext ||
                (
                    globalThis as typeof globalThis & {
                        webkitAudioContext?: new (options: { sampleRate: number }) => unknown;
                    }
                ).webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error("AudioContext not available");
            }

            this.audioContext = new AudioContextClass({
                sampleRate: 16000
            });

            // Create analyser
            this.analyser = (
                this.audioContext as {
                    createAnalyser: () => {
                        fftSize: number;
                        smoothingTimeConstant: number;
                        connect: (node: unknown) => void;
                        disconnect: () => void;
                    };
                }
            ).createAnalyser();
            (this.analyser as { fftSize: number }).fftSize = 2048;
            (this.analyser as { smoothingTimeConstant: number }).smoothingTimeConstant = 0.8;

            // Connect media stream to analyser
            const source = (
                this.audioContext as {
                    createMediaStreamSource: (stream: unknown) => {
                        connect: (node: unknown) => void;
                    };
                }
            ).createMediaStreamSource(mediaStream);
            source.connect(this.analyser);

            // Create script processor for analysis
            this.processor = (
                this.audioContext as {
                    createScriptProcessor: (
                        bufferSize: number,
                        numberOfInputChannels: number,
                        numberOfOutputChannels: number
                    ) => {
                        onaudioprocess: ((e: AudioProcessingEvent) => void) | null;
                        connect: (node: unknown) => void;
                        disconnect: () => void;
                    };
                    destination: unknown;
                }
            ).createScriptProcessor(2048, 1, 1);
            (this.analyser as { connect: (node: unknown) => void }).connect(this.processor);
            (this.processor as { connect: (node: unknown) => void }).connect(
                (this.audioContext as { destination: unknown }).destination
            );

            // Process audio frames
            (
                this.processor as { onaudioprocess: ((e: AudioProcessingEvent) => void) | null }
            ).onaudioprocess = (e: AudioProcessingEvent) => {
                if (!this.isActive) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const energy = this.calculateEnergy(inputData);

                this.processFrame(energy);
            };

            console.log("[VAD] Voice activity detection started");
        } catch (error) {
            console.error("[VAD] Failed to start:", error);
            this.isActive = false;
            throw error;
        }
    }

    /**
     * Stop detecting voice activity
     */
    stop(): void {
        if (!this.isActive) return;

        console.log("[VAD] Stopping voice activity detection");

        this.isActive = false;

        if (this.processor) {
            (this.processor as { disconnect: () => void }).disconnect();
            this.processor = null;
        }

        if (this.analyser) {
            (this.analyser as { disconnect: () => void }).disconnect();
            this.analyser = null;
        }

        if (this.audioContext) {
            (this.audioContext as { close: () => void }).close();
            this.audioContext = null;
        }

        // If was speaking, emit speech-end
        if (this.isSpeaking) {
            this.isSpeaking = false;
            this.emit("speech-end");
        }

        console.log("[VAD] Voice activity detection stopped");
    }

    /**
     * Calculate energy (RMS) of audio frame
     */
    private calculateEnergy(samples: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }

    /**
     * Process a single audio frame
     */
    private processFrame(energy: number): void {
        const isAboveThreshold = energy > this.ENERGY_THRESHOLD;

        if (isAboveThreshold) {
            this.framesAboveThreshold++;
            this.framesBelowThreshold = 0;

            // Start speech if threshold met
            if (!this.isSpeaking && this.framesAboveThreshold >= this.SPEECH_START_FRAMES) {
                this.isSpeaking = true;
                this.emit("speech-start");
                console.log("[VAD] Speech started");
            }
        } else {
            this.framesBelowThreshold++;
            this.framesAboveThreshold = 0;

            // End speech if threshold met
            if (this.isSpeaking && this.framesBelowThreshold >= this.SPEECH_END_FRAMES) {
                this.isSpeaking = false;
                this.emit("speech-end");
                console.log("[VAD] Speech ended");
            }
        }
    }

    /**
     * Get current speaking state
     */
    isSpeakingNow(): boolean {
        return this.isSpeaking;
    }
}
