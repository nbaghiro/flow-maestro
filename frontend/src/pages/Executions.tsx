import { History } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";

export function Executions() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Executions"
                description="View execution history across all workflows"
            />

            <EmptyState
                icon={History}
                title="No executions yet"
                description="Execution history will appear here once you start running your workflows."
            />
        </div>
    );
}
