const GNOMAD_EXOME_URL = "https://api.genohub.org/v1/ancestry/gnomad/exome";
const GNOMAD_GENOME_URL = "https://api.genohub.org/v1/ancestry/gnomad/genome";

async function fetchGnomadData(
  vcf: string,
  type: "exome" | "genome",
): Promise<GnomadData | null> {
  const url = type === "exome" ? GNOMAD_EXOME_URL : GNOMAD_GENOME_URL;

  try {
    const response = await fetch(`${url}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch ${type} gnomAD data: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${type} gnomAD data:`, error);
    return null;
  }
}

export async function fetchGnomadExome(
  vcf: string,
): Promise<GnomadData | null> {
  return fetchGnomadData(vcf, "exome");
}

export async function fetchGnomadGenome(
  vcf: string,
): Promise<GnomadData | null> {
  return fetchGnomadData(vcf, "genome");
}

export type GnomadData = {
  variant_vcf: string;
  chromosome: string;
  position: number;
  filter: string;
  ac: number;
  an: number;
  af: number;
  grpmax: string;
  fafmax_faf95_max: number;
  fafmax_faf95_max_gen_anc: string;
  ac_xx: number;
  af_xx: number;
  an_xx: number;
  nhomalt_xx: number;
  ac_xy: number;
  af_xy: number;
  an_xy: number;
  nhomalt_xy: number;
  nhomalt: number;
  ac_afr_xx: number;
  af_afr_xx: number;
  an_afr_xx: number;
  nhomalt_afr_xx: number;
  ac_afr_xy: number;
  af_afr_xy: number;
  an_afr_xy: number;
  nhomalt_afr_xy: number;
  ac_afr: number;
  af_afr: number;
  an_afr: number;
  nhomalt_afr: number;
  ac_ami_xx: number;
  af_ami_xx: number;
  an_ami_xx: number;
  nhomalt_ami_xx: number;
  ac_ami_xy: number;
  af_ami_xy: number;
  an_ami_xy: number;
  nhomalt_ami_xy: number;
  ac_ami: number;
  af_ami: number;
  an_ami: number;
  nhomalt_ami: number;
  ac_amr_xx: number;
  af_amr_xx: number;
  an_amr_xx: number;
  nhomalt_amr_xx: number;
  ac_amr_xy: number;
  af_amr_xy: number;
  an_amr_xy: number;
  nhomalt_amr_xy: number;
  ac_amr: number;
  af_amr: number;
  an_amr: number;
  nhomalt_amr: number;
  ac_asj_xx: number;
  af_asj_xx: number;
  an_asj_xx: number;
  nhomalt_asj_xx: number;
  ac_asj_xy: number;
  af_asj_xy: number;
  an_asj_xy: number;
  nhomalt_asj_xy: number;
  ac_asj: number;
  af_asj: number;
  an_asj: number;
  nhomalt_asj: number;
  ac_eas_xx: number;
  af_eas_xx: number;
  an_eas_xx: number;
  nhomalt_eas_xx: number;
  ac_eas_xy: number;
  af_eas_xy: number;
  an_eas_xy: number;
  nhomalt_eas_xy: number;
  ac_eas: number;
  af_eas: number;
  an_eas: number;
  nhomalt_eas: number;
  ac_fin_xx: number;
  af_fin_xx: number;
  an_fin_xx: number;
  nhomalt_fin_xx: number;
  ac_fin_xy: number;
  af_fin_xy: number;
  an_fin_xy: number;
  nhomalt_fin_xy: number;
  ac_fin: number;
  af_fin: number;
  an_fin: number;
  nhomalt_fin: number;
  ac_mid_xx: number;
  af_mid_xx: number;
  an_mid_xx: number;
  nhomalt_mid_xx: number;
  ac_mid_xy: number;
  af_mid_xy: number;
  an_mid_xy: number;
  nhomalt_mid_xy: number;
  ac_mid: number;
  af_mid: number;
  an_mid: number;
  nhomalt_mid: number;
  ac_nfe_xx: number;
  af_nfe_xx: number;
  an_nfe_xx: number;
  nhomalt_nfe_xx: number;
  ac_nfe_xy: number;
  af_nfe_xy: number;
  an_nfe_xy: number;
  nhomalt_nfe_xy: number;
  ac_nfe: number;
  af_nfe: number;
  an_nfe: number;
  nhomalt_nfe: number;
  ac_raw: number;
  af_raw: number;
  an_raw: number;
  nhomalt_raw: number;
  ac_remaining_xx: number;
  af_remaining_xx: number;
  an_remaining_xx: number;
  nhomalt_remaining_xx: number;
  ac_remaining_xy: number;
  af_remaining_xy: number;
  an_remaining_xy: number;
  nhomalt_remaining_xy: number;
  ac_remaining: number;
  af_remaining: number;
  an_remaining: number;
  nhomalt_remaining: number;
  ac_sas_xx: number;
  af_sas_xx: number;
  an_sas_xx: number;
  nhomalt_sas_xx: number;
  ac_sas_xy: number;
  af_sas_xy: number;
  an_sas_xy: number;
  nhomalt_sas_xy: number;
  ac_sas: number;
  af_sas: number;
  an_sas: number;
  nhomalt_sas: number;
  ac_grpmax: number;
  af_grpmax: number;
  an_grpmax: number;
  nhomalt_grpmax: number;
  faf95_xx: number;
  faf95_xy: number;
  faf95: number;
  faf95_afr_xx: number;
  faf95_afr_xy: number;
  faf95_afr: number;
  faf95_amr_xx: number;
  faf95_amr_xy: number;
  faf95_amr: number;
  faf95_eas_xx: number;
  faf95_eas_xy: number;
  faf95_eas: number;
  faf95_nfe_xx: number;
  faf95_nfe_xy: number;
  faf95_nfe: number;
  faf95_sas_xx: number;
  faf95_sas_xy: number;
  faf95_sas: number;
  faf99_xx: number;
  faf99_xy: number;
  faf99: number;
  faf99_afr_xx: number;
  faf99_afr_xy: number;
  faf99_afr: number;
  faf99_amr_xx: number;
  faf99_amr_xy: number;
  faf99_amr: number;
  faf99_eas_xx: number;
  faf99_eas_xy: number;
  faf99_eas: number;
  faf99_nfe_xx: number;
  faf99_nfe_xy: number;
  faf99_nfe: number;
  faf99_sas_xx: number;
  faf99_sas_xy: number;
  faf99_sas: number;
  fafmax_faf99_max: number;
  fafmax_faf99_max_gen_anc: string;
  age_hist_het_bin_freq: string;
  age_hist_het_n_smaller: number;
  age_hist_het_n_larger: number;
  age_hist_hom_bin_freq: string;
  age_hist_hom_n_smaller: number;
  age_hist_hom_n_larger: number;
  fs: number;
  mq: number;
  mqranksum: number;
  qualapprox: number;
  qd: number;
  readposranksum: number;
  sor: number;
  vardp: number;
  monoallelic: boolean;
  only_het: boolean;
  transmitted_singleton: boolean;
  as_fs: number;
  as_mq: number;
  as_mqranksum: number;
  as_pab_max: number;
  as_qualapprox: number;
  as_qd: number;
  as_readposranksum: number;
  as_sb_table: string;
  as_sor: number;
  as_vardp: number;
  inbreeding_coeff: number;
  as_culprit: string;
  as_vqslod: number;
  negative_train_site: boolean;
  positive_train_site: boolean;
  allele_type: string;
  n_alt_alleles: number;
  variant_type: string;
  was_mixed: boolean;
  lcr: boolean;
  non_par: boolean;
  segdup: boolean;
  gq_hist_alt_bin_freq: string;
  gq_hist_all_bin_freq: string;
  dp_hist_alt_bin_freq: string;
  dp_hist_alt_n_larger: number;
  dp_hist_all_bin_freq: string;
  dp_hist_all_n_larger: number;
  ab_hist_alt_bin_freq: string;
  cadd_raw_score: number;
  cadd_phred: number;
  revel_max: number;
  spliceai_ds_max: number;
  pangolin_largest_ds: number;
  phylop: number;
  sift_max: number;
  polyphen_max: number;
  vrs_allele_ids: string;
  vrs_starts: string;
  vrs_ends: string;
  vrs_states: string;
  vep: string;
};

// Legacy exports for backward compatibility with ancestry
export const fetchAncestryExome = fetchGnomadExome;
export const fetchAncestryGenome = fetchGnomadGenome;
export type Ancestry = GnomadData;
