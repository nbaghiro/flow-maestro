/**
 * Global Test Setup
 * Initializes test database and services before all tests
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.join(__dirname, "../../.env.test") });

let testPool: Pool | null = null;

/**
 * Get or create test database pool
 */
export function getTestPool(): Pool {
    if (!testPool) {
        testPool = new Pool({
            host: process.env.POSTGRES_HOST || "localhost",
            port: parseInt(process.env.POSTGRES_PORT || "5432"),
            database: process.env.POSTGRES_DB || "flowmaestro",
            user: process.env.POSTGRES_USER || "flowmaestro",
            password:
                process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password",
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }

    return testPool;
}

/**
 * Close test database pool
 */
export async function closeTestPool(): Promise<void> {
    if (testPool) {
        await testPool.end();
        testPool = null;
    }
}

/**
 * Setup function called before all tests
 */
export default async function globalSetup(): Promise<void> {
    console.log("🔧 Setting up test environment...");

    // Ensure required environment variables are set
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "error";
    process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
    process.env.ENCRYPTION_KEY =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    // Test database connection
    try {
        const pool = getTestPool();
        await pool.query("SELECT NOW()");
        console.log("✅ Database connection successful");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }

    console.log("✅ Test environment ready");
}
