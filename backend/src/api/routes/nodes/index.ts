import { FastifyInstance } from "fastify";
import { listNodesRoute } from "./list";
import { getNodeMetadataRoute } from "./get";

export async function nodeRoutes(fastify: FastifyInstance) {
    // Register all node routes
    await listNodesRoute(fastify);
    await getNodeMetadataRoute(fastify);
}
