export interface PasswordResetTokenModel {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export interface CreatePasswordResetTokenInput {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
}
