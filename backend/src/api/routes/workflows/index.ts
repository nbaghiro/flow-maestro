import { FastifyInstance } from "fastify";
import { createWorkflowRoute } from "./create";
import { getWorkflowRoute } from "./get";
import { listWorkflowsRoute } from "./list";
import { updateWorkflowRoute } from "./update";
import { deleteWorkflowRoute } from "./delete";
import { executeWorkflowRoute } from "./execute";
import { generateWorkflowRoute } from "./generate";
import { generatePromptsRoute } from "./generate-prompts";

export async function workflowRoutes(fastify: FastifyInstance) {
    // Register all workflow routes
    await listWorkflowsRoute(fastify);
    await createWorkflowRoute(fastify);
    await getWorkflowRoute(fastify);
    await updateWorkflowRoute(fastify);
    await deleteWorkflowRoute(fastify);
    await executeWorkflowRoute(fastify);
    await generateWorkflowRoute(fastify);
    await generatePromptsRoute(fastify);
}
