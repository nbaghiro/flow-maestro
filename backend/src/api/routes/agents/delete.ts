import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { NotFoundError } from "../../middleware";

const deleteAgentParamsSchema = z.object({
    id: z.string().uuid()
});

export async function deleteAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id } = deleteAgentParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();

    // Check if agent exists and belongs to user
    const existingAgent = await agentRepo.findByIdAndUserId(id, userId);
    if (!existingAgent) {
        throw new NotFoundError("Agent not found");
    }

    const deleted = await agentRepo.delete(id);

    if (!deleted) {
        throw new NotFoundError("Agent not found");
    }

    reply.send({
        success: true,
        message: "Agent deleted successfully"
    });
}
