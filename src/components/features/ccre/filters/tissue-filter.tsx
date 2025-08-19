"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTissueStore } from "@/lib/stores/tissue-store";
import { getSubtissueOptions, getTissueOptions } from "@/lib/variant/ccre/tissue-config";

interface SubtissueMetadata {
  sex?: string;
  age?: string;
  condition?: string;
  displayName: string;
}

export function TissueFilter() {
  const {
    selectedTissue,
    selectedSubtissue,
    setSelectedTissue,
    setSelectedSubtissue,
    reset,
  } = useTissueStore();
  const [subtissueSearch, setSubtissueSearch] = useState("");

  const tissues = getTissueOptions();
  const subtissues = selectedTissue ? getSubtissueOptions(selectedTissue) : [];

  const getTruncatedName = (name: string) => {
    // Take the first part before comma and capitalize
    const firstPart = name.split(",")[0];
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  };

  const parseSubtissueMetadata = (name: string): SubtissueMetadata => {
    const metadata: SubtissueMetadata = { displayName: name };

    // Extract sex/gender
    if (name.includes("male") && !name.includes("female")) {
      metadata.sex = "M";
    } else if (name.includes("female")) {
      metadata.sex = "F";
    }

    // Extract age information - handle various formats
    const agePatterns = [
      /\((\d+(?:\s*or\s*above)?\s*years?)\)/, // (89 years)
      /\((\d+\s*days?)\)/, // (112 days)
      /(\d+(?:\s*or\s*above)?\s*years?)/, // 89 years
      /(\d+\s*days?)/, // 112 days
    ];

    for (const pattern of agePatterns) {
      const match = name.match(pattern);
      if (match) {
        let age = match[1];
        if (age.includes("days")) {
          age = age.replace("days", "d").replace("day", "d");
        } else {
          age = age.replace("years", "y").replace("year", "y");
        }
        metadata.age = age.trim();
        break;
      }
    }

    // Extract condition
    if (name.includes("mild cognitive impairment")) {
      metadata.condition = "MCI";
    } else if (name.includes("alzheimer")) {
      metadata.condition = "AD";
    } else if (name.includes("embryo")) {
      metadata.condition = "Embryo";
    }

    return metadata;
  };

  const filteredSubtissues = useMemo(() => {
    if (!subtissueSearch) return subtissues;
    return subtissues.filter(
      (subtissue) =>
        subtissue.name.toLowerCase().includes(subtissueSearch.toLowerCase()) ||
        subtissue.displayName
          ?.toLowerCase()
          .includes(subtissueSearch.toLowerCase()),
    );
  }, [subtissues, subtissueSearch]);

  const handleTissueChange = (tissue: string) => {
    setSelectedTissue(tissue);
    setSelectedSubtissue("");
  };

  const handleSubtissueChange = (subtissueName: string) => {
    setSelectedSubtissue(subtissueName);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            Tissue & Cell Type Filter
          </span>
          {(selectedTissue || selectedSubtissue) && (
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Tissue Selection */}
        <Select value={selectedTissue} onValueChange={handleTissueChange}>
          <SelectTrigger className="w-full min-w-0 px-3 py-2">
            <SelectValue placeholder="Select tissue type" />
          </SelectTrigger>
          <SelectContent className="w-full min-w-[calc(100vw-2rem)] sm:min-w-0 sm:w-auto">
            {tissues.map((tissue) => (
              <SelectItem key={tissue} value={tissue}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{tissue}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {getSubtissueOptions(tissue).length} samples
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subtissue Selection */}
        {selectedTissue && subtissues.length > 0 && (
          <div>
            {subtissues.length > 8 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search samples..."
                  value={subtissueSearch}
                  onChange={(e) => setSubtissueSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            <Select
              value={selectedSubtissue}
              onValueChange={handleSubtissueChange}
            >
              <SelectTrigger className="w-full min-w-0 px-3 py-2 max-w-80">
                <SelectValue
                  placeholder="Select specific sample"
                  className="truncate"
                >
                  {selectedSubtissue ? (
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-sm" title={selectedSubtissue}>
                        {selectedSubtissue}
                      </span>
                    </div>
                  ) : (
                    "Select specific sample"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72 max-w-96 w-full min-w-80">
                {filteredSubtissues.map((subtissue) => {
                  const metadata = parseSubtissueMetadata(subtissue.name);
                  return (
                    <SelectItem
                      key={subtissue.name}
                      value={subtissue.name}
                      className="py-3 px-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium text-sm leading-tight break-words pr-2" 
                            title={subtissue.displayName || subtissue.name}
                          >
                            {subtissue.displayName || subtissue.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {metadata.sex && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700"
                            >
                              {metadata.sex}
                            </Badge>
                          )}
                          {metadata.age && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700"
                            >
                              {metadata.age}
                            </Badge>
                          )}
                          {metadata.condition && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-700"
                            >
                              {metadata.condition}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
