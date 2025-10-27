/**
 * WebSocket Client for FlowMaestro Real-time Updates
 */

import { WebSocketEvent } from "@flowmaestro/shared";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

type EventHandler = (event: WebSocketEvent) => void;

export class WebSocketClient {
    private static instance: WebSocketClient;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();
    private connectionPromise: Promise<void> | null = null;

    private constructor() {}

    static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    async connect(token: string): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log("WebSocket connected");
                this.reconnectAttempts = 0;
                this.connectionPromise = null;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.connectionPromise = null;
                reject(error);
            };

            this.ws.onclose = () => {
                console.log("WebSocket disconnected");
                this.connectionPromise = null;
                this.handleReconnect(token);
            };
        });

        return this.connectionPromise;
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.eventHandlers.clear();
        this.reconnectAttempts = 0;
        this.connectionPromise = null;
    }

    on(eventType: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);
    }

    off(eventType: string, handler: EventHandler): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    subscribeToExecution(executionId: string): void {
        this.send({
            type: "subscribe",
            executionId
        });
    }

    unsubscribeFromExecution(executionId: string): void {
        this.send({
            type: "unsubscribe",
            executionId
        });
    }

    private send(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private handleMessage(data: any): void {
        // Handle system messages
        if (data.type === "connected") {
            console.log("WebSocket connection confirmed:", data);
            return;
        }

        if (data.type === "subscribed" || data.type === "unsubscribed") {
            console.log(`${data.type} to execution:`, data.executionId);
            return;
        }

        // Emit to specific event type handlers
        const handlers = this.eventHandlers.get(data.type);
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }

        // Emit to "all" handlers
        const allHandlers = this.eventHandlers.get("*");
        if (allHandlers) {
            allHandlers.forEach((handler) => handler(data));
        }
    }

    private handleReconnect(token: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnect attempts reached");
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect(token).catch((error) => {
                console.error("Reconnect failed:", error);
            });
        }, delay);
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Global singleton instance
export const wsClient = WebSocketClient.getInstance();
