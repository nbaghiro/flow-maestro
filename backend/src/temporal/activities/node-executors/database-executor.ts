import { Pool, PoolClient } from "pg";
import { MongoClient, Db, Document } from "mongodb";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "./utils";

export interface DatabaseNodeConfig {
    provider: "postgresql" | "mysql" | "mongodb";
    operation: "query" | "insert" | "update" | "delete";

    // Connection
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;

    // For SQL databases
    query?: string; // SQL query
    parameters?: JsonValue[]; // Parameterized values

    // For MongoDB
    collection?: string;
    document?: JsonObject | JsonObject[];
    filter?: JsonObject;
    update?: JsonObject;
    projection?: JsonObject;
    sort?: JsonObject;
    limit?: number;
    skip?: number;

    // Options
    timeout?: number;
    maxRows?: number; // Limit result set size

    outputVariable?: string;
}

export interface DatabaseNodeResult {
    operation: string;
    provider: string;

    // Query results
    rows?: JsonObject[];
    rowCount?: number;

    // Insert/Update/Delete results
    affectedRows?: number;
    insertId?: JsonValue;

    metadata?: {
        queryTime: number;
        rowsReturned?: number;
    };
}

// Connection pools (reuse across executions)
const pgPools = new Map<string, Pool>();
const mongoClients = new Map<string, MongoClient>();

/**
 * Execute Database node - query SQL/NoSQL databases
 */
export async function executeDatabaseNode(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    console.log(`[Database] Provider: ${config.provider}, Operation: ${config.operation}`);

    let result: DatabaseNodeResult;

    switch (config.provider) {
        case "postgresql":
            result = await executePostgreSQL(config, context);
            break;

        case "mongodb":
            result = await executeMongoDB(config, context);
            break;

        case "mysql":
            throw new Error("MySQL provider not yet implemented");

        default:
            throw new Error(`Unsupported database provider: ${config.provider}`);
    }

    const queryTime = Date.now() - startTime;
    result.metadata = {
        ...result.metadata,
        queryTime
    };

    console.log(
        `[Database] Completed in ${queryTime}ms, ${result.rowCount || result.affectedRows || 0} rows`
    );

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

/**
 * Execute PostgreSQL query
 */
async function executePostgreSQL(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<DatabaseNodeResult> {
    // Build connection string
    const connectionString = config.connectionString
        ? interpolateVariables(config.connectionString, context)
        : buildPostgreSQLConnectionString(config, context);

    // Get or create connection pool
    let pool = pgPools.get(connectionString);
    if (!pool) {
        pool = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: config.timeout || 5000
        });
        pgPools.set(connectionString, pool);

        console.log("[Database/PostgreSQL] Created new connection pool");
    }

    const client: PoolClient = await pool.connect();

    try {
        if (config.operation === "query") {
            // Execute SELECT query
            const query = interpolateVariables(config.query || "", context);
            const parameters = Array.isArray(config.parameters)
                ? config.parameters.map((p) =>
                      typeof p === "string" ? interpolateVariables(p, context) : p
                  )
                : [];

            console.log(`[Database/PostgreSQL] Executing query: ${query.substring(0, 100)}...`);

            const result = await client.query(query, parameters);

            // Limit rows if specified
            const rows = config.maxRows ? result.rows.slice(0, config.maxRows) : result.rows;

            return {
                operation: "query",
                provider: "postgresql",
                rows,
                rowCount: result.rowCount || 0,
                metadata: {
                    queryTime: 0,
                    rowsReturned: rows.length
                }
            };
        } else if (config.operation === "insert") {
            // Execute INSERT
            const query = interpolateVariables(config.query || "", context);
            const parameters = Array.isArray(config.parameters)
                ? config.parameters.map((p) =>
                      typeof p === "string" ? interpolateVariables(p, context) : p
                  )
                : [];

            console.log("[Database/PostgreSQL] Executing insert");

            const result = await client.query(query, parameters);

            return {
                operation: "insert",
                provider: "postgresql",
                affectedRows: result.rowCount || 0,
                insertId: result.rows[0]?.id, // If RETURNING id
                metadata: {
                    queryTime: 0,
                    rowsReturned: 0
                }
            };
        } else if (config.operation === "update" || config.operation === "delete") {
            // Execute UPDATE or DELETE
            const query = interpolateVariables(config.query || "", context);
            const parameters = Array.isArray(config.parameters)
                ? config.parameters.map((p) =>
                      typeof p === "string" ? interpolateVariables(p, context) : p
                  )
                : [];

            console.log(`[Database/PostgreSQL] Executing ${config.operation}`);

            const result = await client.query(query, parameters);

            return {
                operation: config.operation,
                provider: "postgresql",
                affectedRows: result.rowCount || 0,
                metadata: {
                    queryTime: 0,
                    rowsReturned: 0
                }
            };
        } else {
            throw new Error(`Unsupported operation: ${config.operation}`);
        }
    } finally {
        client.release();
    }
}

/**
 * Execute MongoDB operation
 */
