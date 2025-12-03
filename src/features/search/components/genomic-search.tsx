"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SaveSearchDialog } from "@/features/search/components/save-search-dialog";
import { useGenomicSearch } from "@/features/search/hooks/use-genomic-search";
import { getPlaceholderText } from "@/features/search/lib/formatters";

export function GenomicSearch() {
    const {
        inputValue,
        selectedGenome,
        showAlert,
        alertMessage,
        suggestions,
        isLoading,
        handleInputChange,
        handleGenomeChange,
        handleSaveSearch,
        handleSubmit,
        setInputValue,
        removeFromHistory,
        deleteSavedSearch,
    } = useGenomicSearch();

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="flex flex-col items-center">
                <div className="max-w-[520px] w-full mx-auto">
                    <Autocomplete
                        options={suggestions}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onInputChange={handleInputChange}
                        placeholder={getPlaceholderText()}
                        isLoading={isLoading}
                        onSubmit={handleSubmit}
                        className="w-full"
                        startContent={
                            <div className="flex items-center space-x-3">
                                <ToggleGroup
                                    type="single"
                                    value={selectedGenome}
                                    onValueChange={handleGenomeChange}
                                    className="pr-2 mx-0"
                                >
                                    <ToggleGroupItem
                                        value="hg38"
                                        className="data-[state=on]:bg-primary rounded-lg data-[state=on]:text-background font-mono text-xs px-2 py-1"
                                    >
                                        HG38
                                    </ToggleGroupItem>
                                    <ToggleGroupItem
                                        value="hg19"
                                        className="data-[state=on]:bg-primary rounded-lg data-[state=on]:text-background font-mono text-xs px-2 py-1"
                                    >
                                        HG19
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <div className="w-px h-6 bg-slate-300 my-auto" />
                            </div>
                        }
                        endContent={
                            inputValue.trim() ? (
                                <SaveSearchDialog
                                    query={inputValue}
                                    genomicBuild={selectedGenome}
                                    onSave={handleSaveSearch}
                                />
                            ) : undefined
                        }
                    >
                        {(item) => (
                            <div className="p-3 group">
                                <div className="w-full text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-primary truncate text-xs">
                                            {item.value}
                                        </span>
                                    </div>

                                    {item.type === "rsid" && (
                                        <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                            {item.data?.variant_vcf && (
                                                <span className="font-mono">
                                                    {item.data.variant_vcf}
                                                </span>
                                            )}
                                            {item.data?.snp_type && (
                                                <span>
                                                    {item.data.snp_type === "SNV" ? "SNV" : "InDel"}
                                                </span>
                                            )}
                                            {item.data?.clnsig && (
                                                <span className="text-muted-foreground/80">
                                                    {item.data.clnsig}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {item.type === "variant" && item.data?.snp_type && (
                                        <div className="text-xs text-muted-foreground">
                                            {item.data.snp_type}
                                        </div>
                                    )}

                                    {item.type === "gene" && item.data?.chromosome && (
                                        <div className="text-xs text-muted-foreground">
                                            {item.data.chromosome}
                                            {item.data.position && ` • ${item.data.position}`}
                                        </div>
                                    )}

                                    {item.type === "history" && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-muted-foreground italic">
                                                Recent search
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    e.nativeEvent.stopImmediatePropagation();
                                                    removeFromHistory(item.value);
                                                }}
                                                className="h-auto p-1 text-xs opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                aria-label={`Remove "${item.value}" from recent searches`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}

                                    {item.type === "saved" && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-primary italic">
                                                ★ {item.data?.name}
                                                {item.data?.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {item.data.description}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    e.nativeEvent.stopImmediatePropagation();
                                                    deleteSavedSearch(item.id);
                                                }}
                                                className="h-auto p-1 text-xs opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                aria-label={`Delete saved search "${item.data?.name}"`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Autocomplete>
                </div>

                {showAlert && (
                    <Alert variant="destructive" className="max-w-lg mt-4">
                        <AlertDescription>{alertMessage}</AlertDescription>
                    </Alert>
                )}

                <Button type="submit" className="mt-8" variant="default">
                    Search
                </Button>
            </form>
        </div>
    );
}
