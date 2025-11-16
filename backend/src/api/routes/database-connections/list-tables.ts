import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";
import { AppError } from "../../middleware/error-handler";

interface ListTablesParams {
    id: string;
}

interface TableInfo {
    schema: string;
    table: string;
    fullName: string;
}

export async function listTablesRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: ListTablesParams }>(
        "/:id/tables",
        {
            preHandler: [authMiddleware]
        },
        async (request: FastifyRequest<{ Params: ListTablesParams }>, reply: FastifyReply) => {
            const { id } = request.params;
            const userId = request.user!.id;

            // Get database connection
            const repository = new DatabaseConnectionRepository();
            const connection = await repository.findById(id, userId);

            if (!connection) {
                throw new AppError(404, "Database connection not found");
            }

            if (connection.provider !== "postgresql" && connection.provider !== "mysql") {
                throw new AppError(400, "Table listing is only supported for PostgreSQL and MySQL");
            }

            // For PostgreSQL, list tables from information_schema
            if (connection.provider === "postgresql") {
                let pool: Pool | undefined;

                try {
                    // Build connection string
                    const connectionString =
                        connection.connection_string ||
                        `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

                    pool = new Pool({
                        connectionString,
                        ssl: connection.ssl_enabled ? { rejectUnauthorized: false } : false,
                        max: 1,
                        idleTimeoutMillis: 5000,
                        connectionTimeoutMillis: 10000
                    });

                    const result = await pool.query<{
                        table_schema: string;
                        table_name: string;
                    }>(
                        `SELECT table_schema, table_name
                         FROM information_schema.tables
                         WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                         ORDER BY table_schema, table_name`
                    );

                    const tables: TableInfo[] = result.rows.map((row) => ({
                        schema: row.table_schema,
                        table: row.table_name,
                        fullName: `${row.table_schema}.${row.table_name}`
                    }));

                    return reply.send({
                        success: true,
                        data: tables
                    });
                } catch (error) {
                    throw new AppError(
                        500,
                        `Failed to list tables: ${error instanceof Error ? error.message : "Unknown error"}`
                    );
                } finally {
                    if (pool) {
                        await pool.end();
                    }
                }
            }

            // For MySQL, list tables
            if (connection.provider === "mysql") {
                // TODO: Implement MySQL table listing
                throw new AppError(501, "MySQL table listing not yet implemented");
            }

            throw new AppError(400, "Unsupported database provider");
        }
    );
}
