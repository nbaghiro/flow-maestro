import { FastifyInstance } from "fastify";
import { nodeRegistry } from "../../../shared/registry/NodeRegistry";
import { authMiddleware } from "../../middleware";

export async function listNodesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (_request, reply) => {
            const metadata = nodeRegistry.getAllMetadata();

            return reply.send({
                success: true,
                data: {
                    items: metadata,
                    total: metadata.length
                }
            });
        }
    );
}
