import { Send, X, Loader2, Bot, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { wsClient } from "../../lib/websocket";
import { useAgentStore } from "../../stores/agentStore";
import type { Agent, ConversationMessage } from "../../lib/api";

interface AgentChatProps {
    agent: Agent;
}

export function AgentChat({ agent }: AgentChatProps) {
    const { currentExecution, executeAgent, sendMessage, clearExecution } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Update messages from execution
    useEffect(() => {
        if (currentExecution) {
            setMessages(currentExecution.conversation_history);
        } else {
            setMessages([]);
        }
    }, [currentExecution]);

    // Listen for WebSocket events
    useEffect(() => {
        if (!currentExecution) return;

        const handleMessage = (event: unknown) => {
            const data = event as {
                executionId?: string;
                message?: ConversationMessage;
            };
            if (data.executionId === currentExecution.id) {
                if (data.message) {
                    setMessages((prev) => [...prev, data.message!]);
                }
            }
        };

        const handleThinking = (event: unknown) => {
            const data = event as { executionId?: string };
            if (data.executionId === currentExecution.id) {
                // Could show a "thinking..." indicator
                console.log("Agent is thinking...");
            }
        };

        const handleCompleted = (event: unknown) => {
            const data = event as { executionId?: string };
            if (data.executionId === currentExecution.id) {
                setIsSending(false);
            }
        };

        const handleFailed = (event: unknown) => {
            const data = event as { executionId?: string; error?: unknown };
            if (data.executionId === currentExecution.id) {
                setIsSending(false);
                // Could show error message
                console.error("Agent failed:", data.error);
            }
        };

        wsClient.on("agent:message:new", handleMessage);
        wsClient.on("agent:thinking", handleThinking);
        wsClient.on("agent:execution:completed", handleCompleted);
        wsClient.on("agent:execution:failed", handleFailed);

        return () => {
            wsClient.off("agent:message:new", handleMessage);
            wsClient.off("agent:thinking", handleThinking);
            wsClient.off("agent:execution:completed", handleCompleted);
            wsClient.off("agent:execution:failed", handleFailed);
        };
    }, [currentExecution]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            if (!currentExecution) {
                // Start new execution
                await executeAgent(agent.id, message);
            } else {
                // Continue existing execution
                await sendMessage(message);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        if (confirm("Start a new conversation? This will clear the current chat.")) {
            clearExecution();
            setMessages([]);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Chat header - Fixed */}
            <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {currentExecution ? "Active conversation" : "Ready to chat"}
                        </p>
                    </div>
                </div>
                {currentExecution && (
                    <button
                        onClick={handleClear}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Start new conversation"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Hey, I'm your custom Agent! Let me know how I can assist.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3",
                                    message.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {message.role !== "user" && message.role !== "system" && (
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-lg px-4 py-3",
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : message.role === "system"
                                              ? "bg-muted/50 text-muted-foreground text-sm italic"
                                              : "bg-muted text-foreground"
                                    )}
                                >
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>
                                    {message.tool_calls && message.tool_calls.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-border/50">
                                            <p className="text-xs text-muted-foreground mb-1">
                                                Using tools:
                                            </p>
                                            {message.tool_calls.map((tool, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs bg-background/50 rounded px-2 py-1 mt-1"
                                                >
                                                    {tool.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-secondary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isSending && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                                <div className="bg-muted text-foreground rounded-lg px-4 py-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="border-t border-border p-4 flex-shrink-0 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="What can your Agent do for you today?"
                        disabled={isSending}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-lg",
                            "bg-muted border border-border",
                            "text-foreground placeholder:text-muted-foreground",
                            "focus:outline-none focus:ring-2 focus:ring-primary",
                            "disabled:opacity-50"
                        )}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className={cn(
                            "px-4 py-3 rounded-lg",
                            "bg-primary text-primary-foreground",
                            "hover:bg-primary/90 transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Having trouble? Report your issue to our team
                </p>
            </div>
        </div>
    );
}
