import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { authMiddleware, validateParams, validateRequest } from "../../middleware";
import { checkpointIdParamSchema, renameCheckpointSchema } from "../../schemas/checkpoint-schemas";
import type { FastifyInstance } from "fastify";

export async function renameCheckpointRoute(fastify: FastifyInstance) {
    fastify.post(
        "/rename/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(checkpointIdParamSchema),
                validateRequest(renameCheckpointSchema)
            ]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { name } = request.body as { name: string };

            const repo = new CheckpointsRepository();
            const updated = await repo.rename(id, request.user!.id, name);

            return reply.send({ success: true, data: updated });
        }
    );
}
