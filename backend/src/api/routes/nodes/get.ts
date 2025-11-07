import { FastifyInstance } from "fastify";
import { nodeRegistry } from "../../../shared/registry/NodeRegistry";
import { nodeTypeParamSchema } from "../../schemas/node-schemas";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";

export async function getNodeMetadataRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:type",
        {
            preHandler: [authMiddleware, validateParams(nodeTypeParamSchema)]
        },
        async (request, reply) => {
            const { type } = request.params as { type: string };

            if (!nodeRegistry.hasNode(type)) {
                throw new NotFoundError(`Node type '${type}' not found`);
            }

            const metadata = nodeRegistry.getMetadata(type);

            return reply.send({
                success: true,
                data: metadata
            });
        }
    );
}
