import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function getKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };

            const knowledgeBase = await kbRepository.findById(params.id);

            if (!knowledgeBase) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            // Verify ownership
            if (knowledgeBase.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            return reply.send({
                success: true,
                data: knowledgeBase
            });
        }
    );
}
