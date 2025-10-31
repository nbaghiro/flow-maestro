import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "./utils";
import { getVoiceCommandBus } from "../../../shared/services/VoiceCommandBus";
import { CallExecutionRepository } from "../../../storage/repositories/CallExecutionRepository";
import { globalEventEmitter } from "../../../shared/events/EventEmitter";

export interface VoiceGreetNodeConfig {
    message: string;                    // Text to speak (supports variable interpolation)
    voice?: string;                     // Voice ID (e.g., ElevenLabs voice ID)
    voiceProvider?: "elevenlabs" | "openai";  // TTS provider
    speed?: number;                     // Speech speed (0.5 to 2.0)
    interruptible?: boolean;            // Can user interrupt?
    outputVariable?: string;            // Where to store result
}

export interface VoiceGreetNodeResult {
    success: boolean;
    message: string;
    durationMs?: number;
    interrupted?: boolean;
    error?: string;
}

/**
 * Execute Voice Greet node - Play TTS message to caller
 */
export async function executeVoiceGreetNode(
    config: VoiceGreetNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log("[VoiceGreet] Starting TTS playback");

    // Get call execution ID from context
    const callExecutionId = context.callExecutionId as string;
    if (!callExecutionId) {
        throw new Error("callExecutionId not found in context");
    }

    // Interpolate message with variables
    const message = interpolateVariables(config.message, context);

    console.log(`[VoiceGreet] Message: "${message}"`);

    // Send speak command to agent
    const commandBus = getVoiceCommandBus();

    try {
        const response = await commandBus.sendCommand(
            callExecutionId,
            "speak",
            {
                text: message,
                voice: config.voice,
                voiceProvider: config.voiceProvider || "elevenlabs",
                speed: config.speed || 1.0,
                interruptible: config.interruptible !== false,
            },
            60000 // 60 second timeout (TTS can take a while)
        );

        if (!response.success) {
            throw new Error(response.error || "TTS playback failed");
        }

        // Log transcript (agent speaking)
        const callRepo = new CallExecutionRepository();
        await callRepo.createTranscript({
            call_execution_id: callExecutionId,
            speaker: "agent",
            text: message,
            started_at: new Date(),
            is_final: true,
            interrupted: response.result?.interrupted || false,
        });

        // Emit real-time transcript event
        globalEventEmitter.emitCallTranscript(
            callExecutionId,
            "agent",
            message,
            true
        );

        const result: VoiceGreetNodeResult = {
            success: true,
            message,
            durationMs: response.result?.durationMs,
            interrupted: response.result?.interrupted,
        };

        console.log("[VoiceGreet] TTS playback completed", result);

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        return result as unknown as JsonObject;
    } catch (error: any) {
        console.error("[VoiceGreet] Error:", error.message);

        const result: VoiceGreetNodeResult = {
            success: false,
            message,
            error: error.message,
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        // Re-throw error to trigger Temporal retry
        throw error;
    }
}
