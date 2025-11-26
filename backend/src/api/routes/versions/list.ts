import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import type { FastifyInstance } from "fastify";

export async function listVersionRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(workflowIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const repo = new VersionsRepository();
            const versions = await repo.list(id, request.user!.id);

            return reply.send({
                success: true,
                data: versions
            });
        }
    );
}
