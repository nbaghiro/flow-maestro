import { FastifyInstance } from "fastify";
import { createKnowledgeBaseRoute } from "./create";
import { listKnowledgeBasesRoute } from "./list";
import { getKnowledgeBaseRoute } from "./get";
import { updateKnowledgeBaseRoute } from "./update";
import { deleteKnowledgeBaseRoute } from "./delete";
import { getStatsRoute } from "./stats";
import { uploadDocumentRoute } from "./upload-document";
import { addUrlRoute } from "./add-url";
import { listDocumentsRoute } from "./list-documents";
import { deleteDocumentRoute } from "./delete-document";
import { reprocessDocumentRoute } from "./reprocess-document";
import { queryKnowledgeBaseRoute } from "./query";

export async function knowledgeBaseRoutes(fastify: FastifyInstance) {
    // Knowledge Base CRUD
    await listKnowledgeBasesRoute(fastify);
    await createKnowledgeBaseRoute(fastify);
    await getKnowledgeBaseRoute(fastify);
    await updateKnowledgeBaseRoute(fastify);
    await deleteKnowledgeBaseRoute(fastify);
    await getStatsRoute(fastify);

    // Document Management
    await listDocumentsRoute(fastify);
    await uploadDocumentRoute(fastify);
    await addUrlRoute(fastify);
    await deleteDocumentRoute(fastify);
    await reprocessDocumentRoute(fastify);

    // Query
    await queryKnowledgeBaseRoute(fastify);
}
