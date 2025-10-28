import { db } from "../database";
import {
    CredentialModel,
    CredentialWithData,
    CreateCredentialInput,
    UpdateCredentialInput,
    CredentialSummary,
    CredentialData,
    CredentialType,
    CredentialStatus
} from "../models/Credential";
import { getEncryptionService } from "../../services/EncryptionService";

export class CredentialRepository {
    private encryptionService = getEncryptionService();

    /**
     * Create a new credential
     */
    async create(input: CreateCredentialInput): Promise<CredentialSummary> {
        // Encrypt the credential data
        const encryptedData = this.encryptionService.encryptObject(input.data);

        const query = `
            INSERT INTO flowmaestro.credentials (
                user_id,
                name,
                type,
                provider,
                encrypted_data,
                metadata,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.type,
            input.provider,
            encryptedData,
            JSON.stringify(input.metadata || {}),
            input.status || 'active'
        ];

        const result = await db.query<CredentialModel>(query, values);
        return this.mapToSummary(result.rows[0]);
    }

    /**
     * Find credential by ID (returns summary without decrypted data)
     */
    async findById(id: string): Promise<CredentialSummary | null> {
        const query = `
            SELECT * FROM flowmaestro.credentials
            WHERE id = $1
        `;

        const result = await db.query<CredentialModel>(query, [id]);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0]) : null;
    }

    /**
     * Find credential by ID with decrypted data
     * ONLY use when you need the actual credentials
     */
    async findByIdWithData(id: string): Promise<CredentialWithData | null> {
        const query = `
            SELECT * FROM flowmaestro.credentials
            WHERE id = $1
        `;

        const result = await db.query<CredentialModel>(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToCredentialWithData(result.rows[0]);
    }

    /**
     * Find credentials by user ID
     */
    async findByUserId(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            provider?: string;
            type?: CredentialType;
            status?: CredentialStatus;
        } = {}
    ): Promise<{ credentials: CredentialSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.credentials
            WHERE user_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.credentials
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

        if (options.type) {
            countQuery += ` AND type = $${countParams.length + 1}`;
            query += ` AND type = $${queryParams.length + 1}`;
            countParams.push(options.type);
            queryParams.push(options.type);
        }

        if (options.status) {
            countQuery += ` AND status = $${countParams.length + 1}`;
            query += ` AND status = $${queryParams.length + 1}`;
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, credentialsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<CredentialModel>(query, queryParams)
        ]);

        return {
            credentials: credentialsResult.rows.map((row) => this.mapToSummary(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find credentials by provider
     */
    async findByProvider(userId: string, provider: string): Promise<CredentialSummary[]> {
        const query = `
            SELECT * FROM flowmaestro.credentials
            WHERE user_id = $1 AND provider = $2 AND status = 'active'
            ORDER BY created_at DESC
        `;

        const result = await db.query<CredentialModel>(query, [userId, provider]);
        return result.rows.map((row) => this.mapToSummary(row));
    }

    /**
     * Update a credential
     */
    async update(id: string, input: UpdateCredentialInput): Promise<CredentialSummary | null> {
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

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.credentials
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<CredentialModel>(query, values);
        return result.rows.length > 0 ? this.mapToSummary(result.rows[0]) : null;
    }

    /**
     * Update OAuth tokens (for token refresh)
     */
    async updateTokens(id: string, tokenData: any): Promise<void> {
        // First, get the current credential to preserve other data
        const current = await this.findByIdWithData(id);
        if (!current) {
            throw new Error(`Credential not found: ${id}`);
        }

        // Merge new tokens with existing data
        const updatedData = {
            ...current.data,
            ...tokenData
        };

        // Encrypt and update
        const encryptedData = this.encryptionService.encryptObject(updatedData);

        // Update metadata with new expiry time if provided
        let metadata = current.metadata;
        if (tokenData.expires_in) {
            metadata = {
                ...metadata,
                expires_at: Date.now() + (tokenData.expires_in * 1000)
            };
        }

        const query = `
            UPDATE flowmaestro.credentials
            SET encrypted_data = $1, metadata = $2, status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;

        await db.query(query, [encryptedData, JSON.stringify(metadata), id]);
    }

    /**
     * Mark credential as used (update last_used_at)
     */
    async markAsUsed(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.credentials
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Mark credential as tested (update last_tested_at and status)
     */
    async markAsTested(id: string, status: CredentialStatus): Promise<void> {
        const query = `
            UPDATE flowmaestro.credentials
            SET last_tested_at = CURRENT_TIMESTAMP, status = $1
            WHERE id = $2
        `;

        await db.query(query, [status, id]);
    }

    /**
     * Delete a credential
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.credentials
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Check if credential is expired (for OAuth tokens)
     */
    isExpired(credential: CredentialSummary): boolean {
        if (!credential.metadata?.expires_at) {
            return false;
        }

        // Consider expired if expires within 5 minutes
        const expiresAt = credential.metadata.expires_at;
        const now = Date.now();
        const buffer = 5 * 60 * 1000; // 5 minutes

        return expiresAt < (now + buffer);
    }

    /**
     * Get credentials that need token refresh
     */
    async findExpiringSoon(userId: string): Promise<CredentialSummary[]> {
        // Get all OAuth credentials
        const { credentials } = await this.findByUserId(userId, {
            type: 'oauth2',
            status: 'active'
        });

        // Filter to those expiring within 5 minutes
        return credentials.filter(cred => this.isExpired(cred));
    }

    /**
     * Get the user_id for a credential (for authorization checks)
     */
    async getOwnerId(credentialId: string): Promise<string | null> {
        const query = 'SELECT user_id FROM flowmaestro.credentials WHERE id = $1';
        const result = await db.query<{ user_id: string }>(query, [credentialId]);
        return result.rows[0]?.user_id || null;
    }

    /**
     * Map database row to summary (safe for API responses)
     */
    private mapToSummary(row: any): CredentialSummary {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            provider: row.provider,
            status: row.status,
            metadata: typeof row.metadata === "string"
                ? JSON.parse(row.metadata)
                : row.metadata,
            last_tested_at: row.last_tested_at ? new Date(row.last_tested_at) : null,
            last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    /**
     * Map database row to credential with decrypted data
     * ONLY use internally when you need the actual credentials
     */
    private mapToCredentialWithData(row: any): CredentialWithData {
        const summary = this.mapToSummary(row);
        const data = this.encryptionService.decryptObject<CredentialData>(row.encrypted_data);

        return {
            ...summary,
            user_id: row.user_id,
            data
        };
    }
}
