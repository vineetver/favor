const GWAS_URL = "https://api.genohub.org/v1/gwascatalog";

export interface EfoNode {
  curie: string;
  label: string;
  children: EfoNode[];
  definition?: string;
  directParent?: string[];
}

export interface GWAS {
  variant_vcf: string;
  rsid: string;
  gwas_strongest_snp_risk_allele: string;
  gwas_p_value: string;
  gwas_p_value_annotation: string | null;
  gwas_p_value_mlog: string;
  gwas_risk_allele_frequency: string;
  gwas_or_or_beta: string | null;
  gwas_95_ci_text: string | null;
  gwas_mapped_gene: string;
  gwas_disease_trait: string;
  gwas_initial_sample_size: string;
  gwas_study: string;
  gwas_pubmedid: string;
  gwas_first_author: string;
  gwas_clipped_p_value: string;
  efo_hierarchy: EfoNode[];
}

export async function fetchGWAS(vcf: string): Promise<GWAS[] | null> {
  try {
    const response = await fetch(`${GWAS_URL}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch GWAS data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching GWAS data:", error);
    return null;
  }
}
