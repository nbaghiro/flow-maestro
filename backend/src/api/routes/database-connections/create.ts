import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";

const createDatabaseConnectionSchema = z.object({
    name: z.string().min(1).max(255),
    provider: z.enum(["postgresql", "mysql", "mongodb"]),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    connection_string: z.string().optional(),
    ssl_enabled: z.boolean().optional(),
    options: z.record(z.unknown()).optional()
});

type CreateDatabaseConnectionBody = z.infer<typeof createDatabaseConnectionSchema>;

export async function createDatabaseConnectionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.post<{ Body: CreateDatabaseConnectionBody }>(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{ Body: CreateDatabaseConnectionBody }>,
            reply: FastifyReply
        ) => {
            const body = createDatabaseConnectionSchema.parse(request.body);
            const userId = request.user!.id;

            const repository = new DatabaseConnectionRepository();
            const connection = await repository.create({
                user_id: userId,
                name: body.name,
                provider: body.provider,
                host: body.host,
                port: body.port,
                database: body.database,
                username: body.username,
                password: body.password,
                connection_string: body.connection_string,
                ssl_enabled: body.ssl_enabled,
                options: body.options
            });

            return reply.code(201).send({
                success: true,
                data: connection
            });
        }
    );
}
