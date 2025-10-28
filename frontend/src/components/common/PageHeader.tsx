import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
            </div>

            {action && <div>{action}</div>}
        </div>
    );
}
