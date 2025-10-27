/**
 * Setup Panel - Configure test scenario and trigger
 */

import { useTestScenarioStore } from "../../../stores/testScenarioStore";
import { useWorkflowStore } from "../../../stores/workflowStore";
import { TRIGGER_TYPES, TriggerType } from "../../../lib/triggerTypes";
import { Play, Plus, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";

// Trigger configuration components (we'll create these)
import { ManualTriggerConfig } from "./triggers/ManualTriggerConfig";
import { ChatTriggerConfig } from "./triggers/ChatTriggerConfig";
import { WebhookTriggerConfig } from "./triggers/WebhookTriggerConfig";

export function SetupPanel() {
    const {
        activeScenario,
        createScenario,
        updateScenario,
        deleteScenario,
        scenarios,
        setActiveScenario,
        startExecution,
    } = useTestScenarioStore();

    const { nodes, executeWorkflow } = useWorkflowStore();

    // Handle run scenario
    const handleRun = async () => {
        if (!activeScenario) return;

        // Start execution tracking
        const executionId = `exec-${Date.now()}`;
        startExecution(executionId);

        // Transform scenario configuration to execution inputs
        const inputs = transformScenarioToInputs(activeScenario);

        // Execute workflow
        await executeWorkflow(inputs);
    };

    // Handle trigger type change
    const handleTriggerTypeChange = (triggerType: TriggerType) => {
        if (!activeScenario) return;
        updateScenario(activeScenario.id, {
            triggerType,
            configuration: {},
        });
    };

    // Handle configuration change
    const handleConfigurationChange = (config: any) => {
        if (!activeScenario) return;
        updateScenario(activeScenario.id, {
            configuration: {
                [activeScenario.triggerType]: config,
            },
        });
    };

    // Render trigger configuration component
    const renderTriggerConfig = () => {
        if (!activeScenario) return null;

        switch (activeScenario.triggerType) {
            case "manual":
                return (
                    <ManualTriggerConfig
                        config={activeScenario.configuration.manual}
                        onChange={handleConfigurationChange}
                        workflowNodes={nodes}
                    />
                );

            case "chat":
                return (
                    <ChatTriggerConfig
                        config={activeScenario.configuration.chat}
                        onChange={handleConfigurationChange}
                    />
                );

            case "webhook":
                return (
                    <WebhookTriggerConfig
                        config={activeScenario.configuration.webhook}
                        onChange={handleConfigurationChange}
                    />
                );

            // TODO: Add more trigger configs
            default:
                return (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Configuration for {activeScenario.triggerType} trigger coming soon...
                    </div>
                );
        }
    };

    // If no scenario exists, show create prompt
    if (scenarios.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Test Scenarios Yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Create a test scenario to run and debug your workflow
                    </p>
                    <button
                        onClick={() => {
                            createScenario("Test Scenario", "manual");
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Test Scenario
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Scenario Selector */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <select
                        value={activeScenario?.id || ""}
                        onChange={(e) => {
                            const scenario = scenarios.find((s) => s.id === e.target.value);
                            setActiveScenario(scenario || null);
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {scenarios.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>
                                {scenario.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            if (activeScenario) {
                                const name = prompt("Scenario name:", "New Test Scenario");
                                if (name) createScenario(name, "manual");
                            }
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Create new scenario"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    {activeScenario && (
                        <button
                            onClick={() => {
                                if (confirm(`Delete scenario "${activeScenario.name}"?`)) {
                                    deleteScenario(activeScenario.id);
                                }
                            }}
                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete scenario"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Configuration Content */}
            <div className="flex-1 overflow-y-auto">
                {activeScenario && (
                    <div className="p-4 space-y-6">
                        {/* Trigger Type Selector */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium">
                                Trigger Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {TRIGGER_TYPES.map((triggerType) => {
                                    const Icon = triggerType.icon;
                                    const isActive = activeScenario.triggerType === triggerType.value;

                                    return (
                                        <button
                                            key={triggerType.value}
                                            onClick={() => handleTriggerTypeChange(triggerType.value)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                                                isActive
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "w-5 h-5 mt-0.5",
                                                    isActive ? "text-primary" : "text-muted-foreground"
                                                )}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className={cn(
                                                        "text-sm font-medium",
                                                        isActive && "text-primary"
                                                    )}
                                                >
                                                    {triggerType.label}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {triggerType.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Trigger Configuration */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium">
                                Configuration
                            </label>
                            <div className="border border-border rounded-lg overflow-hidden">
                                {renderTriggerConfig()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 border-t border-border bg-muted/30">
                <button
                    onClick={handleRun}
                    disabled={!activeScenario || nodes.length === 0}
                    className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play className="w-4 h-4" />
                    Run Test Scenario
                </button>
            </div>
        </div>
    );
}

/**
 * Transform scenario configuration to workflow execution inputs
 */
function transformScenarioToInputs(scenario: any): Record<string, any> {
    const config = scenario.configuration[scenario.triggerType];

    switch (scenario.triggerType) {
        case "manual":
            return config?.inputs || {};

        case "chat":
            // For chat, use the first user message as input
            const firstMessage = config?.conversationFlow?.[0];
            return { message: firstMessage?.message || "" };

        case "webhook":
            return config?.body || {};

        // TODO: Add more transformations
        default:
            return {};
    }
}
