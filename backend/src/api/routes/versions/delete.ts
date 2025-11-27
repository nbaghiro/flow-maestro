import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { versionIdParamSchema } from "../../schemas/versions.schemas";
import type { FastifyInstance } from "fastify";

export async function deleteVersionRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(versionIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const repo = new VersionsRepository();
            await repo.delete(id, request.user!.id);

            return reply.status(204).send();
        }
    );
}