async function executeMongoDB(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<DatabaseNodeResult> {
    // Build connection string
    const connectionString = config.connectionString
        ? interpolateVariables(config.connectionString, context)
        : buildMongoDBConnectionString(config, context);

    // Get or create MongoDB client
    let client = mongoClients.get(connectionString);
    if (!client) {
        client = new MongoClient(connectionString, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: config.timeout || 5000
        });
        await client.connect();
        mongoClients.set(connectionString, client);

        console.log("[Database/MongoDB] Created new connection");
    }

    const dbName = config.database || client.db().databaseName;
    const db: Db = client.db(dbName);
    const collectionName = interpolateVariables(config.collection || "", context);
    const collection = db.collection(collectionName);

    if (config.operation === "query") {
        // Find documents
        const filter = interpolateObject(config.filter || {}, context) as Document;
        const projection = (config.projection || {}) as Document;
        const sort = (config.sort || {}) as Document;
        const limit = config.limit || 1000;
        const skip = config.skip || 0;

        console.log(`[Database/MongoDB] Finding documents in ${collectionName}`);

        const cursor = collection
            .find(filter, { projection })
            .sort(sort)
            .limit(config.maxRows || limit)
            .skip(skip);

        const rows = (await cursor.toArray()) as JsonObject[];

        return {
            operation: "query",
            provider: "mongodb",
            rows,
            rowCount: rows.length,
            metadata: {
                queryTime: 0,
                rowsReturned: rows.length
            }
        };
    } else if (config.operation === "insert") {
        // Insert document(s)
        const document = interpolateObject(config.document || {}, context);

        console.log(`[Database/MongoDB] Inserting document(s) into ${collectionName}`);

        if (Array.isArray(document)) {
            const result = await collection.insertMany(document as Document[]);
            return {
                operation: "insert",
                provider: "mongodb",
                affectedRows: result.insertedCount,
                insertId: Object.values(result.insertedIds).map((id) => id.toString()),
                metadata: {
                    queryTime: 0,
                    rowsReturned: 0
                }
            };
        } else {
            const result = await collection.insertOne(document as Document);
            return {
                operation: "insert",
                provider: "mongodb",
                affectedRows: result.acknowledged ? 1 : 0,
                insertId: result.insertedId.toString(),
                metadata: {
                    queryTime: 0,
                    rowsReturned: 0
                }
            };
        }
    } else if (config.operation === "update") {
        // Update document(s)
        const filter = interpolateObject(config.filter || {}, context) as Document;
        const update = interpolateObject(config.update || {}, context) as Document;

        console.log(`[Database/MongoDB] Updating documents in ${collectionName}`);

        const result = await collection.updateMany(filter, update);

        return {
            operation: "update",
            provider: "mongodb",
            affectedRows: result.modifiedCount,
            metadata: {
                queryTime: 0,
                rowsReturned: 0
            }
        };
    } else if (config.operation === "delete") {
        // Delete document(s)
        const filter = interpolateObject(config.filter || {}, context) as Document;

        console.log(`[Database/MongoDB] Deleting documents from ${collectionName}`);

        const result = await collection.deleteMany(filter);

        return {
            operation: "delete",
            provider: "mongodb",
            affectedRows: result.deletedCount,
            metadata: {
                queryTime: 0,
                rowsReturned: 0
            }
        };
    } else {
        throw new Error(`Unsupported operation: ${config.operation}`);
    }
}

/**
 * Build PostgreSQL connection string from config
 */
function buildPostgreSQLConnectionString(config: DatabaseNodeConfig, context: JsonObject): string {
    const host = interpolateVariables(config.host || "localhost", context);
    const port = config.port || 5432;
    const database = interpolateVariables(config.database || "", context);
    const username = interpolateVariables(config.username || "", context);
    const password = interpolateVariables(config.password || "", context);

    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
}

/**
 * Build MongoDB connection string from config
 */
function buildMongoDBConnectionString(config: DatabaseNodeConfig, context: JsonObject): string {
    const host = interpolateVariables(config.host || "localhost", context);
    const port = config.port || 27017;
    const database = interpolateVariables(config.database || "test", context);
    const username = interpolateVariables(config.username || "", context);
    const password = interpolateVariables(config.password || "", context);

    if (username && password) {
        return `mongodb://${username}:${password}@${host}:${port}/${database}`;
    } else {
        return `mongodb://${host}:${port}/${database}`;
    }
}

/**
 * Interpolate variables in an object recursively
 */
function interpolateObject(obj: JsonValue, context: JsonObject): JsonValue {
    if (typeof obj === "string") {
        return interpolateVariables(obj, context);
    } else if (Array.isArray(obj)) {
        return obj.map((item) => interpolateObject(item, context));
    } else if (obj && typeof obj === "object") {
        const result: JsonObject = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = interpolateObject(obj[key], context);
            }
        }
        return result;
    }
    return obj;
}

/**
 * Clean up all database connections (call on shutdown)
 */
export async function closeDatabaseConnections(): Promise<void> {
    console.log("[Database] Closing all database connections");

    // Close PostgreSQL pools
    for (const [key, pool] of pgPools.entries()) {
        await pool.end();
        pgPools.delete(key);
    }

    // Close MongoDB clients
    for (const [key, client] of mongoClients.entries()) {
        await client.close();
        mongoClients.delete(key);
    }

    console.log("[Database] All connections closed");
}
