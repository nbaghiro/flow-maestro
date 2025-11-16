import { MongoClient, Db, Document } from "mongodb";
import { Pool, PoolClient } from "pg";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { interpolateVariables } from "./utils";

export interface DatabaseNodeConfig {
    databaseType: "postgresql" | "mysql" | "mongodb";
    operation: "query" | "insert" | "update" | "delete";

    // Option 1: Use saved database connection (recommended)
    databaseConnectionId?: string;

    // Option 2: Direct connection credentials (backwards compatible)
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;

    // For SQL databases
    query?: string; // SQL query
    parameters?: JsonValue[] | string; // Parameterized values (can be JSON string or array)

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
    returnFormat?: "array" | "single" | "count"; // How to format results

    outputVariable?: string;
}

export interface DatabaseNodeResult {
    operation: string;
    databaseType: string;

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

    console.log(`[Database] Provider: ${config.databaseType}, Operation: ${config.operation}`);

    // Normalize parameters (can be JSON string or array)
    const normalizedConfig = { ...config };
    if (typeof config.parameters === "string" && config.parameters.trim()) {
        try {
            normalizedConfig.parameters = JSON.parse(config.parameters) as JsonValue[];
        } catch (error) {
            console.warn("[Database] Failed to parse parameters as JSON, using as-is:", error);
        }
    }

    let result: DatabaseNodeResult;

    switch (config.databaseType) {
        case "postgresql":
            result = await executePostgreSQL(normalizedConfig, context);
            break;

        case "mongodb":
            result = await executeMongoDB(normalizedConfig, context);
            break;

        case "mysql":
            throw new Error("MySQL provider not yet implemented");

        default:
            throw new Error(`Unsupported database type: ${config.databaseType}`);
    }

    const queryTime = Date.now() - startTime;
    result.metadata = {
        ...result.metadata,
        queryTime
    };

    console.log(
        `[Database] Completed in ${queryTime}ms, ${result.rowCount || result.affectedRows || 0} rows`
    );

    // Apply return format if specified
    if (config.returnFormat && result.rows) {
        result = applyReturnFormat(result, config.returnFormat);
    }

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

/**
 * Apply return format to result
 */
function applyReturnFormat(
    result: DatabaseNodeResult,
    returnFormat: "array" | "single" | "count"
): DatabaseNodeResult {
    if (!result.rows) {
        return result;
    }

    switch (returnFormat) {
        case "single":
            // Return only the first row
            return {
                ...result,
                rows: result.rows.length > 0 ? [result.rows[0]] : []
            };
        case "count":
            // Return just the count
            return {
                ...result,
                rows: undefined,
                rowCount: result.rows.length
            };
        case "array":
        default:
            // Return all rows (default behavior)
            return result;
    }
}

/**
 * Get connection details from saved connection or inline credentials
 */
async function getConnectionDetails(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<{
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl_enabled?: boolean;
}> {
    // Option 1: Use saved database connection
    if (config.databaseConnectionId) {
        const repository = new DatabaseConnectionRepository();
        // Note: We need userId from context for authorization
        const userId = (context.userId as string) || "";
        const connection = await repository.findById(config.databaseConnectionId, userId);

        if (!connection) {
            throw new Error(`Database connection not found: ${config.databaseConnectionId}`);
        }

        if (connection.provider !== config.databaseType) {
            throw new Error(
                `Connection provider mismatch: expected ${config.databaseType}, got ${connection.provider}`
            );
        }

        return {
            connectionString: connection.connection_string,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password: connection.password,
            ssl_enabled: connection.ssl_enabled
        };
    }

    // Option 2: Use inline credentials (backwards compatible)
    return {
        connectionString: config.connectionString,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password
    };
}

/**
 * Execute PostgreSQL query
 */
async function executePostgreSQL(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<DatabaseNodeResult> {
    // Get connection details (from saved connection or inline credentials)
    const connDetails = await getConnectionDetails(config, context);

    // Build connection string
    const connectionString = connDetails.connectionString
        ? interpolateVariables(connDetails.connectionString, context)
        : buildPostgreSQLConnectionString(
              {
                  ...config,
                  host: connDetails.host,
                  port: connDetails.port,
                  database: connDetails.database,
                  username: connDetails.username,
                  password: connDetails.password
              },
              context
          );

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
                databaseType: "postgresql",
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
                databaseType: "postgresql",
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
                databaseType: "postgresql",
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
    // Get connection details (from saved connection or inline credentials)
    const connDetails = await getConnectionDetails(config, context);

    // Build connection string
    const connectionString = connDetails.connectionString
        ? interpolateVariables(connDetails.connectionString, context)
        : buildMongoDBConnectionString(
              {
                  ...config,
                  host: connDetails.host,
                  port: connDetails.port,
                  database: connDetails.database,
                  username: connDetails.username,
                  password: connDetails.password
              },
              context
          );

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
            databaseType: "mongodb",
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
                databaseType: "mongodb",
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
                databaseType: "mongodb",
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
            databaseType: "mongodb",
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
            databaseType: "mongodb",
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
