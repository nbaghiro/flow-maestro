export interface EmailVerificationTokenModel {
    id: string;
    user_id: string;
    email: string;
    token_hash: string;
    expires_at: Date;
    verified_at: Date | null;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export interface CreateEmailVerificationTokenInput {
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
}
