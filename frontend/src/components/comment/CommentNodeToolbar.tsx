import * as Popover from "@radix-ui/react-popover";
import { memo } from "react";

interface Props {
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onList: () => void;
    onSetBg: (color: string) => void;
    onSetText: (color: string) => void;
}

const BG_COLORS = ["#FEF3C7", "#FFEDD5", "#E0F2FE", "#E9D5FF", "#DCFCE7"];
const TEXT_COLORS = ["#1F2937", "#334155", "#0F172A"];

function CommentNodeToolbar({ onBold, onItalic, onUnderline, onList, onSetBg, onSetText }: Props) {
    const stopPointer = (e: React.PointerEvent) => {
        // Keep focus on the contentEditable so formatting applies to the current selection.
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Popover.Root modal={false}>
            <Popover.Trigger asChild>
                <button
                    data-role="comment-toolbar"
                    className="pointer-events-auto absolute top-2 right-2 bg-white/70 hover:bg-white rounded p-1 shadow-sm border border-gray-200 text-xs"
                    onPointerDown={stopPointer}
                    type="button"
                >
                    Aa
                </button>
            </Popover.Trigger>

            <Popover.Content
                data-role="comment-toolbar"
                side="bottom"
                align="end"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDown={stopPointer}
                className="rounded-md bg-white shadow-lg border p-3 space-y-3 z-50"
            >
                <div>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onBold clicked");
                            onBold();
                        }}
                        className="px-2 py-1 border rounded"
                    >
                        <b>B</b>
                    </button>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onItalic clicked");
                            onItalic();
                        }}
                        className="px-2 py-1 border rounded italic"
                    >
                        I
                    </button>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onUnderline clicked");
                            onUnderline();
                        }}
                        className="px-2 py-1 border rounded underline"
                    >
                        U
                    </button>
                    <button
                        onPointerDown={stopPointer}
                        onClick={() => {
                            console.log("onList clicked");
                            onList();
                        }}
                        className="px-2 py-1 border rounded"
                    >
                        • List
                    </button>
                </div>

                <div className="flex gap-2">
                    {BG_COLORS.map((c) => (
                        <button
                            key={c}
                            onPointerDown={stopPointer}
                            onClick={() => {
                                console.log("onSetBg clicked", c);
                                onSetBg(c);
                            }}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="flex gap-2">
                    {TEXT_COLORS.map((c) => (
                        <button
                            key={c}
                            onPointerDown={stopPointer}
                            onClick={() => {
                                console.log("onSetText clicked", c);
                                onSetText(c);
                            }}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <Popover.Arrow className="fill-white" />
            </Popover.Content>
        </Popover.Root>
    );
}

export default memo(CommentNodeToolbar);
