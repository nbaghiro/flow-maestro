import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError } from "../../middleware";

const getExecutionParamsSchema = z.object({
    id: z.string().uuid(), // agent ID
    executionId: z.string().uuid()
});

export async function getExecutionHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { executionId } = getExecutionParamsSchema.parse(request.params);

    const executionRepo = new AgentExecutionRepository();

    const execution = await executionRepo.findByIdAndUserId(executionId, userId);

    if (!execution) {
        throw new NotFoundError("Agent execution not found");
    }

    reply.send({
        success: true,
        data: execution
    });
}
