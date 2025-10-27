export interface UserModel {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
}

export interface CreateUserInput {
    email: string;
    password_hash: string;
    name?: string;
}

export interface UpdateUserInput {
    email?: string;
    password_hash?: string;
    name?: string;
    last_login_at?: Date;
}
