import type { Variant } from "@/lib/variant/types";
import type { GnomadData } from "@/lib/variant/gnomad/api";

export interface PopulationFrequency {
  population_code: string;
  name: string;
  male: number | undefined;
  female: number | undefined;
  male41_exome: number | undefined;
  female41_exome: number | undefined;
  male41_genome: number | undefined;
  female41_genome: number | undefined;
}

export interface MaleFrequency {
  population_code: string;
  name: string;
  male31: number | undefined;
  male41_exome: number | undefined;
  male41_genome: number | undefined;
}

export interface FemaleFrequency {
  population_code: string;
  name: string;
  female31: number | undefined;
  female41_exome: number | undefined;
  female41_genome: number | undefined;
}

export interface PopulationConfig {
  code: string;
  name: string;
  maleField: keyof Variant;
  femaleField: keyof Variant;
  exomeMaleField: keyof GnomadData;
  exomeFemaleField: keyof GnomadData;
  genomeMaleField: keyof GnomadData;
  genomeFemaleField: keyof GnomadData;
}

const POPULATION_CONFIGS: PopulationConfig[] = [
  {
    code: "Overall AF",
    name: "ALL (Overall Population)",
    maleField: "af_male",
    femaleField: "af_female",
    exomeMaleField: "af_xy",
    exomeFemaleField: "af_xx",
    genomeMaleField: "af_xy",
    genomeFemaleField: "af_xx",
  },
  {
    code: "AFR AF",
    name: "AFR (African/African American)",
    maleField: "af_afr_male",
    femaleField: "af_afr_female",
    exomeMaleField: "af_afr_xy",
    exomeFemaleField: "af_afr_xx",
    genomeMaleField: "af_afr_xy",
    genomeFemaleField: "af_afr_xx",
  },
  {
    code: "AMI AF",
    name: "AMI (Amish)",
    maleField: "af_ami_male",
    femaleField: "af_ami_female",
    exomeMaleField: "af_ami_xy",
    exomeFemaleField: "af_ami_xx",
    genomeMaleField: "af_ami_xy",
    genomeFemaleField: "af_ami_xx",
  },
  {
    code: "AMR AF",
    name: "AMR (Ad Mixed American)",
    maleField: "af_amr_male",
    femaleField: "af_amr_female",
    exomeMaleField: "af_amr_xy",
    exomeFemaleField: "af_amr_xx",
    genomeMaleField: "af_amr_xy",
    genomeFemaleField: "af_amr_xx",
  },
  {
    code: "ASJ AF",
    name: "ASJ (Ashkenazi Jewish)",
    maleField: "af_asj_male",
    femaleField: "af_asj_female",
    exomeMaleField: "af_asj_xy",
    exomeFemaleField: "af_asj_xx",
    genomeMaleField: "af_asj_xy",
    genomeFemaleField: "af_asj_xx",
  },
  {
    code: "EAS AF",
    name: "EAS (East Asian)",
    maleField: "af_eas_male",
    femaleField: "af_eas_female",
    exomeMaleField: "af_eas_xy",
    exomeFemaleField: "af_eas_xx",
    genomeMaleField: "af_eas_xy",
    genomeFemaleField: "af_eas_xx",
  },
  {
    code: "FIN AF",
    name: "FIN (Finnish in Finland)",
    maleField: "af_fin_male",
    femaleField: "af_fin_female",
    exomeMaleField: "af_fin_xy",
    exomeFemaleField: "af_fin_xx",
    genomeMaleField: "af_fin_xy",
    genomeFemaleField: "af_fin_xx",
  },
  {
    code: "NFE AF",
    name: "NFE (Non-Finnish European)",
    maleField: "af_nfe_male",
    femaleField: "af_nfe_female",
    exomeMaleField: "af_nfe_xy",
    exomeFemaleField: "af_nfe_xx",
    genomeMaleField: "af_nfe_xy",
    genomeFemaleField: "af_nfe_xx",
  },
  {
    code: "OTH AF",
    name: "OTH (Other Populations)",
    maleField: "af_oth_male",
    femaleField: "af_oth_female",
    exomeMaleField: "af_remaining_xy",
    exomeFemaleField: "af_remaining_xx",
    genomeMaleField: "af_remaining_xy",
    genomeFemaleField: "af_remaining_xx",
  },
  {
    code: "SAS AF",
    name: "SAS (South Asian)",
    maleField: "af_sas_male",
    femaleField: "af_sas_female",
    exomeMaleField: "af_sas_xy",
    exomeFemaleField: "af_sas_xx",
    genomeMaleField: "af_sas_xy",
    genomeFemaleField: "af_sas_xx",
  },
];

export function buildPopulationFrequencies(
  variant: Variant,
  exome: GnomadData | null,
  genome: GnomadData | null,
): PopulationFrequency[] {
  return POPULATION_CONFIGS.map((config) => ({
    population_code: config.code,
    name: config.name,
    male: variant[config.maleField] as number | undefined,
    female: variant[config.femaleField] as number | undefined,
    male41_exome: exome?.[config.exomeMaleField] as number | undefined,
    female41_exome: exome?.[config.exomeFemaleField] as number | undefined,
    male41_genome: genome?.[config.genomeMaleField] as number | undefined,
    female41_genome: genome?.[config.genomeFemaleField] as number | undefined,
  }));
}

