import { GitBranch, Bot } from "lucide-react";
import { cn } from "../../lib/utils";

export type TemplateType = "workflows" | "agents";

interface TemplateTypeToggleProps {
    value: TemplateType;
    onChange: (value: TemplateType) => void;
}

export function TemplateTypeToggle({ value, onChange }: TemplateTypeToggleProps) {
    return (
        <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
                onClick={() => onChange("workflows")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    value === "workflows"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
            >
                <GitBranch className="w-4 h-4" />
                Workflows
            </button>
            <button
                onClick={() => onChange("agents")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    value === "agents"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
            >
                <Bot className="w-4 h-4" />
                Agents
            </button>
        </div>
    );
}
