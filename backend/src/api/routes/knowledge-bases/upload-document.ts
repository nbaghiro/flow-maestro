import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository, KnowledgeDocumentRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import * as fs from "fs/promises";
import * as path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { DocumentFileType } from "../../../storage/models/KnowledgeDocument";
import { getTemporalClient } from "../../../temporal/client";

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

            // Create storage directory for this KB
            const storageDir = path.join(
                process.cwd(),
                "backend",
                "storage",
                "knowledge-bases",
                request.user!.id,
                params.id
            );
            await fs.mkdir(storageDir, { recursive: true });

            // Generate unique filename
            const timestamp = Date.now();
            const safeName = data.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `${timestamp}_${safeName}`;
            const filePath = path.join(storageDir, fileName);

            // Save file
            await pipeline(data.file, createWriteStream(filePath));

            // Get file size
            const stats = await fs.stat(filePath);

            // Create document record
            const document = await docRepository.create({
                knowledge_base_id: params.id,
                name: data.filename,
                source_type: "file",
                file_path: filePath,
                file_type: fileExtension as DocumentFileType,
                file_size: BigInt(stats.size)
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
                        filePath,
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
