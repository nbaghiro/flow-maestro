import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "./utils";
import { getVoiceCommandBus } from "../../../shared/services/VoiceCommandBus";
import { CallExecutionRepository } from "../../../storage/repositories/CallExecutionRepository";
import { globalEventEmitter } from "../../../shared/events/EventEmitter";

export interface MenuOption {
    key: string;                        // "1", "2", "support", etc.
    label: string;                      // "Sales", "Support", etc.
    value?: string;                     // Optional value to return
}

export interface VoiceMenuNodeConfig {
    prompt: string;                     // Menu prompt (supports variables)
    options: MenuOption[];              // Menu options
    inputMethod?: "voice" | "dtmf" | "both";  // How user can respond (default: "both")
    maxRetries?: number;                // Max invalid attempts (default: 2)
    retryPrompt?: string;               // What to say on invalid input
    timeoutSeconds?: number;            // Timeout for user response (default: 10)
    outputVariable?: string;            // Where to store result
}

export interface VoiceMenuNodeResult {
    success: boolean;
    selectedOption: string | null;
    selectedLabel?: string;
    selectedValue?: string;
    inputMethod?: "voice" | "dtmf";
    retryCount?: number;
    error?: string;
}

/**
 * Execute Voice Menu node - Present IVR-style menu
 */
export async function executeVoiceMenuNode(
    config: VoiceMenuNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log("[VoiceMenu] Starting menu interaction");

    // Get call execution ID from context
    const callExecutionId = context.callExecutionId as string;
    if (!callExecutionId) {
        throw new Error("callExecutionId not found in context");
    }

    // Validate options
    if (!config.options || config.options.length === 0) {
        throw new Error("Menu options are required");
    }

    // Interpolate prompt
    const prompt = interpolateVariables(config.prompt, context);

    console.log(`[VoiceMenu] Prompt: "${prompt}"`);
    console.log(`[VoiceMenu] Options:`, config.options);

    const commandBus = getVoiceCommandBus();
    const maxRetries = config.maxRetries || 2;
    let retryCount = 0;

    try {
        while (retryCount <= maxRetries) {
            // Play prompt (or retry prompt)
            const currentPrompt = retryCount === 0
                ? prompt
                : interpolateVariables(
                    config.retryPrompt || "I didn't understand. Please try again.",
                    context
                );

            await commandBus.sendCommand(
                callExecutionId,
                "speak",
                { text: currentPrompt, interruptible: false },
                30000
            );

            // Send menu command to agent
            const response = await commandBus.sendCommand(
                callExecutionId,
                "menu",
                {
                    options: config.options,
                    inputMethod: config.inputMethod || "both",
                    timeoutSeconds: config.timeoutSeconds || 10,
                },
                (config.timeoutSeconds || 10) * 1000 + 10000
            );

            if (!response.success) {
                throw new Error(response.error || "Menu interaction failed");
            }

            const selectedKey = response.result?.selectedOption;
            const inputMethod = response.result?.inputMethod;

            // Check if valid option was selected
            const selectedOption = config.options.find((opt) => opt.key === selectedKey);

            if (selectedOption) {
                console.log(
                    `[VoiceMenu] User selected: ${selectedKey} (${selectedOption.label})`
                );

                // Log the interaction
                const callRepo = new CallExecutionRepository();
                const selectionText = `Selected option: ${selectedKey} - ${selectedOption.label}`;
                await callRepo.createTranscript({
                    call_execution_id: callExecutionId,
                    speaker: "user",
                    text: selectionText,
                    started_at: new Date(),
                    is_final: true,
                });

                // Emit real-time transcript event
                globalEventEmitter.emitCallTranscript(
                    callExecutionId,
                    "user",
                    selectionText,
                    true
                );

                const result: VoiceMenuNodeResult = {
                    success: true,
                    selectedOption: selectedKey,
                    selectedLabel: selectedOption.label,
                    selectedValue: selectedOption.value || selectedKey,
                    inputMethod,
                    retryCount,
                };

                if (config.outputVariable) {
                    return {
                        [config.outputVariable]: result,
                        // Also set a convenience variable for routing
                        [`${config.outputVariable}_value`]: selectedOption.value || selectedKey,
                    } as unknown as JsonObject;
                }

                return {
                    selectedOption: selectedKey,
                    selectedLabel: selectedOption.label,
                    selectedValue: selectedOption.value || selectedKey,
                    inputMethod,
                } as unknown as JsonObject;
            } else {
                // Invalid selection
                console.log(`[VoiceMenu] Invalid selection: ${selectedKey}`);
                retryCount++;

                if (retryCount > maxRetries) {
                    throw new Error(`Max retries (${maxRetries}) exceeded for menu`);
                }
            }
        }

        // Should not reach here
        throw new Error("Menu interaction failed after retries");
    } catch (error: any) {
        console.error("[VoiceMenu] Error:", error.message);

        const result: VoiceMenuNodeResult = {
            success: false,
            selectedOption: null,
            retryCount,
            error: error.message,
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        // Re-throw error to trigger Temporal retry
        throw error;
    }
}
