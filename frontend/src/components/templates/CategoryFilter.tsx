import { Megaphone, TrendingUp, Settings, Code, Headphones, LayoutGrid } from "lucide-react";
import type { TemplateCategory, CategoryInfo } from "@flowmaestro/shared";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

interface CategoryFilterProps {
    categories: CategoryInfo[];
    selectedCategory: TemplateCategory | null;
    onCategoryChange: (category: TemplateCategory | null) => void;
    isLoading?: boolean;
}

// Icon component mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    Megaphone,
    TrendingUp,
    Settings,
    Code,
    Headphones
};

export function CategoryFilter({
    categories,
    selectedCategory,
    onCategoryChange,
    isLoading = false
}: CategoryFilterProps) {
    // Calculate total count from all categories
    const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

    // Get icon component for a category
    const getIcon = (iconName: string) => {
        return categoryIcons[iconName] || LayoutGrid;
    };

    if (isLoading) {
        return (
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {/* All category */}
            <button
                onClick={() => onCategoryChange(null)}
                className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    selectedCategory === null
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
            >
                <LayoutGrid className="w-4 h-4" />
                <span>All</span>
                <span
                    className={cn(
                        "ml-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                        selectedCategory === null
                            ? "bg-white/20 dark:bg-gray-900/20"
                            : "bg-gray-200 dark:bg-gray-700"
                    )}
                >
                    {totalCount}
                </span>
            </button>

            {/* Category buttons */}
            {categories.map((categoryInfo) => {
                const meta = TEMPLATE_CATEGORY_META[categoryInfo.category];
                if (!meta) return null; // Skip unknown categories

                const IconComponent = getIcon(meta.icon);
                const isSelected = selectedCategory === categoryInfo.category;

                return (
                    <button
                        key={categoryInfo.category}
                        onClick={() => onCategoryChange(categoryInfo.category)}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            isSelected
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md"
                                : meta.color
                        )}
                    >
                        <IconComponent className="w-4 h-4" />
                        <span>{meta.label}</span>
                        <span
                            className={cn(
                                "ml-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                                isSelected
                                    ? "bg-white/20 dark:bg-gray-900/20"
                                    : "bg-black/10 dark:bg-white/10"
                            )}
                        >
                            {categoryInfo.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
