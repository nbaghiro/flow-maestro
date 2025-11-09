/**
 * Voice Menu Node
 * Presents an IVR menu with multiple options
 */

import { ListOrdered } from "lucide-react";
import { Handle, Position } from "reactflow";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

export function VoiceMenuNode(props: NodeProps) {
    const config = props.data.config || {};
    const prompt = config.prompt || "Please select an option";
    const options = config.options || [];

    return (
        <BaseNode
            icon={ListOrdered}
            label="Menu"
            category="voice"
            selected={props.selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    {/* Input handle */}
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
                    />

                    {/* Output handles for each option */}
                    {options.map((option: { key: string; label: string }, index: number) => (
                        <Handle
                            key={option.key}
                            type="source"
                            position={Position.Right}
                            id={option.key}
                            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
                            style={{
                                top: `${((index + 1) * 100) / (options.length + 1)}%`
                            }}
                        />
                    ))}
                </>
            }
        >
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                <div className="truncate mb-1">
                    {prompt.length > 40 ? `${prompt.substring(0, 40)}...` : prompt}
                </div>
                <div className="text-[10px] opacity-70">
                    {options.length} option{options.length !== 1 ? "s" : ""}
                </div>
            </div>
        </BaseNode>
    );
}
