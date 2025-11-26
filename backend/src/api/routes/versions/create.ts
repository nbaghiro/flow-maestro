import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware, validateParams, validateRequest } from "../../middleware";
import { createVersionSchema, type CreateVersionRequest } from "../../schemas/versions.schemas";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import type { FastifyInstance } from "fastify";

export async function createVersionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(workflowIdParamSchema),
                validateRequest(createVersionSchema)
            ]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { name } = request.body as CreateVersionRequest;

            const versionsRepository = new VersionsRepository();
            const version = await versionsRepository.create(id, request.user!.id, name);

            return reply.status(201).send({
                success: true,
                data: version
            });
        }
    );
}
