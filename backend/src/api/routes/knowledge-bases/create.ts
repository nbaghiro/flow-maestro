import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function createKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const body = request.body as any;

            const knowledgeBase = await kbRepository.create({
                user_id: request.user!.id,
                name: body.name,
                description: body.description,
                config: body.config
            });

            return reply.status(201).send({
                success: true,
                data: knowledgeBase
            });
        }
    );
}
