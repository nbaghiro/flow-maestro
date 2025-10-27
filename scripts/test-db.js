#!/usr/bin/env node

const { Client } = require("pg");

const client = new Client({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "flowmaestro",
    user: process.env.POSTGRES_USER || "flowmaestro",
    password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
});

async function testDatabase() {
    try {
        console.log("🔍 Testing PostgreSQL connection...");

        await client.connect();
        console.log("✅ Connected to PostgreSQL");

        const result = await client.query("SELECT current_database(), version()");
        console.log(`✅ Database: ${result.rows[0].current_database}`);
        console.log(`✅ Version: ${result.rows[0].version.split(",")[0]}`);

        // Test if tables exist
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'flowmaestro'
            ORDER BY table_name
        `);

        console.log(`✅ Found ${tablesResult.rows.length} tables:`);
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        await client.end();
        console.log("✅ PostgreSQL connection test passed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ PostgreSQL connection failed:");
        console.error(error.message);
        process.exit(1);
    }
}

testDatabase();
