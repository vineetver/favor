import { openTargetsClient } from "./client";
import {
  GET_VARIANT_CONSEQUENCES,
  GET_VARIANT_CREDIBLE_SETS,
  GET_VARIANT_PHARMACOGENOMICS,
  GET_VARIANT_EFFECTS,
  GET_VARIANT_PROTEIN_CODING,
  GET_VARIANT_EVIDENCES,
} from "./queries";
import type {
  VariantConsequencesResponse,
  CredibleSetsResponse,
  PharmacogenomicsResponse,
  VariantEffectsResponse,
  ProteinCodingResponse,
  EvidencesResponse,
} from "./types";

export async function getVariantConsequences(variantId: string) {
  return openTargetsClient.query<VariantConsequencesResponse>(
    GET_VARIANT_CONSEQUENCES,
    { variantId }
  );
}

export async function getVariantCredibleSets(
  variantId: string,
  pageIndex = 0,
  pageSize = 20
) {
  return openTargetsClient.query<CredibleSetsResponse>(
    GET_VARIANT_CREDIBLE_SETS,
    { variantId, pageIndex, pageSize }
  );
}

export async function getVariantPharmacogenomics(
  variantId: string,
  pageIndex = 0,
  pageSize = 50
) {
  return openTargetsClient.query<PharmacogenomicsResponse>(
    GET_VARIANT_PHARMACOGENOMICS,
    { variantId, pageIndex, pageSize }
  );
}

export async function getVariantEffects(variantId: string) {
  return openTargetsClient.query<VariantEffectsResponse>(
    GET_VARIANT_EFFECTS,
    { variantId }
  );
}

export async function getVariantProteinCoding(
  variantId: string,
  pageIndex = 0,
  pageSize = 50
) {
  return openTargetsClient.query<ProteinCodingResponse>(
    GET_VARIANT_PROTEIN_CODING,
    { variantId, pageIndex, pageSize }
  );
}

export async function getVariantEvidences(
  variantId: string,
  size = 50,
  cursor?: string
) {
  return openTargetsClient.query<EvidencesResponse>(
    GET_VARIANT_EVIDENCES,
    { variantId, size, cursor }
  );
}

export function formatVariantId(
  chromosome: string,
  position: number,
  ref: string,
  alt: string
): string {
  const cleanChr = chromosome.replace(/^chr/i, "");
  return `${cleanChr}_${position}_${ref}_${alt}`;
}
