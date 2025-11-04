/**
 * Voice Listen Node
 * Captures caller's speech using speech-to-text
 */

import { Ear } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

export function VoiceListenNode(props: NodeProps) {
    const config = props.data.config || {};
    const maxDuration = config.maxDuration || 30;
    const outputVariable = config.outputVariable || "userSpeech";

    return (
        <BaseNode icon={Ear} label="Listen" category="voice" selected={props.selected}>
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                <div className="flex items-center justify-between">
                    <span>Max: {maxDuration}s</span>
                    <span className="truncate ml-2">→ {outputVariable}</span>
                </div>
            </div>
        </BaseNode>
    );
}
