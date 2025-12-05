import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export const integrativeConfig = helper.group("integrative", "Integrative", [
  helper.accessor("apc_protein_function_v3", {
    header: "aPC-Protein Function",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Protein Function:</strong> Integrative score combining
          multiple protein function predictions (SIFT, PolyPhen, Grantham,
          PolyPhen2, MutationTaster, MutationAssessor) into a single
          PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More likely to affect
            protein function
          </li>
          <li>
            <strong>Lower scores:</strong> Less likely to affect protein
            function
          </li>
          <li>
            <strong>PHRED scale:</strong> Higher values indicate stronger
            evidence
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_conservation_v2", {
    header: "aPC-Conservation",
    description: (
      <div className="space-y-2 text-left">
        <p>
          Conservation annotation PC: the first PC of the standardized scores of
          "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP,
          verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More evolutionarily
            conserved
          </li>
          <li>
            <strong>Lower scores:</strong> Less evolutionarily conserved
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_epigenetics_active", {
    header: "aPC-Epigenetics Active",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Epigenetics Active:</strong> Integrative score combining
          active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac,
          H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238].
          (Li et al., 2020)
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
            Active
          </span>
          <span className="text-xs text-muted-foreground">
            Associated with gene expression and regulatory activity
          </span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More active chromatin state
          </li>
          <li>
            <strong>Lower scores:</strong> Less active chromatin state
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_epigenetics_repressed", {
    header: "aPC-Epigenetics Repressed",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Epigenetics Repressed:</strong> Integrative score
          combining repressive chromatin marks (H3K9me3, H3K27me3) into a single
          PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">
            Repressed
          </span>
          <span className="text-xs text-muted-foreground">
            Associated with gene silencing and heterochromatin
          </span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More repressed chromatin
            state
          </li>
          <li>
            <strong>Lower scores:</strong> Less repressed chromatin state
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_epigenetics_transcription", {
    header: "aPC-Epigenetics Transcription",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Epigenetics Transcription:</strong> Integrative score
          combining transcription-associated chromatin marks (H3K36me3,
          H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et
          al., 2020)
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
            Transcription
          </span>
          <span className="text-xs text-muted-foreground">
            Associated with active gene transcription
          </span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More transcriptionally
            active chromatin
          </li>
          <li>
            <strong>Lower scores:</strong> Less transcriptionally active
            chromatin
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_local_nucleotide_diversity_v3", {
    header: "aPC-Local Nucleotide Diversity",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Local Nucleotide Diversity:</strong> Integrative score
          combining local genetic diversity measures (background selection
          statistic, recombination rate, nucleotide diversity) into a single
          PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> Higher local genetic
            diversity
          </li>
          <li>
            <strong>Lower scores:</strong> Lower local genetic diversity
          </li>
          <li>
            <strong>Diversity context:</strong> Reflects evolutionary and
            recombination patterns
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_mutation_density", {
    header: "aPC-Mutation Density",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Mutation Density:</strong> Integrative score combining
          mutation densities at different scales (100bp, 1kb, 10kb windows) for
          common, rare, and singleton variants into a single PHRED-scaled score.
          Range: [0, 84.477]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> Higher local mutation
            density
          </li>
          <li>
            <strong>Lower scores:</strong> Lower local mutation density
          </li>
          <li>
            <strong>Density context:</strong> Reflects mutational burden in
            genomic region
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_transcription_factor", {
    header: "aPC-Transcription Factor",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Transcription Factor:</strong> Integrative score combining
          transcription factor binding evidence (ReMap TF overlap, ReMap cell
          line overlap) into a single PHRED-scaled score. Range: [1.185,
          86.238]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More transcription factor
            binding evidence
          </li>
          <li>
            <strong>Lower scores:</strong> Less transcription factor binding
            evidence
          </li>
          <li>
            <strong>TF binding:</strong> Indicates regulatory potential
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("apc_mappability", {
    header: "aPC-Mappability",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>aPC-Mappability:</strong> Integrative score combining sequence
          mappability measures at different read lengths (k=24, 36, 50, 100) for
          unique and multi-mapping reads into a single PHRED-scaled score.
          Range: [0.007, 22.966]. (Li et al., 2020)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> Better sequence mappability
          </li>
          <li>
            <strong>Lower scores:</strong> Poorer sequence mappability
          </li>
          <li>
            <strong>Mappability:</strong> Affects sequencing read alignment
            quality
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("cadd_phred", {
    header: "CADD phred",
    description: (
      <div className="space-y-2 text-left">
        <p>
          The CADD score in PHRED scale (integrative score). A higher CADD score
          indicates more deleterious. Range: [0.001, 84]. (Kircher et al., 2014;
          Rentzsch et al., 2018)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;10):</strong> More likely deleterious
          </li>
          <li>
            <strong>Lower scores:</strong> More likely benign
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("linsight", {
    header: "LINSIGHT",
    description: (
      <div className="space-y-2 text-left">
        <p>
          The LINSIGHT score (integrative score). A higher LINSIGHT score
          indicates more functionality. Range: [0.033, 0.995]. (Huang et al.,
          2017)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;0.5):</strong> More likely functional
          </li>
          <li>
            <strong>Lower scores:</strong> Less likely functional
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
  helper.accessor("fathmm_xf", {
    header: "Fathmm XF",
    description: (
      <div className="space-y-2 text-left">
        <p>
          The FATHMM-XF score for coding variants (integrative score). A higher
          FATHMM-XF score indicates more functionality. Range: [0.001, 0.999].
          (Rogers et al., 2017)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;0.5):</strong> More likely functional
          </li>
          <li>
            <strong>Lower scores:</strong> Less likely functional
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.decimal(6, true),
    validate: (num) => typeof num === "number" && num >= 0,
  }),
]);
