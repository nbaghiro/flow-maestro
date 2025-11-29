import { db } from "../database";
import type {
    PasswordResetTokenModel,
    CreatePasswordResetTokenInput
} from "../models/PasswordResetToken";

export class PasswordResetTokenRepository {
    async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenModel> {
        const query = `
            INSERT INTO flowmaestro.password_reset_tokens (
                user_id,
                token_hash,
                expires_at,
                ip_address,
                user_agent
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            input.userId,
            input.tokenHash,
            input.expiresAt,
            input.ipAddress || null,
            input.userAgent || null
        ];

        const result = await db.query<PasswordResetTokenModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenModel | null> {
        const query = `
            SELECT * FROM flowmaestro.password_reset_tokens
            WHERE token_hash = $1 AND used_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await db.query<PasswordResetTokenModel>(query, [tokenHash]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async markAsUsed(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.password_reset_tokens
            SET used_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async deleteExpired(): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.password_reset_tokens
            WHERE expires_at < NOW() - INTERVAL '24 hours'
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }

    async countRecentByEmail(email: string, windowMinutes: number): Promise<number> {
        const query = `
            SELECT COUNT(*)
            FROM flowmaestro.password_reset_tokens prt
            JOIN flowmaestro.users u ON prt.user_id = u.id
            WHERE u.email = $1
            AND prt.created_at > NOW() - INTERVAL '${windowMinutes} minutes'
        `;

        const result = await db.query<{ count: string }>(query, [email]);
        return parseInt(result.rows[0].count, 10);
    }

    private mapRow(row: {
        id: string;
        user_id: string;
        token_hash: string;
        expires_at: Date | string;
        used_at: Date | string | null;
        created_at: Date | string;
        ip_address: string | null;
        user_agent: string | null;
    }): PasswordResetTokenModel {
        return {
            id: row.id,
            user_id: row.user_id,
            token_hash: row.token_hash,
            expires_at:
                typeof row.expires_at === "string" ? new Date(row.expires_at) : row.expires_at,
            used_at: row.used_at
                ? typeof row.used_at === "string"
                    ? new Date(row.used_at)
                    : row.used_at
                : null,
            created_at:
                typeof row.created_at === "string" ? new Date(row.created_at) : row.created_at,
            ip_address: row.ip_address,
            user_agent: row.user_agent
        };
    }
}
