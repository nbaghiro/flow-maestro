import { FastifyInstance } from "fastify";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { getTemporalClient } from "../../../temporal/client";

export async function addUrlRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/documents/url",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string };
            const body = request.body as { url: string; name?: string };

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

            if (!body.url) {
                return reply.status(400).send({
                    success: false,
                    error: "URL is required"
                });
            }

            // Create document record
            const documentName = body.name || new URL(body.url).hostname;

            const document = await docRepository.create({
                knowledge_base_id: params.id,
                name: documentName,
                source_type: "url",
                source_url: body.url,
                file_type: "html"
            });

            // Start Temporal workflow to process the URL
            const client = await getTemporalClient();
            const workflowId = `process-document-${document.id}`;

            await client.workflow.start("processDocumentWorkflow", {
                taskQueue: "flowmaestro-orchestrator",
                workflowId,
                args: [
                    {
                        documentId: document.id,
                        knowledgeBaseId: params.id,
                        sourceUrl: body.url,
                        fileType: "html",
                        userId: request.user!.id
                    }
                ]
            });

            return reply.status(201).send({
                success: true,
                data: {
                    document,
                    workflowId
                },
                message: "URL added successfully and processing started"
            });
        }
    );
}
