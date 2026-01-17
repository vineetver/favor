"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import {
  ArrowUpRight,
  FileText,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { SaveSearchDialog } from "@/features/search/components/save-search-dialog";
import { useDebounce } from "@/features/search/hooks/use-debounce";
import { useSavedSearches } from "@/features/search/hooks/use-saved-searches";
import {
  useRecentSearches,
  useSearchHistory,
} from "@/features/search/hooks/use-search-history";
import { useSearchSuggestions } from "@/features/search/hooks/use-search-suggestions";
import { parseQuery } from "@/features/search/lib/query-parser/parser";
import { validateQuery } from "@/features/search/lib/query-parser/validators";
import {
  type GenomicBuild,
  useSearchActions,
  useSearchInput,
} from "@/features/search/stores/search-store";
import { validateAndNavigate } from "@/features/search/utils/navigation";
import { cn } from "@/lib/utils";

// Stats data
const stats = [
  { id: "total-variants", value: "8.9B", label: "TOTAL VARIANTS" },
  { id: "possible-snvs", value: "8.8B", label: "POSSIBLE SNVS" },
  { id: "observed-indels", value: "80M", label: "OBSERVED INDELS" },
];

// Quick search examples
const quickSearches = ["BRCA1", "rs7412", "chr1:1000-2000"];

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
      </div>

      <main className="relative z-10 pt-32 sm:pt-40 pb-32 px-6 sm:px-8 lg:px-12 max-w-[1400px] mx-auto flex flex-col items-center">
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto relative">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-white border border-slate-200/60 shadow-sm shadow-slate-200/50 backdrop-blur-md">
                <span className="flex h-2.5 w-2.5 relative mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Functional Annotation Resource
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-semibold text-slate-900 tracking-tighter mb-8 leading-[1.05]">
              Unlocking the <br />
              <span className="text-transparent bg-clip-text bg-linear-to-br from-violet-700 via-purple-700 to-fuchsia-700">
                Human Genome.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed tracking-tight font-light">
              An open-access portal for whole genome sequencing variant
              annotation. Precision at the speed of thought.
            </p>
          </div>

          {/* Search Component */}
          <div className="w-full max-w-3xl mt-16 mb-20">
            <SearchInterface />
          </div>

          {/* Stats */}
          <StatsTicker />

          {/* Divider */}
          <div className="w-full max-w-xs mx-auto border-t border-slate-200 my-24"></div>

          {/* Batch Annotation Section */}
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Batch Processing
              </h2>
              <p className="text-slate-500 text-xl max-w-xl mx-auto">
                Upload VCF or CSV files for large-scale annotation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Documentation Card */}
              <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between h-[500px] relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 text-slate-900">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                    Documentation & Specs
                  </h3>
                  <p className="text-slate-500 text-lg leading-relaxed pr-8">
                    Review the file formatting guidelines to ensure perfect
                    parsing of your variant data.
                  </p>
                </div>
                <div className="relative z-10 pt-8">
                  <Link
                    href="/about"
                    className="text-base font-semibold text-slate-900 flex items-center gap-2 hover:gap-3 transition-all"
                  >
                    Read Documentation <ArrowUpRight className="w-5 h-5" />
                  </Link>
                </div>
                {/* Decoration */}
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
              </div>

              {/* Upload Card */}
              <Link
                href="/batch-annotation"
                className="bg-slate-900 text-white rounded-[2.5rem] p-12 shadow-2xl shadow-purple-900/20 flex flex-col items-center justify-center text-center h-[500px] relative overflow-hidden cursor-pointer group transition-transform hover:scale-[1.01] duration-300"
              >
                <div className="absolute inset-0 bg-linear-to-br from-slate-900 to-purple-900 opacity-50"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                    <UploadCloud className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">
                    Upload Dataset
                  </h3>
                  <p className="text-slate-400 text-lg mb-10 max-w-sm">
                    Drag & drop your VCF file here, or click to browse.
                  </p>
                  <span className="inline-flex px-5 py-2.5 rounded-full bg-white/10 border border-white/5 text-sm font-medium backdrop-blur-md">
                    Max file size: 50MB
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Stats Ticker Component
function StatsTicker() {
  return (
    <div className="flex flex-wrap justify-center items-center gap-y-10">
      {stats.map((stat, index) => (
        <div key={stat.id} className="flex items-center">
          {index > 0 && (
            <div className="h-16 w-px bg-slate-200 mx-8 md:mx-16 hidden sm:block" />
          )}
          <div className="text-center px-6 sm:px-0">
            <div className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-2">
              {stat.value}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Search Interface Component
function SearchInterface() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { inputValue, selectedGenome } = useSearchInput();
  const { setInputValue, setSelectedGenome, showError } = useSearchActions();
  const { addToHistory, removeFromHistory } = useSearchHistory();

  const saveSearch = useSavedSearches((state) => state.saveSearch);
  const deleteSavedSearch = useSavedSearches(
    (state) => state.deleteSavedSearch,
  );
  const savedSearchesArray = useSavedSearches((state) => state.savedSearches);

  const debouncedInput = useDebounce(inputValue.trim(), 300);

  const recentSearches = useRecentSearches(4);
  const savedSearches = savedSearchesArray.map((item) => ({
    type: "saved" as const,
    value: item.query,
    id: item.id,
    data: item,
  }));

  const { suggestions, isLoading } = useSearchSuggestions({
    query: debouncedInput,
    selectedGenome,
    recentSearches: [...savedSearches, ...recentSearches],
  });

  const handleInputChange = useCallback(
    (value: string) => {
      const parsed = parseQuery(value);
      setInputValue(parsed.formatted);
    },
    [setInputValue],
  );

  const handleGenomeChange = useCallback(
    (genome: GenomicBuild) => {
      setSelectedGenome(genome);
    },
    [setSelectedGenome],
  );

  const handleSaveSearch = useCallback(
    (name: string, description?: string) => {
      saveSearch(inputValue, name, selectedGenome, description);
    },
    [inputValue, selectedGenome, saveSearch],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const query = inputValue.trim();

      if (!query) {
        showError("Please enter a search query");
        return;
      }

      const parsed = parseQuery(query);
      const validation = validateQuery(parsed.normalized);

      if (!validation.isValid || !validation.type) {
        showError(validation.error || "Invalid search format");
        return;
      }

      const navigation = validateAndNavigate(
        parsed.formatted,
        validation.type,
        selectedGenome,
      );

      if (!navigation.success) {
        showError(navigation.error || "Navigation failed");
        return;
      }

      addToHistory(parsed.formatted);
      if (navigation.path) {
        router.push(navigation.path);
      }
    },
    [inputValue, selectedGenome, addToHistory, router, showError],
  );

  const handleSelectOption = (option: { value: string } | null) => {
    if (option) {
      setInputValue(option.value);
      setIsDropdownOpen(false);
    }
  };

  const handleFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleBlur = () => {
    // Small delay to allow clicking on dropdown options
    setTimeout(() => setIsDropdownOpen(false), 200);
  };

  return (
    <div className="w-full">
      {/* Search Container */}
      <form onSubmit={handleSubmit} className="relative group">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-linear-to-r from-purple-200 to-indigo-200 rounded-[28px] blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>

        <div className="relative">
          <Combobox value={null} onChange={handleSelectOption}>
            <div className="relative flex flex-col sm:flex-row items-center bg-white p-2.5 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/80 ring-1 ring-slate-100">
              {/* Segmented Control */}
              <div className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 m-1 sm:mr-4 shrink-0 relative w-full sm:w-[144px]">
                {/* Sliding Background Indicator */}
                <div
                  className={cn(
                    "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out",
                    selectedGenome === "hg38" ? "left-1" : "right-1",
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg38")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    selectedGenome === "hg38"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  HG38
                </button>
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg19")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    selectedGenome === "hg19"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  HG19
                </button>
              </div>

              {/* Input */}
              <div className="flex-1 w-full relative">
                <ComboboxInput
                  className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg h-14 px-2 font-medium tracking-tight focus:outline-none"
                  displayValue={() => inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Search gene, variant, or region..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Save button */}
              {inputValue.trim() && (
                <div className="shrink-0 mr-2">
                  <SaveSearchDialog
                    query={inputValue}
                    genomicBuild={selectedGenome}
                    onSave={handleSaveSearch}
                  />
                </div>
              )}

              {/* Search Action */}
              <button
                type="submit"
                className="hidden sm:flex bg-slate-900 hover:bg-slate-800 text-white w-12 h-12 rounded-[18px] transition-all duration-200 items-center justify-center shadow-lg shadow-slate-900/10 mr-1"
              >
                {isLoading && isDropdownOpen ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Search className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <ComboboxOptions
                static
                className="absolute z-50 mt-2 max-h-80 w-full overflow-auto scrollbar-hide rounded-2xl bg-white border border-slate-100 shadow-xl py-2 text-base focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {isLoading ? (
                  <div className="relative cursor-default select-none py-4 px-6 text-slate-400">
                    Loading...
                  </div>
                ) : suggestions.length === 0 && inputValue.trim() !== "" ? (
                  <div className="relative cursor-default select-none py-4 px-6 text-slate-400">
                    No results found.
                  </div>
                ) : (
                  suggestions.map((option) => (
                    <ComboboxOption
                      key={option.id}
                      className="relative cursor-pointer select-none mx-2 rounded-xl transition-all duration-200 data-focus:bg-slate-50"
                      value={option}
                    >
                      <div className="p-4 group">
                        <div className="w-full text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 truncate text-base">
                              {option.value}
                            </span>
                          </div>

                          {option.type === "rsid" && (
                            <div className="text-sm text-slate-500 flex gap-2 flex-wrap">
                              {option.data?.variant_vcf && (
                                <span className="font-mono">
                                  {option.data.variant_vcf}
                                </span>
                              )}
                              {option.data?.snp_type && (
                                <span>
                                  {option.data.snp_type === "SNV"
                                    ? "SNV"
                                    : "InDel"}
                                </span>
                              )}
                            </div>
                          )}

                          {option.type === "variant" &&
                            option.data?.snp_type && (
                              <div className="text-sm text-slate-500">
                                {option.data.snp_type}
                              </div>
                            )}

                          {option.type === "gene" &&
                            option.data?.chromosome && (
                              <div className="text-sm text-slate-500">
                                {option.data.chromosome}
                                {option.data.position &&
                                  ` - ${option.data.position}`}
                              </div>
                            )}

                          {option.type === "history" && (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-400 italic">
                                Recent search
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeFromHistory(option.value);
                                }}
                                className="h-auto p-1 text-sm opacity-0 group-hover:opacity-100 hover:text-red-500"
                              >
                                Remove
                              </Button>
                            </div>
                          )}

                          {option.type === "saved" && (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-purple-600 italic">
                                Saved: {option.data?.name}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteSavedSearch(option.id);
                                }}
                                className="h-auto p-1 text-sm opacity-0 group-hover:opacity-100 hover:text-red-500"
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            )}
          </Combobox>
        </div>
      </form>

      {/* Helper Text */}
      <div className="mt-6 flex justify-center gap-8 text-sm font-medium text-slate-400 uppercase tracking-widest opacity-80">
        {quickSearches.map((search) => (
          <button
            type="button"
            key={search}
            className="hover:text-purple-600 cursor-pointer transition-colors"
            onClick={() => setInputValue(search)}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
