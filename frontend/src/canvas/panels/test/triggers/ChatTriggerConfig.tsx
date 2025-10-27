/**
 * Chat Trigger Configuration
 * Build conversation flows for testing chat/conversational workflows
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, User, Bot, MoveUp, MoveDown } from "lucide-react";
import { ChatTriggerConfig as ChatConfig, ChatMessage } from "../../../../lib/triggerTypes";

interface ChatTriggerConfigProps {
    config: ChatConfig | undefined;
    onChange: (config: ChatConfig) => void;
}

export function ChatTriggerConfig({ config, onChange }: ChatTriggerConfigProps) {
    const [conversationFlow, setConversationFlow] = useState<ChatMessage[]>(
        config?.conversationFlow || [{ role: "user", message: "", waitForResponse: true }]
    );
    const [context, setContext] = useState<Record<string, any>>(config?.context || {});

    useEffect(() => {
        onChange({ conversationFlow, context });
    }, [conversationFlow, context]);

    const handleAddMessage = (index: number) => {
        const newFlow = [...conversationFlow];
        newFlow.splice(index + 1, 0, {
            role: "user",
            message: "",
            waitForResponse: true,
        });
        setConversationFlow(newFlow);
    };

    const handleUpdateMessage = (index: number, updates: Partial<ChatMessage>) => {
        const newFlow = [...conversationFlow];
        newFlow[index] = { ...newFlow[index], ...updates };
        setConversationFlow(newFlow);
    };

    const handleRemoveMessage = (index: number) => {
        if (conversationFlow.length > 1) {
            const newFlow = conversationFlow.filter((_, i) => i !== index);
            setConversationFlow(newFlow);
        }
    };

    const handleMoveMessage = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === conversationFlow.length - 1)
        ) {
            return;
        }

        const newFlow = [...conversationFlow];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        [newFlow[index], newFlow[newIndex]] = [newFlow[newIndex], newFlow[index]];
        setConversationFlow(newFlow);
    };

    return (
        <div className="p-4 space-y-6">
            {/* Conversation Flow Builder */}
            <div className="space-y-3">
                <label className="block text-sm font-medium">Conversation Flow</label>

                <div className="space-y-3">
                    {conversationFlow.map((message, index) => {
                        const isUser = message.role === "user";
                        const Icon = isUser ? User : Bot;

                        return (
                            <div
                                key={index}
                                className="relative border border-border rounded-lg overflow-hidden"
                            >
                                {/* Header */}
                                <div
                                    className={`flex items-center justify-between px-3 py-2 ${
                                        isUser ? "bg-blue-50" : "bg-purple-50"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={`w-4 h-4 ${
                                                isUser ? "text-blue-600" : "text-purple-600"
                                            }`}
                                        />
                                        <select
                                            value={message.role}
                                            onChange={(e) =>
                                                handleUpdateMessage(index, {
                                                    role: e.target.value as "user" | "assistant",
                                                })
                                            }
                                            className="px-2 py-1 text-xs bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                                        >
                                            <option value="user">User</option>
                                            <option value="assistant">Assistant</option>
                                        </select>
                                        <span className="text-xs text-muted-foreground">
                                            Message {index + 1}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleMoveMessage(index, "up")}
                                            disabled={index === 0}
                                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move up"
                                        >
                                            <MoveUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleMoveMessage(index, "down")}
                                            disabled={index === conversationFlow.length - 1}
                                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move down"
                                        >
                                            <MoveDown className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="w-px h-4 bg-border mx-1" />
                                        <button
                                            onClick={() => handleRemoveMessage(index)}
                                            disabled={conversationFlow.length === 1}
                                            className="p-1 text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Message Content */}
                                <div className="p-3 space-y-2 bg-background">
                                    <textarea
                                        value={message.message}
                                        onChange={(e) =>
                                            handleUpdateMessage(index, { message: e.target.value })
                                        }
                                        placeholder={`Enter ${message.role} message...`}
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    />

                                    {message.role === "user" && (
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={message.waitForResponse ?? true}
                                                onChange={(e) =>
                                                    handleUpdateMessage(index, {
                                                        waitForResponse: e.target.checked,
                                                    })
                                                }
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                            />
                                            <span className="text-muted-foreground">
                                                Wait for assistant response
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Add Message Button */}
                                <button
                                    onClick={() => handleAddMessage(index)}
                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 p-1.5 bg-background border border-border rounded-full hover:border-primary hover:bg-primary/5 transition-colors"
                                    title="Add message after"
                                >
                                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {conversationFlow.length === 0 && (
                    <button
                        onClick={() => handleAddMessage(-1)}
                        className="w-full px-4 py-3 text-sm border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Message
                    </button>
                )}
            </div>

            {/* Context Variables */}
            <div className="space-y-3 pt-3 border-t border-border">
                <label className="block text-sm font-medium">
                    Context Variables
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                        (Optional)
                    </span>
                </label>

                <textarea
                    value={JSON.stringify(context, null, 2)}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            setContext(parsed);
                        } catch (err) {
                            // Invalid JSON, keep editing
                        }
                    }}
                    placeholder='{\n  "userId": "123",\n  "sessionId": "abc"\n}'
                    rows={4}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                />

                <p className="text-xs text-muted-foreground">
                    Additional context that will be available to the workflow during execution.
                </p>
            </div>

            {/* Preview */}
            <div className="pt-3 border-t border-border">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Conversation Preview
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-muted rounded-lg">
                    {conversationFlow.map((message, index) => (
                        <div
                            key={index}
                            className={`flex items-start gap-2 ${
                                message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            {message.role === "assistant" && (
                                <Bot className="w-4 h-4 text-purple-600 mt-1" />
                            )}
                            <div
                                className={`px-3 py-2 rounded-lg text-xs max-w-[80%] ${
                                    message.role === "user"
                                        ? "bg-blue-500 text-white"
                                        : "bg-white border border-border"
                                }`}
                            >
                                {message.message || <em className="text-muted-foreground">(empty)</em>}
                            </div>
                            {message.role === "user" && (
                                <User className="w-4 h-4 text-blue-600 mt-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
