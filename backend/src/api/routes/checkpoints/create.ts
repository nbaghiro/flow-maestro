import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { authMiddleware, validateParams, validateRequest } from "../../middleware";
import {
    createCheckpointSchema,
    type CreateCheckpointRequest
} from "../../schemas/checkpoint-schemas";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import type { FastifyInstance } from "fastify";

export async function createCheckpointRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(workflowIdParamSchema),
                validateRequest(createCheckpointSchema)
            ]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { name, description } = request.body as CreateCheckpointRequest;

            const checkpointsRepository = new CheckpointsRepository();
            const checkpoint = await checkpointsRepository.create(
                id,
                request.user!.id,
                name,
                description
            );

            return reply.status(201).send({
                success: true,
                data: checkpoint
            });
        }
    );
}
