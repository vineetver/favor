import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export const conservationConfig = helper.group("conservation", "Conservation", [
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
    cell: helper.format.custom((num) => <span>{roundNumber(num, 6, true)}</span>),
  }),
  helper.accessor("mamphcons", {
    header: "mamPhCons",
    description: (
      <div className="space-y-2 text-left">
        <p>
          Mammalian phastCons conservation score (excl. human). A higher score
          means the region is more conserved. PhastCons considers n species
          rather than two. It considers the phylogeny by which these species are
          related, and instead of measuring similarity/divergence simply in
          terms of percent identity. It uses statistical models of nucleotide
          substitution that allow for multiple substitutions per site and for
          unequal rates of substitution between different pairs of bases. Range:
          [0, 1] (default: 0.0). (Siepel et al., 2005)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher scores (&gt;0.8):</strong> More evolutionarily
            conserved
          </li>
          <li>
            <strong>Lower scores:</strong> Less evolutionarily conserved
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("priphcons", {
    header: "priPhCons",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>Primate phastCons:</strong> Conservation score comparing
          primate species (excluding humans). Uses evolutionary models to
          identify conserved regions across multiple species. Range: [-10.761,
          0.595] (default: -0.029). (Pollard et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;0.3):</strong> More
            evolutionarily conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Faster evolution than expected
          </li>
          <li>
            <strong>phastCons:</strong> Models evolutionary pressure across
            species
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("verphcons", {
    header: "verPhCons",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>Vertebrate phastCons:</strong> Conservation score comparing
          vertebrate species (excluding humans). Uses evolutionary models to
          identify conserved regions across vertebrates. Range: [-20, 11.295]
          (default: 0.042). (Pollard et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;2):</strong> More evolutionarily
            conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Faster evolution than expected
          </li>
          <li>
            <strong>phastCons:</strong> Models evolutionary pressure across
            species
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("priphylop", {
    header: "priPhyloP",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>Primate phyloP:</strong> Site-by-site conservation score
          comparing primate species (excluding humans). Measures evolutionary
          constraint at individual positions. Range: [-10.761, 0.595] (default:
          -0.029). (Pollard et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;0.3):</strong> More
            evolutionarily conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Faster evolution than expected
          </li>
          <li>
            <strong>phyloP:</strong> Per-site evolutionary constraint analysis
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("mamphylop", {
    header: "mamPhyloP",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>Mammalian phyloP:</strong> Site-by-site conservation score
          comparing mammalian species (excluding humans). Measures evolutionary
          constraint at individual positions. Range: [-20, 4.494] (default:
          -0.005). (Pollard et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;3):</strong> More evolutionarily
            conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Faster evolution than expected
          </li>
          <li>
            <strong>phyloP:</strong> Per-site evolutionary constraint analysis
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("verphylop", {
    header: "verPhyloP",
    description: (
      <div className="space-y-2 text-left">
        <p>
          <strong>Vertebrate phyloP:</strong> Site-by-site conservation score
          comparing vertebrate species (excluding humans). Measures evolutionary
          constraint at individual positions. Range: [-20, 11.295] (default:
          0.042). (Pollard et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;8):</strong> More evolutionarily
            conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Faster evolution than expected
          </li>
          <li>
            <strong>phyloP:</strong> Per-site evolutionary constraint analysis
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("gerp_n", {
    header: "GerpN",
    description: (
      <div className="space-y-2 text-left">
        <p>
          Neutral evolution score defined by GERP++. A higher score means the
          region is more conserved. Range: [0, 19.8] (default: 3.0). (Davydov et
          al., 2010)
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
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
  helper.accessor("gerp_s", {
    header: "GerpS",
    description: (
      <div className="space-y-2 text-left">
        <p>
          Rejected Substitution score defined by GERP++. A higher score means
          the region is more conserved. GERP (Genomic Evolutionary Rate
          Profiling) identifies constrained elements in multiple alignments by
          quantifying substitution deficits. These deficits represent
          substitutions that would have occurred if the element were neutral
          DNA, but did not occur because the element has been under functional
          constraint. These deficits are referred to as "Rejected
          Substitutions". Rejected substitutions are a natural measure of
          constraint that reflects the strength of past purifying selection on
          the element. GERP estimates constraint for each alignment column;
          elements are identified as excess aggregations of constrained columns.
          Positive scores (fewer than expected) indicate that a site is under
          evolutionary constraint. Negative scores may be weak evidence of
          accelerated rates of evolution. Range: [-39.5, 19.8] (default: -0.2).
          (Davydov et al., 2010)
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Higher positive scores (&gt;10):</strong> More
            evolutionarily conserved
          </li>
          <li>
            <strong>Negative scores:</strong> Accelerated evolution
          </li>
        </ul>
      </div>
    ),
    cell: helper.format.custom((num) => <span>{roundNumber(num)}</span>),
  }),
]);
