import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import type { FastifyInstance } from "fastify";

export async function getVersionRoute(fastify: FastifyInstance) {
    fastify.get(
        "/version/:id",
        {
            preHandler: [authMiddleware, validateParams(workflowIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const repo = new VersionsRepository();
            const version = await repo.get(id, request.user!.id);

            return reply.send({
                success: true,
                data: version
            });
        }
    );
}
