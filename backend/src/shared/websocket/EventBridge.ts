import { globalEventEmitter } from "../events/EventEmitter";
import { redisEventBus } from "../events/RedisEventBus";
import { wsManager } from "./WebSocketManager";
import { WebSocketEvent, WebSocketEventType } from "@flowmaestro/shared";

/**
 * Bridge between event sources and WebSocket manager
 * Forwards events from two sources to connected WebSocket clients:
 * 1. Redis Pub/Sub - for events from Temporal worker process (workflow execution events)
 * 2. In-memory EventEmitter - for local events (trigger events, KB events, etc.)
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

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // 1. Connect to Redis and subscribe to workflow events from Temporal worker
        try {
            await redisEventBus.connect();

            // Subscribe to all workflow events published by Temporal activities
            await redisEventBus.subscribe("workflow:events:*", (event: WebSocketEvent) => {
                console.log(`[EventBridge] Received from Redis: ${event.type}`);
                wsManager.broadcast(event);
            });

            console.log("✅ Event bridge subscribed to Redis workflow events");
        } catch (error) {
            console.error("❌ Failed to subscribe to Redis events:", error);
            console.warn("⚠️  Workflow execution events will not be received");
        }

        // 2. Subscribe to local in-memory events (non-Temporal events)
        const localEventTypes: WebSocketEventType[] = [
            // Knowledge Base events (emitted locally, not from Temporal)
            "kb:document:processing",
            "kb:document:completed",
            "kb:document:failed"
        ];

        localEventTypes.forEach((eventType) => {
            globalEventEmitter.on(eventType, (event: WebSocketEvent) => {
                console.log(`[EventBridge] Received from local emitter: ${event.type}`);
                wsManager.broadcast(event);
            });
        });

        this.initialized = true;
        console.log("✅ Event bridge initialized - events will be broadcast via WebSocket");
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Global singleton instance
export const eventBridge = EventBridge.getInstance();
