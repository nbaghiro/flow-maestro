import { condition, defineSignal, defineQuery, setHandler } from "@temporalio/workflow";

export interface UserInputWorkflowInput {
    executionId: string;
    nodeId: string;
    prompt: string;
    inputType: string;
    validation?: Record<string, any>;
    timeoutMs?: number;
}

export interface UserInputWorkflowResult {
    success: boolean;
    userResponse?: string;
    timedOut?: boolean;
    error?: string;
}

// Define signal for receiving user input
export const userInputSignal = defineSignal<[string]>("userInput");

// Define query for checking if input has been received
export const hasReceivedInputQuery = defineQuery<boolean>("hasReceivedInput");

/**
 * User Input Workflow
 *
 * Pauses workflow execution and waits for user input via a signal.
 * Supports timeout to prevent workflows from hanging indefinitely.
 */
export async function userInputWorkflow(
    input: UserInputWorkflowInput
): Promise<UserInputWorkflowResult> {
    const { executionId, nodeId, prompt, timeoutMs = 300000 } = input; // 5 min default timeout

    console.log(`Waiting for user input: ${executionId} - ${nodeId} - "${prompt}"`);

    let userResponse: string | undefined;
    let hasReceivedInput = false;

    // Set up signal handler
    setHandler(userInputSignal, (response: string) => {
        console.log(`Received user input for ${executionId} - ${nodeId}`);
        userResponse = response;
        hasReceivedInput = true;
    });

    // Set up query handler
    setHandler(hasReceivedInputQuery, () => hasReceivedInput);

    // Wait for signal with timeout
    const timedOut = !(await condition(() => hasReceivedInput, timeoutMs));

    if (timedOut) {
        console.log(`User input timed out for ${executionId} - ${nodeId}`);
        return {
            success: false,
            timedOut: true,
            error: `User input timed out after ${timeoutMs}ms`
        };
    }

    return {
        success: true,
        userResponse
    };
}
