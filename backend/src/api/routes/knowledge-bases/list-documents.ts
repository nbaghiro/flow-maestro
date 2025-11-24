import { FastifyInstance } from "fastify";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { serializeDocuments } from "./utils";
import type { DocumentStatus } from "../../../storage/models/KnowledgeDocument";

export async function listDocumentsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/documents",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string };
            const query = request.query as {
                limit?: string;
                offset?: string;
                status?: DocumentStatus;
            };

            // Verify ownership
            const kb = await kbRepository.findById(params.id);
            if (!kb) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            if (kb.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            const limit = query.limit ? parseInt(query.limit) : 50;
            const offset = query.offset ? parseInt(query.offset) : 0;

            const result = await docRepository.findByKnowledgeBaseId(params.id, {
                limit,
                offset,
                status: query.status
            });

            return reply.send({
                success: true,
                data: serializeDocuments(result.documents),
                pagination: {
                    total: result.total,
                    limit,
                    offset
                }
            });
        }
    );
}
