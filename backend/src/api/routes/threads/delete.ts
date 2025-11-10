import { FastifyRequest, FastifyReply } from "fastify";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface DeleteThreadParams {
    id: string;
}

export async function deleteThreadHandler(
    request: FastifyRequest<{ Params: DeleteThreadParams }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id } = request.params;

    const threadRepo = new ThreadRepository();

    // Verify thread exists and user has access
    const thread = await threadRepo.findByIdAndUserId(id, userId);
    if (!thread) {
        return reply.code(404).send({
            success: false,
            error: "Thread not found"
        });
    }

    // Soft delete the thread
    const deleted = await threadRepo.delete(id);

    if (!deleted) {
        return reply.code(500).send({
            success: false,
            error: "Failed to delete thread"
        });
    }

    reply.send({
        success: true,
        message: "Thread deleted successfully"
    });
}
