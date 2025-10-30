import { db } from "../database";
import {
    ConnectionModel,
    ConnectionWithData,
    CreateConnectionInput,
    UpdateConnectionInput,
    ConnectionSummary,
    ConnectionData,
    ConnectionMethod,
    ConnectionStatus,
    MCPTool,
} from "../models/Connection";
import { getEncryptionService } from "../../services/EncryptionService";

export class ConnectionRepository {
    private encryptionService = getEncryptionService();

    /**
     * Create a new connection
     */
    async create(input: CreateConnectionInput): Promise<ConnectionSummary> {
        // Encrypt the connection data
        const encryptedData = this.encryptionService.encryptObject(input.data);

        const query = `
            INSERT INTO flowmaestro.connections (
                user_id,
                name,
                connection_method,
                provider,
                encrypted_data,
                metadata,
                status,
                mcp_server_url,
                mcp_tools,
                capabilities
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.connection_method,
            input.provider,
            encryptedData,
            JSON.stringify(input.metadata || {}),
            input.status || "active",
            input.mcp_server_url || null,
            input.mcp_tools ? JSON.stringify(input.mcp_tools) : null,
            JSON.stringify(input.capabilities || {}),
        ];

        const result = await db.query<ConnectionModel>(query, values);
        return this.mapToSummary(result.rows[0]);
    }

    /**
     * Find connection by ID (returns summary without decrypted data)
     */
    async findById(id: string): Promise<ConnectionSummary | null> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query<ConnectionModel>(query, [id]);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0]) : null;
    }

    /**
     * Find connection by ID with decrypted data
     * ONLY use when you need the actual connection credentials
     */
    async findByIdWithData(id: string): Promise<ConnectionWithData | null> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query<ConnectionModel>(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToConnectionWithData(result.rows[0]);
    }

    /**
     * Find connections by user ID
     */
    async findByUserId(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            provider?: string;
            connection_method?: ConnectionMethod;
            status?: ConnectionStatus;
        } = {}
    ): Promise<{ connections: ConnectionSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.connections
            WHERE user_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1
        `;

        const countParams: any[] = [userId];
        const queryParams: any[] = [userId];

        // Add filters
        if (options.provider) {
            countQuery += ` AND provider = $${countParams.length + 1}`;
            query += ` AND provider = $${queryParams.length + 1}`;
            countParams.push(options.provider);
            queryParams.push(options.provider);
        }

        if (options.connection_method) {
            countQuery += ` AND connection_method = $${countParams.length + 1}`;
            query += ` AND connection_method = $${queryParams.length + 1}`;
            countParams.push(options.connection_method);
            queryParams.push(options.connection_method);
        }

        if (options.status) {
            countQuery += ` AND status = $${countParams.length + 1}`;
            query += ` AND status = $${queryParams.length + 1}`;
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, connectionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<ConnectionModel>(query, queryParams),
        ]);

