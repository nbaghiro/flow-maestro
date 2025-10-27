#!/usr/bin/env node

const { Connection } = require("@temporalio/client");

async function testTemporal() {
    try {
        console.log("🔍 Testing Temporal connection...");

        const connection = await Connection.connect({
            address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
        });

        console.log("✅ Connected to Temporal");

        // Test basic health
        const health = await connection.workflowService.getSystemInfo({});
        console.log(`✅ Server version: ${health.serverVersion}`);
        console.log(`✅ Temporal connection test passed!`);

        await connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Temporal connection failed:");
        console.error(error.message);
        console.error("\nMake sure Temporal is running: docker-compose up temporal");
        process.exit(1);
    }
}

testTemporal();
