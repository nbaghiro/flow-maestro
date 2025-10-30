import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { createConnectionSchema, CreateConnectionRequest } from "../../schemas/connection-schemas";
import { authMiddleware, validateBody } from "../../middleware";

export async function createConnectionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateBody(createConnectionSchema)],
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const body = request.body as CreateConnectionRequest;

            const connection = await connectionRepository.create({
                ...body,
                user_id: request.user!.id,
            });

            return reply.status(201).send({
                success: true,
                data: connection,
            });
        }
    );
}
