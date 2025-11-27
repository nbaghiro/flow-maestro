import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware } from "../../middleware";
import type { FastifyInstance } from "fastify";

export async function renameVersionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/rename/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { name } = request.body as { name: string };

            const versionRepo = new VersionsRepository();
            const updated = await versionRepo.rename(id, request.user!.id, name);

            return reply.send({ success: true, data: updated });
        }
    );
}