export function buildMaleFrequencies(
  variant: Variant,
  exome: GnomadData | null,
  genome: GnomadData | null,
): MaleFrequency[] {
  return POPULATION_CONFIGS.map((config) => ({
    population_code: config.code,
    name: config.name,
    male31: variant[config.maleField] as number | undefined,
    male41_exome: exome?.[config.exomeMaleField] as number | undefined,
    male41_genome: genome?.[config.genomeMaleField] as number | undefined,
  }));
}

export function buildFemaleFrequencies(
  variant: Variant,
  exome: GnomadData | null,
  genome: GnomadData | null,
): FemaleFrequency[] {
  return POPULATION_CONFIGS.map((config) => ({
    population_code: config.code,
    name: config.name,
    female31: variant[config.femaleField] as number | undefined,
    female41_exome: exome?.[config.exomeFemaleField] as number | undefined,
    female41_genome: genome?.[config.genomeFemaleField] as number | undefined,
  }));
}

export interface AncestryFrequency {
  population_code: string;
  name: string;
  g1000: number | undefined;
  gnomad31: number | undefined;
  gnomad41_exome: number | undefined;
  gnomad41_genome: number | undefined;
}

const ANCESTRY_POPULATION_CONFIGS = [
  {
    code: "AFR",
    name: "AFR (African)",
    g1000Field: "tg_afr" as keyof Variant,
    gnomad31Field: "af_afr" as keyof Variant,
    exomeField: "af_afr" as keyof GnomadData,
    genomeField: "af_afr" as keyof GnomadData,
  },
  {
    code: "AMR",
    name: "AMR (Ad Mixed American)",
    g1000Field: "tg_amr" as keyof Variant,
    gnomad31Field: "af_amr" as keyof Variant,
    exomeField: "af_amr" as keyof GnomadData,
    genomeField: "af_amr" as keyof GnomadData,
  },
  {
    code: "EAS",
    name: "EAS (East Asian)",
    g1000Field: "tg_eas" as keyof Variant,
    gnomad31Field: "af_eas" as keyof Variant,
    exomeField: "af_eas" as keyof GnomadData,
    genomeField: "af_eas" as keyof GnomadData,
  },
  {
    code: "EUR",
    name: "EUR (European)",
    g1000Field: "tg_eur" as keyof Variant,
    gnomad31Field: null,
    exomeField: null,
    genomeField: null,
  },
  {
    code: "NFE",
    name: "NFE (Non-Finnish European)",
    g1000Field: null,
    gnomad31Field: "af_nfe" as keyof Variant,
    exomeField: "af_nfe" as keyof GnomadData,
    genomeField: "af_nfe" as keyof GnomadData,
  },
  {
    code: "FIN",
    name: "FIN (Finnish in Finland)",
    g1000Field: null,
    gnomad31Field: "af_fin" as keyof Variant,
    exomeField: "af_fin" as keyof GnomadData,
    genomeField: "af_fin" as keyof GnomadData,
  },
  {
    code: "SAS",
    name: "SAS (South Asian)",
    g1000Field: "tg_sas" as keyof Variant,
    gnomad31Field: "af_sas" as keyof Variant,
    exomeField: "af_sas" as keyof GnomadData,
    genomeField: "af_sas" as keyof GnomadData,
  },
  {
    code: "ASJ",
    name: "ASJ (Ashkenazi Jewish)",
    g1000Field: null,
    gnomad31Field: "af_asj" as keyof Variant,
    exomeField: "af_asj" as keyof GnomadData,
    genomeField: "af_asj" as keyof GnomadData,
  },
  {
    code: "AMI",
    name: "AMI (Amish)",
    g1000Field: null,
    gnomad31Field: "af_ami" as keyof Variant,
    exomeField: "af_ami" as keyof GnomadData,
    genomeField: "af_ami" as keyof GnomadData,
  },
  {
    code: "MID",
    name: "MID (Middle Eastern)",
    g1000Field: null,
    gnomad31Field: null,
    exomeField: "af_mid" as keyof GnomadData,
    genomeField: "af_mid" as keyof GnomadData,
  },
  {
    code: "REMAINING",
    name: "REMAINING (Other Populations)",
    g1000Field: null,
    gnomad31Field: "af_oth" as keyof Variant,
    exomeField: "af_remaining" as keyof GnomadData,
    genomeField: "af_remaining" as keyof GnomadData,
  },
];

export function buildAncestryFrequencies(
  variant: Variant,
  exome: GnomadData | null,
  genome: GnomadData | null,
): AncestryFrequency[] {
  return ANCESTRY_POPULATION_CONFIGS.map((config) => ({
    population_code: config.code,
    name: config.name,
    g1000: config.g1000Field
      ? (variant[config.g1000Field] as number | undefined)
      : undefined,
    gnomad31: config.gnomad31Field
      ? (variant[config.gnomad31Field] as number | undefined)
      : undefined,
    gnomad41_exome:
      config.exomeField && exome
        ? (exome[config.exomeField] as number | undefined)
        : undefined,
    gnomad41_genome:
      config.genomeField && genome
        ? (genome[config.genomeField] as number | undefined)
        : undefined,
  }));
}
