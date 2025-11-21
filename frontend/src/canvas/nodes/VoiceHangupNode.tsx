/**
 * Voice Hangup Node
 * Ends the phone call
 */

import { PhoneOff } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

export function VoiceHangupNode(props: NodeProps) {
    const config = props.data.config || {};
    const farewellMessage = config.farewellMessage;

    return (
        <BaseNode
            icon={PhoneOff}
            label="Hang Up"
            category="voice"
            selected={props.selected}
            hasOutputHandle={false}
        >
            <div className="flex flex-col h-full">
                {farewellMessage && (
                    <div className="flex-1 overflow-auto px-3 py-2 text-xs text-muted-foreground border-t border-border">
                        <div className="truncate">
                            {farewellMessage.length > 40
                                ? `${farewellMessage.substring(0, 40)}...`
                                : farewellMessage}
                        </div>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}
