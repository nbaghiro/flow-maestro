import { FileText, Sparkles } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

export function Templates() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Workflow Templates"
                description="Browse and use pre-built workflow templates"
            />

            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-white">
                <div className="relative mb-4">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <Sparkles className="w-6 h-6 text-primary absolute -top-2 -right-2" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    We're building an amazing library of workflow templates to help you get started
                    faster. Stay tuned!
                </p>
            </div>
        </div>
    );
}
