import { cn } from "../../lib/utils";

type Status = 'active' | 'inactive' | 'pending' | 'expired' | 'invalid' | 'revoked' | 'completed' | 'failed' | 'running';

interface StatusBadgeProps {
    status: Status;
    className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    inactive: {
        label: 'Inactive',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    },
    pending: {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    expired: {
        label: 'Expired',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    },
    invalid: {
        label: 'Invalid',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    },
    revoked: {
        label: 'Revoked',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    },
    completed: {
        label: 'Completed',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    failed: {
        label: 'Failed',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    },
    running: {
        label: 'Running',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
}
