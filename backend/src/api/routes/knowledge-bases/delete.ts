import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function deleteKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };

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

            // Delete (cascades to documents and chunks)
            await kbRepository.delete(params.id);

            return reply.send({
                success: true,
                message: "Knowledge base deleted successfully"
            });
        }
    );
}
