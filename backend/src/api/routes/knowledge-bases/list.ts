import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function listKnowledgeBasesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const query = request.query as any;

            const result = await kbRepository.findByUserId(request.user!.id, {
                limit: query.limit ? parseInt(query.limit) : 50,
                offset: query.offset ? parseInt(query.offset) : 0
            });

            return reply.send({
                success: true,
                data: result.knowledgeBases,
                pagination: {
                    total: result.total,
                    limit: query.limit ? parseInt(query.limit) : 50,
                    offset: query.offset ? parseInt(query.offset) : 0
                }
            });
        }
    );
}
