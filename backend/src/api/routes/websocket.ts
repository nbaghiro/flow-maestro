import { FastifyInstance, FastifyRequest } from "fastify";
import { wsManager } from "../../shared/websocket/WebSocketManager";
import { v4 as uuidv4 } from "uuid";

export async function websocketRoutes(fastify: FastifyInstance) {
    fastify.get(
        "/ws",
        { websocket: true },
        async (socket, request: FastifyRequest) => {
            const connectionId = uuidv4();

            // Verify JWT token from query parameter or header
            let userId: string;
            try {
                const query = request.query as Record<string, string>;
                const token = query["token"] || request.headers.authorization?.replace("Bearer ", "");

                if (!token) {
                    socket.close(1008, "Authentication required");
                    return;
                }

                const decoded = await request.jwtVerify({ onlyCookie: false });
                userId = (decoded as any).id;
            } catch (error: any) {
                fastify.log.error({ error }, "WebSocket authentication failed");
                socket.close(1008, "Authentication failed");
                return;
            }

            // Add connection to manager
            wsManager.addConnection(connectionId, socket, userId);

            fastify.log.info({
                connectionId,
                userId
            }, "WebSocket connection established");

            // Send welcome message
            socket.send(
                JSON.stringify({
                    type: "connected",
                    connectionId,
                    message: "Connected to FlowMaestro WebSocket"
                })
            );

            socket.on("error", (error: Error) => {
                fastify.log.error({ error, connectionId }, "WebSocket error");
            });

            socket.on("close", () => {
                fastify.log.info({ connectionId }, "WebSocket connection closed");
            });
        }
    );
}
