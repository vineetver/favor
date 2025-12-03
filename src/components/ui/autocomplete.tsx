"use client";

import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from "@headlessui/react";
import { ChevronsUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";


export interface AutocompleteOption {
    id: string;
    value: string;
    label?: string;
    type?: string;
    data?: any;
}

interface AutocompleteProps {
    options: AutocompleteOption[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    isLoading?: boolean;
    startContent?: React.ReactNode;
    endContent?: React.ReactNode;
    onInputChange?: (value: string) => void;
    children?: (item: AutocompleteOption) => React.ReactNode;
    onSubmit?: (e: React.FormEvent) => void;
}

export function Autocomplete({
    options,
    value,
    onValueChange,
    placeholder,
    emptyMessage = "No results found.",
    className,
    disabled,
    isLoading,
    startContent,
    endContent,
    onInputChange,
    children,
    onSubmit,
}: AutocompleteProps) {
    const [query, setQuery] = useState("");
    const [selectedValue, setSelectedValue] = useState<string>(value || "");

    useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value);
        }
    }, [value]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setQuery(newValue);
        setSelectedValue(newValue);
        onInputChange?.(newValue);
    };

    const handleSelectChange = (selected: AutocompleteOption | null) => {
        if (selected) {
            setSelectedValue(selected.value);
            setQuery("");
            onValueChange?.(selected.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit(e as any);
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <Combobox value={null} onChange={handleSelectChange}>
                <div className="relative">
                    <div
                        className={cn(
                            "flex h-12 w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg transition-all duration-300 hover:shadow-xl focus-within:border-primary/50 focus-within:shadow-primary/10 items-center",
                            startContent && "pl-2",
                            endContent,
                        )}
                    >
                        {startContent && <div className="shrink-0">{startContent}</div>}
                        <ComboboxInput
                            className="border-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 h-full flex-1"
                            displayValue={() => selectedValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {endContent && <div className="shrink-0">{endContent}</div>}
                        <ComboboxButton className="h-8 w-8 mr-2 shrink-0 rounded-full hover:bg-accent/50 flex items-center justify-center transition">
                            <ChevronsUpDown className="h-4 w-4" />
                        </ComboboxButton>
                    </div>

                    <ComboboxOptions className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md bg-background/95 backdrop-blur-sm border shadow-lg py-1 text-base focus:outline-none sm:text-sm transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0">
                        {isLoading ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                Loading...
                            </div>
                        ) : options.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            options.map((option) => (
                                <ComboboxOption
                                    key={option.id}
                                    className="relative cursor-pointer select-none mb-0.5 last:mb-0 rounded-lg mx-1 transition-all duration-200 data-focus:bg-accent data-focus:text-accent-foreground"
                                    value={option}
                                >
                                    {children ? (
                                        children(option)
                                    ) : (
                                        <div className="flex items-center justify-between p-3 w-full">
                                            <div className="grow min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-primary truncate text-sm">
                                                        {option.label || option.value}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </div>
            </Combobox>
        </div>
    );
}
