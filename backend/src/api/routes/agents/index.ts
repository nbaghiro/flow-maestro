import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { createAgentHandler } from "./create";
import { listAgentsHandler } from "./list";
import { getAgentHandler } from "./get";
import { updateAgentHandler } from "./update";
import { deleteAgentHandler } from "./delete";
import { executeAgentHandler } from "./execute";
import { sendMessageHandler } from "./send-message";
import { getExecutionHandler } from "./get-execution";

export async function agentRoutes(fastify: FastifyInstance) {
    // All agent routes require authentication
    fastify.addHook("preHandler", authMiddleware);

    // CRUD operations
    fastify.post("/", createAgentHandler);
    fastify.get("/", listAgentsHandler);
    fastify.get("/:id", getAgentHandler);
    fastify.put("/:id", updateAgentHandler);
    fastify.delete("/:id", deleteAgentHandler);

    // Agent execution
    fastify.post("/:id/execute", executeAgentHandler);
    fastify.post("/:id/executions/:executionId/message", sendMessageHandler);
    fastify.get("/:id/executions/:executionId", getExecutionHandler);
}
