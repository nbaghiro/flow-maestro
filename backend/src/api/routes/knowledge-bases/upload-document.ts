import { FastifyInstance } from "fastify";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import * as path from "path";
import { DocumentFileType } from "../../../storage/models/KnowledgeDocument";
import { getTemporalClient } from "../../../temporal/client";
import { getGCSStorageService } from "../../../services/storage/GCSStorageService";

export async function uploadDocumentRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/documents/upload",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string };

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

            // Handle multipart file upload
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({
                    success: false,
                    error: "No file provided"
                });
            }

            // Validate file type
            const fileExtension = path.extname(data.filename).toLowerCase().substring(1);
            const validExtensions = ["pdf", "docx", "doc", "txt", "md", "html", "json", "csv"];

            if (!validExtensions.includes(fileExtension)) {
                return reply.status(400).send({
                    success: false,
                    error: `Unsupported file type: ${fileExtension}. Supported types: ${validExtensions.join(", ")}`
                });
            }

            // Upload file to GCS
            const gcsService = getGCSStorageService();
            const gcsUri = await gcsService.upload(data.file, {
                userId: request.user!.id,
                knowledgeBaseId: params.id,
                filename: data.filename
            });

            // Get file metadata from GCS
            const metadata = await gcsService.getMetadata(gcsUri);

            // Create document record with GCS URI
            const document = await docRepository.create({
                knowledge_base_id: params.id,
                name: data.filename,
                source_type: "file",
                file_path: gcsUri,
                file_type: fileExtension as DocumentFileType,
                file_size: BigInt(metadata.size)
            });

            // Start Temporal workflow to process the document
            const client = await getTemporalClient();
            const workflowId = `process-document-${document.id}`;

            await client.workflow.start("processDocumentWorkflow", {
                taskQueue: "flowmaestro-orchestrator",
                workflowId,
                args: [
                    {
                        documentId: document.id,
                        knowledgeBaseId: params.id,
                        filePath: gcsUri,
                        fileType: fileExtension,
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
                message: "Document uploaded successfully and processing started"
            });
        }
    );
}
