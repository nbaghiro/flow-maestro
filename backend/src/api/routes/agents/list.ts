import { FastifyRequest, FastifyReply } from "fastify";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";

export async function listAgentsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const agentRepo = new AgentRepository();

    const agents = await agentRepo.findByUserId(userId);

    reply.send({
        success: true,
        data: agents,
    });
}
