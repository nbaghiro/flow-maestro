import { memo } from "react";
import { NodeProps } from "reactflow";

function CommentNode({ data, selected }: NodeProps) {
    const { content, backgroundColor, textColor } = data;

    return (
        <div
            className={`rounded-md p-3 text-sm shadow-sm select-none ${selected ? "ring-2 ring-blue-500" : ""}`}
            style={{ backgroundColor: backgroundColor, color: textColor }}
        >
            {content || "Add a note..."}
        </div>
    );
}

export default memo(CommentNode);
