import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, FileText, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Template, TemplateCategory, CategoryInfo } from "@flowmaestro/shared";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import { PageHeader } from "../components/common/PageHeader";
import { CategoryFilter } from "../components/templates/CategoryFilter";
import { TemplateCard } from "../components/templates/TemplateCard";
import { TemplatePreviewDialog } from "../components/templates/TemplatePreviewDialog";
import { getTemplates, getTemplateCategories, copyTemplate } from "../lib/api";

export function Templates() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    // Fetch categories
    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ["template-categories"],
        queryFn: getTemplateCategories
    });

    // Fetch templates
    const {
        data: templatesData,
        isLoading: templatesLoading,
        error: templatesError
    } = useQuery({
        queryKey: ["templates", selectedCategory, searchQuery],
        queryFn: () =>
            getTemplates({
                category: selectedCategory || undefined,
                search: searchQuery || undefined,
                limit: 50
            })
    });

    // Copy template mutation
    const copyMutation = useMutation({
        mutationFn: (template: Template) => copyTemplate(template.id),
        onSuccess: (data) => {
            // Navigate to the workflow builder
            if (data.data?.workflowId) {
                navigate(`/builder/${data.data.workflowId}`);
            }
            // Invalidate templates to update use counts
            queryClient.invalidateQueries({ queryKey: ["templates"] });
        }
    });

    // Parse categories with fallback - filter to only known categories
    const categories: CategoryInfo[] = useMemo(() => {
        if (!categoriesData?.data) return [];
        // Filter to only include categories we know about
        return categoriesData.data.filter(
            (cat: CategoryInfo) => TEMPLATE_CATEGORY_META[cat.category]
        );
    }, [categoriesData]);

    // Parse templates with fallback - filter to only known categories
    const templates: Template[] = useMemo(() => {
        if (!templatesData?.data?.items) return [];
        return templatesData.data.items.filter((t: Template) => TEMPLATE_CATEGORY_META[t.category]);
    }, [templatesData]);

    // Handlers
    const handleCardClick = (template: Template) => {
        setPreviewTemplate(template);
    };

    const handleUse = async (template: Template) => {
        copyMutation.mutate(template);
    };

    const handleCategoryChange = (category: TemplateCategory | null) => {
        setSelectedCategory(category);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const isLoading = categoriesLoading || templatesLoading;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Workflow Templates"
                description="Browse and use pre-built workflow templates to get started quickly"
            />

            {/* Search and Filters */}
            <div className="space-y-4 mb-8">
                {/* Search bar */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                </div>

                {/* Category filter */}
                <CategoryFilter
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                    isLoading={categoriesLoading}
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates...</p>
                </div>
            ) : templatesError ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                        Failed to load templates
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300 text-center max-w-md">
                        {templatesError instanceof Error
                            ? templatesError.message
                            : "An error occurred"}
                    </p>
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        No templates found
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
                        {searchQuery
                            ? `No templates match "${searchQuery}"`
                            : selectedCategory && TEMPLATE_CATEGORY_META[selectedCategory]
                              ? `No templates in the ${TEMPLATE_CATEGORY_META[selectedCategory].label} category`
                              : "No templates available yet"}
                    </p>
                </div>
            ) : (
                <>
                    {/* Results count */}
                    <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                        {templates.length} template{templates.length !== 1 ? "s" : ""}
                        {selectedCategory &&
                            TEMPLATE_CATEGORY_META[selectedCategory] &&
                            ` in ${TEMPLATE_CATEGORY_META[selectedCategory].label}`}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </div>

                    {/* Template grid - 3 columns for wider cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onClick={handleCardClick}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Preview Dialog */}
            <TemplatePreviewDialog
                template={previewTemplate}
                isOpen={previewTemplate !== null}
                onClose={() => setPreviewTemplate(null)}
                onUse={handleUse}
                isUsing={copyMutation.isPending}
            />
        </div>
    );
}
