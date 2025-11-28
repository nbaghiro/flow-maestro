import type { WorkflowDefinition } from "./types";

export const TEMPLATE_CATEGORIES = [
    "marketing",
    "sales",
    "operations",
    "engineering",
    "support"
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface Template {
    id: string;
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
    category: TemplateCategory;
    tags: string[];
    icon: string | null;
    color: string | null;
    preview_image_url: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    required_integrations: string[];
    version: string;
    created_at: string;
    updated_at: string;
}

export interface TemplateListParams {
    category?: TemplateCategory;
    tags?: string[];
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface TemplateListResponse {
    items: Template[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface CategoryInfo {
    category: TemplateCategory;
    count: number;
    label: string;
    icon: string;
    color: string;
}

export interface CopyTemplateResponse {
    workflowId: string;
    workflow: {
        id: string;
        name: string;
    };
}

// Category metadata for display - modern vibrant colors
export const TEMPLATE_CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: string; color: string; bgColor: string }
> = {
    marketing: {
        label: "Marketing",
        icon: "Megaphone",
        color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
        bgColor: "bg-violet-500"
    },
    sales: {
        label: "Sales",
        icon: "TrendingUp",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        bgColor: "bg-emerald-500"
    },
    operations: {
        label: "Operations",
        icon: "Settings",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        bgColor: "bg-amber-500"
    },
    engineering: {
        label: "Engineering",
        icon: "Code",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        bgColor: "bg-blue-500"
    },
    support: {
        label: "Support",
        icon: "Headphones",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        bgColor: "bg-rose-500"
    }
};
