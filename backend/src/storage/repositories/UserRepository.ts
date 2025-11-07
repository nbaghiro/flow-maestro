import { db } from "../database";
import { UserModel, CreateUserInput, UpdateUserInput } from "../models/User";

export class UserRepository {
    async create(input: CreateUserInput): Promise<UserModel> {
        const query = `
            INSERT INTO flowmaestro.users (email, password_hash, name)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [input.email, input.password_hash, input.name || null];

        const result = await db.query<UserModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE id = $1
        `;

        const result = await db.query<UserModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE email = $1
        `;

        const result = await db.query<UserModel>(query, [email]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async update(id: string, input: UpdateUserInput): Promise<UserModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(input.email);
        }

        if (input.password_hash !== undefined) {
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(input.password_hash);
        }

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.last_login_at !== undefined) {
            updates.push(`last_login_at = $${paramIndex++}`);
            values.push(input.last_login_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.users
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<UserModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.users
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: unknown): UserModel {
        const r = row as {
            id: string;
            email: string;
            password_hash: string;
            name: string | null;
            created_at: string | Date;
            updated_at: string | Date;
            last_login_at: string | Date | null;
        };
        return {
            id: r.id,
            email: r.email,
            password_hash: r.password_hash,
            name: r.name,
            created_at: new Date(r.created_at),
            updated_at: new Date(r.updated_at),
            last_login_at: r.last_login_at ? new Date(r.last_login_at) : null
        };
    }
}
