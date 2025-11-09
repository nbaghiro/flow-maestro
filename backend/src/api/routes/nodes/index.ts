import { FastifyInstance } from "fastify";
import { getNodeMetadataRoute } from "./get";
import { listNodesRoute } from "./list";

export async function nodeRoutes(fastify: FastifyInstance) {
    // Register all node routes
    await listNodesRoute(fastify);
    await getNodeMetadataRoute(fastify);
}
