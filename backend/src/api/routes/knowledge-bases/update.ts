import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function updateKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };
            const body = request.body as any;

            // Verify ownership
            const existing = await kbRepository.findById(params.id);
            if (!existing) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            if (existing.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            const updated = await kbRepository.update(params.id, {
                name: body.name,
                description: body.description,
                config: body.config
            });

            return reply.send({
                success: true,
                data: updated
            });
        }
    );
}
