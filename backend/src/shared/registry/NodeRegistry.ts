import { NodeMetadata } from "@flowmaestro/shared";

/**
 * Node Registry - Static metadata about available node types
 * Node execution is handled by Temporal activities
 */
export class NodeRegistry {
    private static instance: NodeRegistry;
    private metadata: Map<string, NodeMetadata>;

    private constructor() {
        this.metadata = new Map();
    }

    static getInstance(): NodeRegistry {
        if (!NodeRegistry.instance) {
            NodeRegistry.instance = new NodeRegistry();
        }
        return NodeRegistry.instance;
    }

    register(nodeType: string, metadata: NodeMetadata): void {
        if (this.metadata.has(nodeType)) {
            throw new Error(`Node type ${nodeType} is already registered`);
        }

        this.metadata.set(nodeType, metadata);
    }

    hasNode(nodeType: string): boolean {
        return this.metadata.has(nodeType);
    }

    getAllTypes(): string[] {
        return Array.from(this.metadata.keys());
    }

    getAllMetadata(): NodeMetadata[] {
        return Array.from(this.metadata.values());
    }

    getMetadata(nodeType: string): NodeMetadata {
        const metadata = this.metadata.get(nodeType);

        if (!metadata) {
            throw new Error(`Node type ${nodeType} is not registered`);
        }

        return metadata;
    }

    unregister(nodeType: string): boolean {
        return this.metadata.delete(nodeType);
    }

    clear(): void {
        this.metadata.clear();
    }
}

// Global singleton instance
export const nodeRegistry = NodeRegistry.getInstance();
