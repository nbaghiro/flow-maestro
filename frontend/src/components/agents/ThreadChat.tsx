import { Send, Bot, User, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { wsClient } from "../../lib/websocket";
import { useAgentStore } from "../../stores/agentStore";
import type { Agent, Thread, ConversationMessage } from "../../lib/api";

interface ThreadChatProps {
    agent: Agent;
    thread: Thread;
}

export function ThreadChat({ agent, thread }: ThreadChatProps) {
    const { currentExecution, executeAgent, sendMessage } = useAgentStore();

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Update messages from execution when thread matches
    useEffect(() => {
        if (currentExecution && currentExecution.thread_id === thread.id) {
            setMessages(currentExecution.conversation_history);
        } else {
            // Thread changed or no execution - clear messages
            // In a full implementation, we'd load thread history from backend here
            setMessages([]);
        }
    }, [currentExecution, thread.id]);

    // Listen for WebSocket events
    useEffect(() => {
        const handleMessage = (event: unknown) => {
            const data = event as {
                executionId?: string;
                threadId?: string;
                message?: ConversationMessage;
            };
            // Only add messages that belong to this thread
            if (data.threadId === thread.id && data.message) {
                setMessages((prev) => [...prev, data.message!]);
            }
        };

        const handleThinking = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string };
            if (data.threadId === thread.id) {
                console.log("Agent is thinking...");
            }
        };

        const handleCompleted = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string };
            if (data.threadId === thread.id) {
                setIsSending(false);
            }
        };

        const handleFailed = (event: unknown) => {
            const data = event as { executionId?: string; threadId?: string; error?: unknown };
            if (data.threadId === thread.id) {
                setIsSending(false);
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
    }, [thread.id]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;

        const message = input.trim();
        setInput("");
        setIsSending(true);

        try {
            if (!currentExecution || currentExecution.thread_id !== thread.id) {
                // Start new execution in this thread
                await executeAgent(agent.id, message, thread.id);
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

    return (
        <div className="h-full flex flex-col">
            {/* Chat header */}
            <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {thread.title || `Thread ${thread.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {currentExecution && currentExecution.thread_id === thread.id
                                ? "Active conversation"
                                : "Ready to continue"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Continue your conversation with {agent.name}</p>
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

            {/* Input */}
            <div className="border-t border-border p-4 flex-shrink-0 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Continue the conversation..."
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
            </div>
        </div>
    );
}
