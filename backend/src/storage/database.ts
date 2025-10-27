import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

class Database {
    private pool: Pool;
    private static instance: Database;

    private constructor(config: DatabaseConfig) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            max: config.max || 20,
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || 2000
        });

        this.pool.on("error", (err) => {
            console.error("Unexpected database error:", err);
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            const config: DatabaseConfig = {
                host: process.env.POSTGRES_HOST || "localhost",
                port: parseInt(process.env.POSTGRES_PORT || "5432"),
                database: process.env.POSTGRES_DB || "flowmaestro",
                user: process.env.POSTGRES_USER || "flowmaestro",
                password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
            };
            Database.instance = new Database(config);
        }
        return Database.instance;
    }

    public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();
        try {
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - start;

            if (process.env.LOG_LEVEL === "debug") {
                console.log("Executed query", { text, duration, rows: result.rowCount });
            }

            return result;
        } catch (error) {
            console.error("Database query error:", { text, error });
            throw error;
        }
    }

    public async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async healthCheck(): Promise<boolean> {
        try {
            await this.query("SELECT 1");
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const db = Database.getInstance();
export { Database };
