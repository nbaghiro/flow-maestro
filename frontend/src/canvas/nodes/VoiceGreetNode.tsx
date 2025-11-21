/**
 * Voice Greet Node
 * Plays a text-to-speech message to the caller
 */

import { MessageSquare } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

export function VoiceGreetNode(props: NodeProps) {
    const config = props.data.config || {};
    const message = config.message || "Hello!";

    return (
        <BaseNode
            icon={MessageSquare}
            label="Say Message"
            category="voice"
            selected={props.selected}
        >
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto px-3 py-2 text-xs text-muted-foreground border-t border-border">
                    <div className="truncate">
                        {message.length > 40 ? `${message.substring(0, 40)}...` : message}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}
