import type { PathwayInteraction, PathwayGenes } from "./api";

export const PATHWAY_SOURCES = {
  KEGG: {
    name: "KEGG",
    description: "Kyoto Encyclopedia of Genes and Genomes",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  BioCyc: {
    name: "BioCyc",
    description: "Collection of Pathway/Genome Databases",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  WikiPathways: {
    name: "WikiPathways",
    description: "Open, collaborative pathway curation",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  IntPath: {
    name: "IntPath",
    description: "Integrated Pathway Analysis",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
} as const;

export type PathwaySourceKey = keyof typeof PATHWAY_SOURCES;
export type PathwaySource = (typeof PATHWAY_SOURCES)[PathwaySourceKey];

export type PathwaySourceData = {
  interactions: PathwayInteraction[];
  genes: PathwayGenes[];
};

export type PathwayData = {
  [key: string]: PathwaySourceData;
};
