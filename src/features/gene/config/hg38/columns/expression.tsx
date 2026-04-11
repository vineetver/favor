import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneExpressionColumns = [
  col.accessor("adipose_subcutaneous", {
    accessor: (row) => row.gtex?.adipose_subcutaneous,
    header: "Adipose Subcutaneous",
    description: tooltip({
      title: "Adipose Subcutaneous",
      description: "Adipose Subcutaneous",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("adipose_visceral_omentum", {
    accessor: (row) => row.gtex?.adipose_visceral_omentum,
    header: "Adipose Visceral Omentum",
    description: tooltip({
      title: "Adipose Visceral Omentum",
      description: "Adipose Visceral Omentum",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("adrenal_gland", {
    accessor: (row) => row.gtex?.adrenal_gland,
    header: "Adrenal Gland",
    description: tooltip({
      title: "Adrenal Gland",
      description: "Adrenal Gland",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("artery_aorta", {
    accessor: (row) => row.gtex?.artery_aorta,
    header: "Artery Aorta",
    description: tooltip({
      title: "Artery Aorta",
      description: "Artery Aorta",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("artery_coronary", {
    accessor: (row) => row.gtex?.artery_coronary,
    header: "Artery Coronary",
    description: tooltip({
      title: "Artery Coronary",
      description: "Artery Coronary",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("artery_tibial", {
    accessor: (row) => row.gtex?.artery_tibial,
    header: "Artery Tibial",
    description: tooltip({
      title: "Artery Tibial",
      description: "Artery Tibial",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("bladder", {
    accessor: (row) => row.gtex?.bladder,
    header: "Bladder",
    description: tooltip({
      title: "Bladder",
      description: "Bladder",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_amygdala", {
    accessor: (row) => row.gtex?.brain_amygdala,
    header: "Brain Amygdala",
    description: tooltip({
      title: "Brain Amygdala",
      description: "Brain Amygdala",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_anterior_cingulate_cortex_ba24", {
    accessor: (row) => row.gtex?.brain_anterior_cingulate_cortex_ba24,
    header: "Brain Anterior Cingulate Cortex BA24",
    description: tooltip({
      title: "Brain Anterior Cingulate Cortex BA24",
      description: "Brain Anterior Cingulate Cortex BA24",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_caudate_basal_ganglia", {
    accessor: (row) => row.gtex?.brain_caudate_basal_ganglia,
    header: "Brain Caudate Basal Ganglia",
    description: tooltip({
      title: "Brain Caudate Basal Ganglia",
      description: "Brain Caudate Basal Ganglia",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_cerebellar_hemisphere", {
    accessor: (row) => row.gtex?.brain_cerebellar_hemisphere,
    header: "Brain Cerebellar Hemisphere",
    description: tooltip({
      title: "Brain Cerebellar Hemisphere",
      description: "Brain Cerebellar Hemisphere",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_cerebellum", {
    accessor: (row) => row.gtex?.brain_cerebellum,
    header: "Brain Cerebellum",
    description: tooltip({
      title: "Brain Cerebellum",
      description: "Brain Cerebellum",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_cortex", {
    accessor: (row) => row.gtex?.brain_cortex,
    header: "Brain Cortex",
    description: tooltip({
      title: "Brain Cortex",
      description: "Brain Cortex",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_frontal_cortex_ba9", {
    accessor: (row) => row.gtex?.brain_frontal_cortex_ba9,
    header: "Brain Frontal Cortex BA9",
    description: tooltip({
      title: "Brain Frontal Cortex BA9",
      description: "Brain Frontal Cortex BA9",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_hippocampus", {
    accessor: (row) => row.gtex?.brain_hippocampus,
    header: "Brain Hippocampus",
    description: tooltip({
      title: "Brain Hippocampus",
      description: "Brain Hippocampus",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_hypothalamus", {
    accessor: (row) => row.gtex?.brain_hypothalamus,
    header: "Brain Hypothalamus",
    description: tooltip({
      title: "Brain Hypothalamus",
      description: "Brain Hypothalamus",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_nucleus_accumbens_basal_ganglia", {
    accessor: (row) => row.gtex?.brain_nucleus_accumbens_basal_ganglia,
    header: "Brain Nucleus Accumbens Basal Ganglia",
    description: tooltip({
      title: "Brain Nucleus Accumbens Basal Ganglia",
      description: "Brain Nucleus Accumbens Basal Ganglia",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_putamen_basal_ganglia", {
    accessor: (row) => row.gtex?.brain_putamen_basal_ganglia,
    header: "Brain Putamen Basal Ganglia",
    description: tooltip({
      title: "Brain Putamen Basal Ganglia",
      description: "Brain Putamen Basal Ganglia",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_spinal_cord_cervical_c_1", {
    accessor: (row) => row.gtex?.brain_spinal_cord_cervical_c_1,
    header: "Brain Spinal Cord Cervical C-1",
    description: tooltip({
      title: "Brain Spinal Cord Cervical C-1",
      description: "Brain Spinal Cord Cervical C-1",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("brain_substantia_nigra", {
    accessor: (row) => row.gtex?.brain_substantia_nigra,
    header: "Brain Substantia Nigra",
    description: tooltip({
      title: "brain_substantia_nigra",
      description: "brain_substantia_nigra",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("breast_mammary_tissue", {
    accessor: (row) => row.gtex?.breast_mammary_tissue,
    header: "Breast Mammary Tissue",
    description: tooltip({
      title: "Breast Mammary Tissue",
      description: "Breast Mammary Tissue",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("cells_cultured_fibroblasts", {
    accessor: (row) => row.gtex?.cells_cultured_fibroblasts,
    header: "Cells Cultured Fibroblasts",
    description: tooltip({
      title: "Cells Cultured Fibroblasts",
      description: "Cells Cultured Fibroblasts",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("cells_ebv_transformed_lymphocytes", {
    accessor: (row) => row.gtex?.cells_ebv_transformed_lymphocytes,
    header: "Cells EBV Transformed Lymphocytes",
    description: tooltip({
      title: "Cells EBV Transformed Lymphocytes",
      description: "Cells EBV Transformed Lymphocytes",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("cervix_ectocervix", {
    accessor: (row) => row.gtex?.cervix_ectocervix,
    header: "Cervix Ectocervix",
    description: tooltip({
      title: "Cervix Ectocervix",
      description: "Cervix Ectocervix",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("cervix_endocervix", {
    accessor: (row) => row.gtex?.cervix_endocervix,
    header: "Cervix Endocervix",
    description: tooltip({
      title: "Cervix Endocervix",
      description: "Cervix Endocervix",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("colon_sigmoid", {
    accessor: (row) => row.gtex?.colon_sigmoid,
    header: "Colon Sigmoid",
    description: tooltip({
      title: "Colon Sigmoid",
      description: "Colon Sigmoid",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("colon_transverse", {
    accessor: (row) => row.gtex?.colon_transverse,
    header: "Colon Transverse",
    description: tooltip({
      title: "Colon Transverse",
      description: "Colon Transverse",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("esophagus_gastroesophageal_junction", {
    accessor: (row) => row.gtex?.esophagus_gastroesophageal_junction,
    header: "Esophagus Gastroesophageal Junction",
    description: tooltip({
      title: "Esophagus Gastroesophageal Junction",
      description: "Esophagus Gastroesophageal Junction",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("esophagus_mucosa", {
    accessor: (row) => row.gtex?.esophagus_mucosa,
    header: "Esophagus Mucosa",
    description: tooltip({
      title: "Esophagus Mucosa",
      description: "Esophagus Mucosa",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("esophagus_muscularis", {
    accessor: (row) => row.gtex?.esophagus_muscularis,
    header: "Esophagus Muscularis",
    description: tooltip({
      title: "Esophagus Muscularis",
      description: "Esophagus Muscularis",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("fallopian_tube", {
    accessor: (row) => row.gtex?.fallopian_tube,
    header: "Fallopian Tube",
    description: tooltip({
      title: "Fallopian Tube",
      description: "Fallopian Tube",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("heart_atrial_appendage", {
    accessor: (row) => row.gtex?.heart_atrial_appendage,
    header: "Heart Atrial Appendage",
    description: tooltip({
      title: "Heart Atrial Appendage",
      description: "Heart Atrial Appendage",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("heart_left_ventricle", {
    accessor: (row) => row.gtex?.heart_left_ventricle,
    header: "Heart Left Ventricle",
    description: tooltip({
      title: "Heart Left Ventricle",
      description: "Heart Left Ventricle",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("kidney_cortex", {
    accessor: (row) => row.gtex?.kidney_cortex,
    header: "Kidney Cortex",
    description: tooltip({
      title: "Kidney Cortex",
      description: "Kidney Cortex",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("lung", {
    accessor: (row) => row.gtex?.lung,
    header: "Lung",
    description: tooltip({
      title: "Lung",
      description: "Lung",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("minor_salivary_gland", {
    accessor: (row) => row.gtex?.minor_salivary_gland,
    header: "Minor Salivary Gland",
    description: tooltip({
      title: "Minor Salivary Gland",
      description: "Minor Salivary Gland",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("muscle_skeletal", {
    accessor: (row) => row.gtex?.muscle_skeletal,
    header: "Skeletal Muscle",
    description: tooltip({
      title: "Skeletal Muscle",
      description: "Skeletal Muscle",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("nerve_tibial", {
    accessor: (row) => row.gtex?.nerve_tibial,
    header: "Tibial Nerve",
    description: tooltip({
      title: "Tibial Nerve",
      description: "Tibial Nerve",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("ovary", {
    accessor: (row) => row.gtex?.ovary,
    header: "Ovary",
    description: tooltip({
      title: "Ovary",
      description: "Ovary",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("pancreas", {
    accessor: (row) => row.gtex?.pancreas,
    header: "Pancreas",
    description: tooltip({
      title: "Pancreas",
      description: "Pancreas",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("pituitary", {
    accessor: (row) => row.gtex?.pituitary,
    header: "Pituitary",
    description: tooltip({
      title: "Pituitary",
      description: "Pituitary",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("prostate", {
    accessor: (row) => row.gtex?.prostate,
    header: "Prostate",
    description: tooltip({
      title: "Prostate",
      description: "Prostate",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("skin_not_sun_exposed_suprapubic", {
    accessor: (row) => row.gtex?.skin_not_sun_exposed_suprapubic,
    header: "Suprapubic Skin (Not Sun Exposed)",
    description: tooltip({
      title: "Suprapubic Skin (Not Sun Exposed)",
      description: "Suprapubic Skin (Not Sun Exposed)",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("skin_sun_exposed_lower_leg", {
    accessor: (row) => row.gtex?.skin_sun_exposed_lower_leg,
    header: "Lower Leg Skin (Sun Exposed)",
    description: tooltip({
      title: "Lower Leg Skin (Sun Exposed)",
      description: "Lower Leg Skin (Sun Exposed)",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("small_intestine_terminal_ileum", {
    accessor: (row) => row.gtex?.small_intestine_terminal_ileum,
    header: "Terminal Ileum (Small Intestine)",
    description: tooltip({
      title: "Terminal Ileum (Small Intestine)",
      description: "Terminal Ileum (Small Intestine)",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("spleen", {
    accessor: (row) => row.gtex?.spleen,
    header: "Spleen",
    description: tooltip({
      title: "Spleen",
      description: "Spleen",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("stomach", {
    accessor: (row) => row.gtex?.stomach,
    header: "Stomach",
    description: tooltip({
      title: "Stomach",
      description: "Stomach",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("testis", {
    accessor: (row) => row.gtex?.testis,
    header: "Testis",
    description: tooltip({
      title: "Testis",
      description: "Testis",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("thyroid", {
    accessor: (row) => row.gtex?.thyroid,
    header: "Thyroid",
    description: tooltip({
      title: "Thyroid",
      description: "Thyroid",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("uterus", {
    accessor: (row) => row.gtex?.uterus,
    header: "Uterus",
    description: tooltip({
      title: "Uterus",
      description: "Uterus",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("vagina", {
    accessor: (row) => row.gtex?.vagina,
    header: "Vagina",
    description: tooltip({
      title: "Vagina",
      description: "Vagina",
    }),
    cell: cell.decimal(2),
  }),

  col.accessor("whole_blood", {
    accessor: (row) => row.gtex?.whole_blood,
    header: "Whole Blood",
    description: tooltip({
      title: "Whole Blood",
      description: "Whole Blood",
    }),
    cell: cell.decimal(2),
  }),
];

export const geneExpressionGroup = col.group(
  "expression",
  "Expression",
  geneExpressionColumns,
);
