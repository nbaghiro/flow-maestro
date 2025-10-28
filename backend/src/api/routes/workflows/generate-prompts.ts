import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware, validateBody } from "../../middleware";
import { executeLLMNode, type LLMNodeConfig } from "../../../temporal/activities/node-executors/llm-executor";

const generatePromptsSchema = z.object({
    credentialId: z.string().uuid(),
});

export async function generatePromptsRoute(fastify: FastifyInstance) {
    fastify.post(
        "/generate/prompts",
        {
            preHandler: [authMiddleware, validateBody(generatePromptsSchema)]
        },
        async (request, reply) => {
            const { credentialId } = request.body as z.infer<typeof generatePromptsSchema>;

            try {
                // Fetch credential to determine provider and model
                const { CredentialRepository } = await import("../../../storage/repositories");
                const credentialRepository = new CredentialRepository();
                const credential = await credentialRepository.findByIdWithData(credentialId);

                if (!credential) {
                    return reply.status(404).send({
                        success: false,
                        error: "Credential not found"
                    });
                }

                if (credential.status !== 'active') {
                    return reply.status(400).send({
                        success: false,
                        error: "Credential is not active"
                    });
                }

                const provider = credential.provider.toLowerCase();

                // Set default model based on provider
                let model: string;
                switch (provider) {
                    case 'openai':
                        model = 'gpt-4';
                        break;
                    case 'anthropic':
                        model = 'claude-3-5-sonnet-20241022';
                        break;
                    case 'google':
                        model = 'gemini-pro';
                        break;
                    case 'cohere':
                        model = 'command';
                        break;
                    default:
                        return reply.status(400).send({
                            success: false,
                            error: `Unsupported LLM provider: ${provider}`
                        });
                }

                // Construct the prompt on the backend
                const prompt = `Generate 4 diverse and creative example workflow prompts for FlowMaestro, a visual workflow automation platform.

The workflows can use these node types:
- LLM nodes (OpenAI, Anthropic, Google, Cohere)
- HTTP requests to APIs
- Conditional logic and loops
- Data transformations
- Image generation (DALL-E)
- Audio transcription/synthesis
- Database queries
- Integrations (Slack, Email, Google Sheets)
- Code execution

Return ONLY a JSON array of 4 strings, each being a concise workflow description (10-15 words). Be creative and diverse in use cases.

Example format:
["prompt 1", "prompt 2", "prompt 3", "prompt 4"]`;

                const systemPrompt = "You are a helpful assistant that generates creative workflow automation examples. Return only valid JSON.";

                const config: LLMNodeConfig = {
                    provider: provider as any,
                    model,
                    credentialId,
                    prompt,
                    systemPrompt,
                    temperature: 0.9,
                    maxTokens: 300,
                };

                const result = await executeLLMNode(config, {});

                return reply.send({
                    success: true,
                    data: result
                });
            } catch (error: any) {
                console.error('[Generate Prompts] Error:', error);
                return reply.status(500).send({
                    success: false,
                    error: error.message || "Failed to generate example prompts"
                });
            }
        }
    );
}