        return {
            connections: connectionsResult.rows.map((row) => this.mapToSummary(row)),
            total: parseInt(countResult.rows[0].count),
        };
    }

    /**
     * Find connections by provider
     */
    async findByProvider(userId: string, provider: string): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1 AND provider = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query<ConnectionModel>(query, [userId, provider]);
        return result.rows.map((row) => this.mapToSummary(row));
    }

    /**
     * Find connections by connection method
     */
    async findByMethod(userId: string, method: ConnectionMethod): Promise<ConnectionSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.connections
            WHERE user_id = $1 AND connection_method = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query<ConnectionModel>(query, [userId, method]);
        return result.rows.map((row) => this.mapToSummary(row));
    }

    /**
     * Update a connection
     */
    async update(id: string, input: UpdateConnectionInput): Promise<ConnectionSummary | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.data !== undefined) {
            updates.push(`encrypted_data = $${paramIndex++}`);
            values.push(this.encryptionService.encryptObject(input.data));
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.mcp_tools !== undefined) {
            updates.push(`mcp_tools = $${paramIndex++}`);
            values.push(JSON.stringify(input.mcp_tools));
        }

        if (input.capabilities !== undefined) {
            updates.push(`capabilities = $${paramIndex++}`);
            values.push(JSON.stringify(input.capabilities));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.connections
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<ConnectionModel>(query, values);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0]) : null;
    }

    /**
     * Update OAuth tokens (for token refresh)
     */
    async updateTokens(id: string, tokenData: any): Promise<void> {
        // First, get the current connection to preserve other data
        const current = await this.findByIdWithData(id);
        if (!current) {
            throw new Error(`Connection not found: ${id}`);
        }

        // Merge new tokens with existing data
        const updatedData = {
            ...current.data,
            ...tokenData,
        };

        // Encrypt and update
        const encryptedData = this.encryptionService.encryptObject(updatedData);

        // Update metadata with new expiry time if provided
        let metadata = current.metadata;
        if (tokenData.expires_in) {
            metadata = {
                ...metadata,
                expires_at: Date.now() + tokenData.expires_in * 1000,
            };
        }

        const query = `
            UPDATE flowmaestro.connections
            SET encrypted_data = $1, metadata = $2, status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;

        await db.query(query, [encryptedData, JSON.stringify(metadata), id]);
    }

    /**
     * Update MCP tools (after discovering tools from server)
     */
    async updateMCPTools(id: string, tools: MCPTool[]): Promise<void> {
        const query = `
            UPDATE flowmaestro.connections
            SET mcp_tools = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;

        await db.query(query, [JSON.stringify(tools), id]);
    }

    /**
     * Mark connection as used (update last_used_at)
     */
    async markAsUsed(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.connections
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Mark connection as tested (update last_tested_at and status)
     */
    async markAsTested(id: string, status: ConnectionStatus): Promise<void> {
        const query = `
            UPDATE flowmaestro.connections
            SET last_tested_at = CURRENT_TIMESTAMP, status = $1
            WHERE id = $2
        `;

        await db.query(query, [status, id]);
    }

    /**
     * Delete a connection
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.connections
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Check if connection is expired (for OAuth tokens)
     */
    isExpired(connection: ConnectionSummary): boolean {
        if (!connection.metadata?.expires_at) {
            return false;
        }

        // Consider expired if expires within 5 minutes
        const expiresAt = connection.metadata.expires_at;
        const now = Date.now();
        const buffer = 5 * 60 * 1000; // 5 minutes

        return expiresAt < now + buffer;
    }

    /**
     * Get connections that need token refresh
     */
    async findExpiringSoon(userId: string): Promise<ConnectionSummary[]> {
        // Get all OAuth connections
        const { connections } = await this.findByUserId(userId, {
            connection_method: "oauth2",
            status: "active",
        });

        // Filter to those expiring within 5 minutes
        return connections.filter((conn) => this.isExpired(conn));
    }

    /**
     * Get the user_id for a connection (for authorization checks)
     */
    async getOwnerId(connectionId: string): Promise<string | null> {
        const query = "SELECT user_id FROM flowmaestro.connections WHERE id = $1";
        const result = await db.query<{ user_id: string }>(query, [connectionId]);
        return result.rows[0]?.user_id || null;
    }

    /**
     * Map database row to summary (safe for API responses)
     */
    private mapToSummary(row: any): ConnectionSummary {
        return {
            id: row.id,
            name: row.name,
            connection_method: row.connection_method,
            provider: row.provider,
            status: row.status,
            metadata:
                typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            mcp_server_url: row.mcp_server_url,
            mcp_tools:
                row.mcp_tools !== null
                    ? typeof row.mcp_tools === "string"
                        ? JSON.parse(row.mcp_tools)
                        : row.mcp_tools
                    : null,
            capabilities:
                typeof row.capabilities === "string"
                    ? JSON.parse(row.capabilities)
                    : row.capabilities,
            last_tested_at: row.last_tested_at ? new Date(row.last_tested_at) : null,
            last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }

    /**
     * Map database row to connection with decrypted data
     * ONLY use internally when you need the actual connection credentials
     */
    private mapToConnectionWithData(row: any): ConnectionWithData {
        const summary = this.mapToSummary(row);
        const data = this.encryptionService.decryptObject<ConnectionData>(row.encrypted_data);

        return {
            ...summary,
            user_id: row.user_id,
            data,
        };
    }
}
