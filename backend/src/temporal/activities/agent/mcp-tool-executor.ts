import type { JsonObject } from "@flowmaestro/shared";
import { AppError } from "../../../api/middleware/error-handler";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/core/ProviderRegistry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { formatMCPToolResponse } from "./mcp-response-formatter";
import type { Tool } from "../../../storage/models/Agent";

interface ExecuteMCPToolInput {
    tool: Tool;
    arguments: Record<string, unknown>;
    userId: string;
    executionId: string;
}

export async function executeMCPTool(input: ExecuteMCPToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    // Validate tool config
    if (!tool.config.connectionId) {
        throw new AppError(500, "MCP tool missing connectionId in config");
    }
    if (!tool.config.provider) {
        throw new AppError(500, "MCP tool missing provider in config");
    }

    // Load and verify connection ownership
    const connectionRepo = new ConnectionRepository();
    const connection = await connectionRepo.findByIdWithData(tool.config.connectionId);

    if (!connection) {
        throw new AppError(
            403,
            `Connection ${tool.config.connectionId} not found or access denied`
        );
    }

    // Verify ownership
    if (connection.user_id !== userId) {
        throw new AppError(
            403,
            `Connection ${tool.config.connectionId} not found or access denied`
        );
    }

    if (connection.provider !== tool.config.provider) {
        throw new AppError(
            500,
            `Connection provider mismatch: expected ${tool.config.provider}, got ${connection.provider}`
        );
    }

    // Verify connection is active
    if (connection.status !== "active") {
        throw new AppError(
            400,
            `Connection ${connection.name} is ${connection.status}. Please reconnect.`
        );
    }

    // Execute via ExecutionRouter
    // The ExecutionRouter will:
    // 1. Extract operation ID from tool.name (e.g., "slack_sendMessage" → "sendMessage")
    // 2. Load the provider's MCP adapter
    // 3. Execute the operation with the connection's decrypted credentials
    const executionRouter = new ExecutionRouter(providerRegistry);

    const rawResult = await executionRouter.executeMCPTool(
        tool.config.provider, // e.g., "slack"
        tool.name, // e.g., "slack_sendMessage"
        args, // Validated arguments from LLM
        connection // Connection with decrypted credentials
    );

    // Update connection last_used_at timestamp
    await connectionRepo.markAsUsed(connection.id);

    // Format the response to be user-friendly and LLM-friendly
    // This removes verbose API details and extracts key information
    return formatMCPToolResponse(tool.config.provider, tool.name, rawResult);
}
