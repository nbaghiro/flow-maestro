#!/usr/bin/env node

const redis = require("redis");

const client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379
    }
});

async function testRedis() {
    try {
        console.log("🔍 Testing Redis connection...");

        await client.connect();
        console.log("✅ Connected to Redis");

        // Test set/get
        await client.set("test:key", "Hello FlowMaestro!");
        const value = await client.get("test:key");
        console.log(`✅ Set/Get test: ${value}`);

        // Test delete
        await client.del("test:key");
        console.log("✅ Delete test passed");

        // Get Redis info
        const info = await client.info("server");
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        console.log(`✅ Redis version: ${version}`);

        await client.quit();
        console.log("✅ Redis connection test passed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Redis connection failed:");
        console.error(error.message);
        process.exit(1);
    }
}

testRedis();
