import { FastifyRequest, FastifyReply } from "fastify";
import type { JsonObject } from "@flowmaestro/shared";
import { ThreadStatus } from "../../../storage/models/Thread";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface UpdateThreadParams {
    id: string;
}

interface UpdateThreadBody {
    title?: string;
    status?: ThreadStatus;
    metadata?: JsonObject;
}

export async function updateThreadHandler(
    request: FastifyRequest<{ Params: UpdateThreadParams; Body: UpdateThreadBody }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id } = request.params;
    const { title, status, metadata } = request.body;

    const threadRepo = new ThreadRepository();

    // Verify thread exists and user has access
    const existingThread = await threadRepo.findByIdAndUserId(id, userId);
    if (!existingThread) {
        return reply.code(404).send({
            success: false,
            error: "Thread not found"
        });
    }

    // Update thread
    const thread = await threadRepo.update(id, {
        title,
        status,
        metadata
    });

    reply.send({
        success: true,
        data: thread
    });
}
