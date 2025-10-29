import { globalEventEmitter } from "../events/EventEmitter";
import { wsManager } from "./WebSocketManager";
import { WebSocketEvent, WebSocketEventType } from "@flowmaestro/shared";

/**
 * Bridge between the orchestrator event emitter and WebSocket manager
 * Forwards all orchestrator events to connected WebSocket clients
 */
export class EventBridge {
    private static instance: EventBridge;
    private initialized = false;

    private constructor() {}

    static getInstance(): EventBridge {
        if (!EventBridge.instance) {
            EventBridge.instance = new EventBridge();
        }
        return EventBridge.instance;
    }

    initialize(): void {
        if (this.initialized) {
            return;
        }

        // Subscribe to all event types and forward to WebSocket
        const eventTypes: WebSocketEventType[] = [
            "execution:started",
            "execution:progress",
            "execution:completed",
            "execution:failed",
            "node:started",
            "node:completed",
            "node:failed",
            "node:retry",
            "node:stream",
            "user:input:required",
            "kb:document:processing",
            "kb:document:completed",
            "kb:document:failed"
        ];

        eventTypes.forEach((eventType) => {
            globalEventEmitter.on(eventType, (event: WebSocketEvent) => {
                // Broadcast the event via WebSocket
                wsManager.broadcast(event);
            });
        });

        this.initialized = true;
        console.log("✅ Event bridge initialized - orchestrator events will be broadcast via WebSocket");
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Global singleton instance
export const eventBridge = EventBridge.getInstance();
