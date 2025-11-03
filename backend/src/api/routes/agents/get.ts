import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { NotFoundError } from "../../middleware";

const getAgentParamsSchema = z.object({
    id: z.string().uuid(),
});

export async function getAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id } = getAgentParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();
    const agent = await agentRepo.findByIdAndUserId(id, userId);

    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    reply.send({
        success: true,
        data: agent,
    });
}
