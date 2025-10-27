/**
 * Test Panel Content Router
 * Renders the appropriate panel based on active tab
 */

import { useTestScenarioStore } from "../../../stores/testScenarioStore";
import { SetupPanel } from "./SetupPanel";
import { ExecutionPanel } from "./ExecutionPanel";
import { ResultsPanel } from "./ResultsPanel";

export function TestPanelContent() {
    const { activeTab } = useTestScenarioStore();

    switch (activeTab) {
        case "setup":
            return <SetupPanel />;
        case "execution":
            return <ExecutionPanel />;
        case "results":
            return <ResultsPanel />;
        default:
            return <SetupPanel />;
    }
}
