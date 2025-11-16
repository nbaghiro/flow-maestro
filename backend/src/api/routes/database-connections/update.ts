import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";
import { AppError } from "../../middleware/error-handler";

interface UpdateDatabaseConnectionParams {
    id: string;
}

const updateDatabaseConnectionSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    connection_string: z.string().optional(),
    ssl_enabled: z.boolean().optional(),
    options: z.record(z.unknown()).optional()
});

type UpdateDatabaseConnectionBody = z.infer<typeof updateDatabaseConnectionSchema>;

export async function updateDatabaseConnectionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.put<{ Params: UpdateDatabaseConnectionParams; Body: UpdateDatabaseConnectionBody }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{
                Params: UpdateDatabaseConnectionParams;
                Body: UpdateDatabaseConnectionBody;
            }>,
            reply: FastifyReply
        ) => {
            const { id } = request.params;
            const body = updateDatabaseConnectionSchema.parse(request.body);
            const userId = request.user!.id;

            const repository = new DatabaseConnectionRepository();
            const connection = await repository.update(id, userId, body);

            if (!connection) {
                throw new AppError(404, "Database connection not found or cannot be modified");
            }

            return reply.send({
                success: true,
                data: connection
            });
        }
    );
}
