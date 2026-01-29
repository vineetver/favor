import type { Gene } from "@features/gene/types";

export type GtexKey = keyof Gene["gtex"];

export interface TissueMetadata {
  label: string;
  group: string;
}

export const TISSUE_GROUPS = [
  "Nervous System",
  "Cardiovascular",
  "Digestive",
  "Endocrine",
  "Immune/Hematologic",
  "Respiratory",
  "Reproductive",
  "Urinary",
  "Integumentary",
  "Musculoskeletal",
  "Adipose",
  "Cell Lines",
] as const;

export const TISSUE_METADATA: Record<GtexKey, TissueMetadata> = {
  adipose_subcutaneous: {
    label: "Adipose — Subcutaneous",
    group: "Adipose",
  },
  adipose_visceral_omentum: {
    label: "Adipose — Visceral (Omentum)",
    group: "Adipose",
  },
  adrenal_gland: {
    label: "Adrenal Gland",
    group: "Endocrine",
  },
  artery_aorta: {
    label: "Artery — Aorta",
    group: "Cardiovascular",
  },
  artery_coronary: {
    label: "Artery — Coronary",
    group: "Cardiovascular",
  },
  artery_tibial: {
    label: "Artery — Tibial",
    group: "Cardiovascular",
  },
  bladder: {
    label: "Bladder",
    group: "Urinary",
  },
  brain_amygdala: {
    label: "Brain — Amygdala",
    group: "Nervous System",
  },
  brain_anterior_cingulate_cortex_ba24: {
    label: "Brain — Anterior Cingulate Cortex (BA24)",
    group: "Nervous System",
  },
  brain_caudate_basal_ganglia: {
    label: "Brain — Caudate (Basal Ganglia)",
    group: "Nervous System",
  },
  brain_cerebellar_hemisphere: {
    label: "Brain — Cerebellar Hemisphere",
    group: "Nervous System",
  },
  brain_cerebellum: {
    label: "Brain — Cerebellum",
    group: "Nervous System",
  },
  brain_cortex: {
    label: "Brain — Cortex",
    group: "Nervous System",
  },
  brain_frontal_cortex_ba9: {
    label: "Brain — Frontal Cortex (BA9)",
    group: "Nervous System",
  },
  brain_hippocampus: {
    label: "Brain — Hippocampus",
    group: "Nervous System",
  },
  brain_hypothalamus: {
    label: "Brain — Hypothalamus",
    group: "Nervous System",
  },
  brain_nucleus_accumbens_basal_ganglia: {
    label: "Brain — Nucleus Accumbens (Basal Ganglia)",
    group: "Nervous System",
  },
  brain_putamen_basal_ganglia: {
    label: "Brain — Putamen (Basal Ganglia)",
    group: "Nervous System",
  },
  brain_spinal_cord_cervical_c_1: {
    label: "Brain — Spinal Cord (Cervical C-1)",
    group: "Nervous System",
  },
  brain_substantia_nigra: {
    label: "Brain — Substantia Nigra",
    group: "Nervous System",
  },
  breast_mammary_tissue: {
    label: "Breast — Mammary Tissue",
    group: "Reproductive",
  },
  cells_cultured_fibroblasts: {
    label: "Cells — Cultured Fibroblasts",
    group: "Cell Lines",
  },
  cells_ebv_transformed_lymphocytes: {
    label: "Cells — EBV-Transformed Lymphocytes",
    group: "Cell Lines",
  },
  cervix_ectocervix: {
    label: "Cervix — Ectocervix",
    group: "Reproductive",
  },
  cervix_endocervix: {
    label: "Cervix — Endocervix",
    group: "Reproductive",
  },
  colon_sigmoid: {
    label: "Colon — Sigmoid",
    group: "Digestive",
  },
  colon_transverse: {
    label: "Colon — Transverse",
    group: "Digestive",
  },
  esophagus_gastroesophageal_junction: {
    label: "Esophagus — Gastroesophageal Junction",
    group: "Digestive",
  },
  esophagus_mucosa: {
    label: "Esophagus — Mucosa",
    group: "Digestive",
  },
  esophagus_muscularis: {
    label: "Esophagus — Muscularis",
    group: "Digestive",
  },
  fallopian_tube: {
    label: "Fallopian Tube",
    group: "Reproductive",
  },
  heart_atrial_appendage: {
    label: "Heart — Atrial Appendage",
    group: "Cardiovascular",
  },
  heart_left_ventricle: {
    label: "Heart — Left Ventricle",
    group: "Cardiovascular",
  },
  kidney_cortex: {
    label: "Kidney — Cortex",
    group: "Urinary",
  },
  kidney_medulla: {
    label: "Kidney — Medulla",
    group: "Urinary",
  },
  liver: {
    label: "Liver",
    group: "Digestive",
  },
  lung: {
    label: "Lung",
    group: "Respiratory",
  },
  minor_salivary_gland: {
    label: "Salivary Gland — Minor",
    group: "Digestive",
  },
  muscle_skeletal: {
    label: "Muscle — Skeletal",
    group: "Musculoskeletal",
  },
  nerve_tibial: {
    label: "Nerve — Tibial",
    group: "Nervous System",
  },
  ovary: {
    label: "Ovary",
    group: "Reproductive",
  },
  pancreas: {
    label: "Pancreas",
    group: "Digestive",
  },
  pituitary: {
    label: "Pituitary",
    group: "Endocrine",
  },
  prostate: {
    label: "Prostate",
    group: "Reproductive",
  },
  skin_not_sun_exposed_suprapubic: {
    label: "Skin — Suprapubic (Not Sun Exposed)",
    group: "Integumentary",
  },
  skin_sun_exposed_lower_leg: {
    label: "Skin — Lower Leg (Sun Exposed)",
    group: "Integumentary",
  },
  small_intestine_terminal_ileum: {
    label: "Small Intestine — Terminal Ileum",
    group: "Digestive",
  },
  spleen: {
    label: "Spleen",
    group: "Immune/Hematologic",
  },
  stomach: {
    label: "Stomach",
    group: "Digestive",
  },
  testis: {
    label: "Testis",
    group: "Reproductive",
  },
  thyroid: {
    label: "Thyroid",
    group: "Endocrine",
  },
  uterus: {
    label: "Uterus",
    group: "Reproductive",
  },
  vagina: {
    label: "Vagina",
    group: "Reproductive",
  },
  whole_blood: {
    label: "Whole Blood",
    group: "Immune/Hematologic",
  },
};

export interface TissueExpressionDatum {
  tissue: GtexKey;
  label: string;
  group: string;
  value: number | null;
}

export function adaptGtexToTissueArray(
  gtex?: Gene["gtex"] | null,
): TissueExpressionDatum[] {
  if (!gtex) return [];

  return (Object.keys(TISSUE_METADATA) as GtexKey[]).map((key) => {
    const meta = TISSUE_METADATA[key];
    const rawValue = gtex[key];

    return {
      tissue: key,
      label: meta.label,
      group: meta.group,
      value: typeof rawValue === "number" ? rawValue : null,
    };
  });
}
