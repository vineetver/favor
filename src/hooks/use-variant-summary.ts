import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVariantSummary } from "@/features/variant/actions/summary-queries";
import { generateVariantSummary } from "@/features/variant/actions/summary-mutations";
import type { SummaryData } from "@/features/variant/types/summary-types";

interface UseVariantSummaryOptions {
    vcf: string;
    modelId?: string;
    enabled?: boolean;
}

/**
 * Custom hook for managing variant summary generation and caching
 * Uses React Query with Server Actions
 */
export function useVariantSummary({
    vcf,
    modelId = "gpt-4o-mini",
    enabled = true,
}: UseVariantSummaryOptions) {
    const queryClient = useQueryClient();

    // Query for checking summary status (with polling when generating)
    const summaryQuery = useQuery({
        queryKey: ["variant-summary", vcf],
        queryFn: () => getVariantSummary(vcf),
        enabled: enabled && !!vcf,
        // Poll every 3 seconds when status is "generating"
        refetchInterval: (query) => {
            const data = query.state.data;
            return data?.status === "generating" ? 3000 : false;
        },
        // Keep polling even when window is not focused
        refetchIntervalInBackground: true,
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
    });

    // Mutation for triggering summary generation
    const generateMutation = useMutation({
        mutationFn: () => generateVariantSummary(vcf, modelId),
        onSuccess: (data) => {
            // Update the cache immediately with the new status
            queryClient.setQueryData(["variant-summary", vcf], {
                status: data.status,
                summary: data.summary,
                timestamp: new Date().toISOString(),
            });
        },
        onError: (error) => {
            console.error("Error generating summary:", error);
        },
    });

    // Auto-trigger generation if status is pending
    const shouldGenerate =
        summaryQuery.data?.status === "pending" &&
        !generateMutation.isPending &&
        !generateMutation.isSuccess;

    // Use effect replacement - trigger generation when needed
    if (shouldGenerate && enabled) {
        generateMutation.mutate();
    }

    const isGenerating =
        summaryQuery.data?.status === "generating" ||
        summaryQuery.data?.status === "pending" ||
        generateMutation.isPending;

    const isCompleted = summaryQuery.data?.status === "completed";
    const isFailed =
        summaryQuery.data?.status === "failed" || generateMutation.isError;

    return {
        // Data
        summary: summaryQuery.data?.summary,
        status: summaryQuery.data?.status,
        error: summaryQuery.data?.error || generateMutation.error?.message,
        timestamp: summaryQuery.data?.timestamp,

        // States
        isLoading: summaryQuery.isLoading,
        isGenerating,
        isCompleted,
        isFailed,

        // Methods
        retry: () => {
            generateMutation.reset();
            summaryQuery.refetch();
        },
        refetch: summaryQuery.refetch,
    };
}
