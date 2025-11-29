import { db } from "../database";
import type {
    EmailVerificationTokenModel,
    CreateEmailVerificationTokenInput
} from "../models/EmailVerificationToken";

export class EmailVerificationTokenRepository {
    async create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationTokenModel> {
        const query = `
            INSERT INTO flowmaestro.email_verification_tokens (
                user_id,
                email,
                token_hash,
                expires_at,
                ip_address,
                user_agent
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.userId,
            input.email,
            input.tokenHash,
            input.expiresAt,
            input.ipAddress || null,
            input.userAgent || null
        ];

        const result = await db.query<EmailVerificationTokenModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenModel | null> {
        const query = `
            SELECT * FROM flowmaestro.email_verification_tokens
            WHERE token_hash = $1 AND verified_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await db.query<EmailVerificationTokenModel>(query, [tokenHash]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async markAsVerified(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.email_verification_tokens
            SET verified_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async deleteExpired(): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.email_verification_tokens
            WHERE expires_at < NOW() - INTERVAL '24 hours'
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }

    async countRecentByUserId(userId: string, windowMinutes: number): Promise<number> {
        const query = `
            SELECT COUNT(*)
            FROM flowmaestro.email_verification_tokens
            WHERE user_id = $1
            AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
        `;

        const result = await db.query<{ count: string }>(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }

    async findPendingByUserId(userId: string): Promise<EmailVerificationTokenModel | null> {
        const query = `
            SELECT * FROM flowmaestro.email_verification_tokens
            WHERE user_id = $1 AND verified_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await db.query<EmailVerificationTokenModel>(query, [userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    private mapRow(row: {
        id: string;
        user_id: string;
        email: string;
        token_hash: string;
        expires_at: Date | string;
        verified_at: Date | string | null;
        created_at: Date | string;
        ip_address: string | null;
        user_agent: string | null;
    }): EmailVerificationTokenModel {
        return {
            id: row.id,
            user_id: row.user_id,
            email: row.email,
            token_hash: row.token_hash,
            expires_at:
                typeof row.expires_at === "string" ? new Date(row.expires_at) : row.expires_at,
            verified_at: row.verified_at
                ? typeof row.verified_at === "string"
                    ? new Date(row.verified_at)
                    : row.verified_at
                : null,
            created_at:
                typeof row.created_at === "string" ? new Date(row.created_at) : row.created_at,
            ip_address: row.ip_address,
            user_agent: row.user_agent
        };
    }
}
