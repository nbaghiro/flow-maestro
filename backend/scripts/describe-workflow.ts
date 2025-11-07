import { getTemporalClient } from "../src/temporal/client";

async function describeWorkflow() {
    const workflowId = process.argv[2];

    if (!workflowId) {
        console.error("Usage: npx tsx scripts/describe-workflow.ts <workflow-id>");
        process.exit(1);
    }

    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);

        const description = await handle.describe();
        console.log("Workflow Description:");
        console.log(JSON.stringify(description, null, 2));

        // Try to get the result or error
        try {
            const result = await handle.result();
            console.log("\nWorkflow Result:");
            console.log(JSON.stringify(result, null, 2));
        } catch (error: unknown) {
            console.log("\nWorkflow Error:");
            console.log(error.message);
            if (error.cause) {
                console.log("Cause:", error.cause);
            }
        }
    } catch (error: unknown) {
        console.error(`❌ Failed to describe workflow: ${error.message}`);
        process.exit(1);
    }
}

describeWorkflow();
