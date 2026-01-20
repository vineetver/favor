export type GnomadPopulation =
  | "afr"
  | "ami"
  | "amr"
  | "asj"
  | "eas"
  | "fin"
  | "mid"
  | "nfe"
  | "sas"
  | "remaining"
  | "";

export type GnomadSex = "xx" | "xy" | "";

export interface GnomadMetrics {
  af: number;
  ac: number | null;
  an: number | null;
  hom: number | null;
}

export interface GnomadPop {
  af?: number | null;
  af_xx?: number | null;
  af_xy?: number | null;
}

export interface GnomadPopulations {
  afr?: GnomadPop | null;
  ami?: GnomadPop | null;
  amr?: GnomadPop | null;
  asj?: GnomadPop | null;
  eas?: GnomadPop | null;
  fin?: GnomadPop | null;
  mid?: GnomadPop | null;
  nfe?: GnomadPop | null;
  sas?: GnomadPop | null;
  remaining?: GnomadPop | null;
  [key: string]: GnomadPop | null | undefined;
}

export interface GnomadFaf {
  faf95_max?: number | null;
  faf95_max_gen_anc?: string | null;
  faf99_max?: number | null;
  faf99_max_gen_anc?: string | null;
}

export interface GnomadFunctional {
  pangolin_largest_ds?: number | null;
  revel_max?: number | null;
  spliceai_ds_max?: number | null;
}

export interface GnomadQuality {
  fs?: number | null;
  inbreeding_coeff?: number | null;
  mq?: number | null;
  qd?: number | null;
  sor?: number | null;
}

export interface GnomadRegionFlags {
  lcr?: boolean | null;
  non_par?: boolean | null;
  segdup?: boolean | null;
}

export interface GnomadVariantInfo {
  allele_type?: string | null;
  n_alt_alleles?: number | null;
  variant_type?: string | null;
}

export interface GnomadData {
  ac?: number | null;
  ac_xx?: number | null;
  ac_xy?: number | null;
  af?: number | null;
  af_xx?: number | null;
  af_xy?: number | null;
  an?: number | null;
  an_xx?: number | null;
  an_xy?: number | null;
  nhomalt?: number | null;
  faf?: GnomadFaf | null;
  filter?: string | null;
  functional?: GnomadFunctional | null;
  grpmax?: string | null;
  populations?: GnomadPopulations | null;
  quality?: GnomadQuality | null;
  region_flags?: GnomadRegionFlags | null;
  variant_info?: GnomadVariantInfo | null;
}

export function getGnomadMetrics(
  data: GnomadData | null | undefined,
  prefix: GnomadPopulation,
  suffix: GnomadSex,
): GnomadMetrics | null {
  if (!data) return null;

  if (prefix) {
    const populations = data.populations as GnomadPopulations | null | undefined;
    const pop =
      populations?.[prefix] ??
      populations?.[prefix.toLowerCase()] ??
      populations?.[prefix.toUpperCase()];
    if (!pop) return null;
    const af =
      suffix === "xx"
        ? pop.af_xx
        : suffix === "xy"
          ? pop.af_xy
          : pop.af;
    if (af === null || af === undefined) return null;
    return { af, ac: null, an: null, hom: null };
  }

  const af =
    suffix === "xx" ? data.af_xx : suffix === "xy" ? data.af_xy : data.af;
  if (af === null || af === undefined) return null;

  const ac =
    suffix === "xx" ? data.ac_xx : suffix === "xy" ? data.ac_xy : data.ac;
  const an =
    suffix === "xx" ? data.an_xx : suffix === "xy" ? data.an_xy : data.an;

  return {
    af,
    ac: ac ?? null,
    an: an ?? null,
    hom: data.nhomalt ?? null,
  };
}
