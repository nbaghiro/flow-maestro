import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository, KnowledgeDocumentRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import * as fs from "fs/promises";

export async function deleteDocumentRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id/documents/:docId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string; docId: string };

            // Verify KB ownership
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

            // Get document
            const document = await docRepository.findById(params.docId);
            if (!document) {
                return reply.status(404).send({
                    success: false,
                    error: "Document not found"
                });
            }

            // Verify document belongs to this KB
            if (document.knowledge_base_id !== params.id) {
                return reply.status(400).send({
                    success: false,
                    error: "Document does not belong to this knowledge base"
                });
            }

            // Delete the file if it exists
            if (document.file_path && document.source_type === "file") {
                try {
                    await fs.unlink(document.file_path);
                } catch (error) {
                    // Log but don't fail if file doesn't exist
                    console.warn(`Could not delete file: ${document.file_path}`, error);
                }
            }

            // Delete document (cascades to chunks via foreign key)
            await docRepository.delete(params.docId);

            return reply.send({
                success: true,
                message: "Document deleted successfully"
            });
        }
    );
}
