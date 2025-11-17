import { db } from "../database";

export interface DatabaseConnection {
    id: string;
    user_id: string;
    name: string;
    provider: "postgresql" | "mysql" | "mongodb";
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connection_string?: string;
    ssl_enabled: boolean;
    options?: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDatabaseConnectionInput {
    user_id: string;
    name: string;
    provider: "postgresql" | "mysql" | "mongodb";
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connection_string?: string;
    ssl_enabled?: boolean;
    options?: Record<string, unknown>;
}

export interface UpdateDatabaseConnectionInput {
    name?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connection_string?: string;
    ssl_enabled?: boolean;
    options?: Record<string, unknown>;
}

export class DatabaseConnectionRepository {
    /**
     * Create a new database connection
     */
    async create(input: CreateDatabaseConnectionInput): Promise<DatabaseConnection> {
        const query = `
            INSERT INTO flowmaestro.database_connections (
                user_id,
                name,
                provider,
                host,
                port,
                database,
                username,
                password,
                connection_string,
                ssl_enabled,
                options
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.provider,
            input.host || null,
            input.port || null,
            input.database || null,
            input.username || null,
            input.password || null,
            input.connection_string || null,
            input.ssl_enabled ?? false,
            JSON.stringify(input.options || {})
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find database connection by ID
     */
    async findById(id: string, userId: string): Promise<DatabaseConnection | null> {
        const query = `
            SELECT * FROM flowmaestro.database_connections
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query(query, [id, userId]);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRow(result.rows[0]);
    }

    /**
     * Find all database connections for a user
     */
    async findByUserId(
        userId: string,
        options?: {
            provider?: "postgresql" | "mysql" | "mongodb";
            limit?: number;
            offset?: number;
        }
    ): Promise<{ connections: DatabaseConnection[]; total: number }> {
        let query = `
            SELECT * FROM flowmaestro.database_connections
            WHERE user_id = $1
        `;
        const params: (string | number)[] = [userId];
        let paramIndex = 2;

        // Filter by provider
        if (options?.provider) {
            query += ` AND provider = $${paramIndex}`;
            params.push(options.provider);
            paramIndex++;
        }

        // Order by created date
        query += " ORDER BY created_at DESC";

        // Pagination
        if (options?.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(options.limit);
            paramIndex++;
        }
        if (options?.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(options.offset);
            paramIndex++;
        }

        const result = await db.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) FROM flowmaestro.database_connections
            WHERE user_id = $1
        `;
        const countParams: (string | number)[] = [userId];

        if (options?.provider) {
            countQuery += " AND provider = $2";
            countParams.push(options.provider);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        return {
            connections: result.rows.map(this.mapRow),
            total
        };
    }

    /**
     * Update a database connection
     */
    async update(
        id: string,
        userId: string,
        input: UpdateDatabaseConnectionInput
    ): Promise<DatabaseConnection | null> {
        const updates: string[] = [];
        const values: (string | number | boolean | null)[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(input.name);
            paramIndex++;
        }
        if (input.host !== undefined) {
            updates.push(`host = $${paramIndex}`);
            values.push(input.host || null);
            paramIndex++;
        }
        if (input.port !== undefined) {
            updates.push(`port = $${paramIndex}`);
            values.push(input.port || null);
            paramIndex++;
        }
        if (input.database !== undefined) {
            updates.push(`database = $${paramIndex}`);
            values.push(input.database || null);
            paramIndex++;
        }
        if (input.username !== undefined) {
            updates.push(`username = $${paramIndex}`);
            values.push(input.username || null);
            paramIndex++;
        }
        if (input.password !== undefined) {
            updates.push(`password = $${paramIndex}`);
            values.push(input.password || null);
            paramIndex++;
        }
        if (input.connection_string !== undefined) {
            updates.push(`connection_string = $${paramIndex}`);
            values.push(input.connection_string || null);
            paramIndex++;
        }
        if (input.ssl_enabled !== undefined) {
            updates.push(`ssl_enabled = $${paramIndex}`);
            values.push(input.ssl_enabled);
            paramIndex++;
        }
        if (input.options !== undefined) {
            updates.push(`options = $${paramIndex}`);
            values.push(JSON.stringify(input.options));
            paramIndex++;
        }

        if (updates.length === 0) {
            return this.findById(id, userId);
        }

        updates.push("updated_at = NOW()");

        const query = `
            UPDATE flowmaestro.database_connections
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;

        values.push(id, userId);

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRow(result.rows[0]);
    }

    /**
     * Delete a database connection
     */
    async delete(id: string, userId: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.database_connections
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Map database row to DatabaseConnection object
     */
    private mapRow(row: Record<string, unknown>): DatabaseConnection {
        return {
            id: row.id as string,
            user_id: row.user_id as string,
            name: row.name as string,
            provider: row.provider as "postgresql" | "mysql" | "mongodb",
            host: row.host as string | undefined,
            port: row.port as number | undefined,
            database: row.database as string | undefined,
            username: row.username as string | undefined,
            password: row.password as string | undefined,
            connection_string: row.connection_string as string | undefined,
            ssl_enabled: row.ssl_enabled as boolean,
            options:
                typeof row.options === "string"
                    ? JSON.parse(row.options)
                    : (row.options as Record<string, unknown> | undefined),
            created_at: new Date(row.created_at as string),
            updated_at: new Date(row.updated_at as string)
        };
    }
}
