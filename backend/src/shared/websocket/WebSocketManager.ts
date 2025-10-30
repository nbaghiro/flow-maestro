import type { WebSocket } from "@fastify/websocket";
import { WebSocketEvent } from "@flowmaestro/shared";

interface Connection {
    socket: WebSocket;
    userId: string;
    subscriptions: Set<string>; // execution IDs
}

export class WebSocketManager {
    private static instance: WebSocketManager;
    private connections: Map<string, Connection>; // connectionId -> Connection
    private executionSubscribers: Map<string, Set<string>>; // executionId -> Set<connectionId>

    private constructor() {
        this.connections = new Map();
        this.executionSubscribers = new Map();
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    addConnection(connectionId: string, socket: WebSocket, userId: string): void {
        this.connections.set(connectionId, {
            socket,
            userId,
            subscriptions: new Set()
        });

        // Set up message handler
        socket.on("message", (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                this.handleMessage(connectionId, data);
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        });

        // Clean up on close
        socket.on("close", () => {
            this.removeConnection(connectionId);
        });
    }

    removeConnection(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Remove from all execution subscriptions
        connection.subscriptions.forEach((executionId) => {
            const subscribers = this.executionSubscribers.get(executionId);
            if (subscribers) {
                subscribers.delete(connectionId);
                if (subscribers.size === 0) {
                    this.executionSubscribers.delete(executionId);
                }
            }
        });

        this.connections.delete(connectionId);
    }

    subscribeToExecution(connectionId: string, executionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.log(`Cannot subscribe: connection ${connectionId} not found`);
            return;
        }

        connection.subscriptions.add(executionId);

        if (!this.executionSubscribers.has(executionId)) {
            this.executionSubscribers.set(executionId, new Set());
        }
        this.executionSubscribers.get(executionId)!.add(connectionId);

        console.log(`Subscribed connection ${connectionId} to execution ${executionId}`);
        console.log(`Total subscribers for ${executionId}: ${this.executionSubscribers.get(executionId)!.size}`);
    }

    unsubscribeFromExecution(connectionId: string, executionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        connection.subscriptions.delete(executionId);

        const subscribers = this.executionSubscribers.get(executionId);
        if (subscribers) {
            subscribers.delete(connectionId);
            if (subscribers.size === 0) {
                this.executionSubscribers.delete(executionId);
            }
        }
    }

    broadcast(event: WebSocketEvent): void {
        const message = JSON.stringify(event);

        // If it's an execution-related event, send to subscribers
        if ("executionId" in event) {
            const executionId = (event as any).executionId;
            console.log(`Broadcasting ${event.type} to execution ${executionId} subscribers`);
            this.broadcastToExecution(executionId, event);
        } else {
            // Broadcast to all connections
            console.log(`Broadcasting ${event.type} to all connections`);
            this.connections.forEach((connection) => {
                if (connection.socket.readyState === WebSocket.OPEN) {
                    connection.socket.send(message);
                }
            });
        }
    }

    broadcastToExecution(executionId: string, event: WebSocketEvent): void {
        const subscribers = this.executionSubscribers.get(executionId);
        if (!subscribers || subscribers.size === 0) {
            console.log(`No subscribers for execution ${executionId}`);
            return;
        }

        const message = JSON.stringify(event);
        console.log(`Sending ${event.type} to ${subscribers.size} subscriber(s)`);

        subscribers.forEach((connectionId) => {
            const connection = this.connections.get(connectionId);
            if (connection && connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.send(message);
            }
        });
    }

    broadcastToUser(userId: string, event: WebSocketEvent): void {
        const message = JSON.stringify(event);

        this.connections.forEach((connection) => {
            if (connection.userId === userId && connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.send(message);
            }
        });
    }

    private handleMessage(connectionId: string, data: any): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Handle subscription requests
        if (data.type === "subscribe" && data.executionId) {
            this.subscribeToExecution(connectionId, data.executionId);
            // Send acknowledgment
            connection.socket.send(
                JSON.stringify({
                    type: "subscribed",
                    executionId: data.executionId
                })
            );
        } else if (data.type === "unsubscribe" && data.executionId) {
            this.unsubscribeFromExecution(connectionId, data.executionId);
            // Send acknowledgment
            connection.socket.send(
                JSON.stringify({
                    type: "unsubscribed",
                    executionId: data.executionId
                })
            );
        }
    }

    getConnectionCount(): number {
        return this.connections.size;
    }

    getExecutionSubscriberCount(executionId: string): number {
        return this.executionSubscribers.get(executionId)?.size || 0;
    }
}

// Global singleton instance
export const wsManager = WebSocketManager.getInstance();
