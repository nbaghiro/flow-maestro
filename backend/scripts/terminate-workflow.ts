import { getTemporalClient } from "../src/temporal/client";

async function terminateWorkflow() {
    const workflowId = process.argv[2];
    const reason = process.argv[3] || "Manual termination";

    if (!workflowId) {
        console.error("Usage: npx tsx scripts/terminate-workflow.ts <workflow-id> [reason]");
        process.exit(1);
    }

    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);

        await handle.terminate(reason);
        console.log(`✅ Successfully terminated workflow: ${workflowId}`);
        console.log(`   Reason: ${reason}`);
    } catch (error: unknown) {
        console.error(`❌ Failed to terminate workflow: ${error.message}`);
        process.exit(1);
    }
}

terminateWorkflow();
