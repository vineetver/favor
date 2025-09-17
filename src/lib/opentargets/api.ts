import { openTargetsClient } from "./client";
import {
  GET_TARGET_DISEASES,
  GET_TARGET_DRUGS,
  GET_TARGET_TRACTABILITY,
  GET_TARGET_SAFETY,
  GET_VARIANT_STUDIES,
  GET_VARIANT_CONSEQUENCES,
  GET_CREDIBLE_SET,
} from "./queries";
import type {
  Target,
  AssociatedDisease,
  AssociatedDrug,
  Variant,
  StudyLocus,
  CredibleSet,
} from "./types";

export async function getTargetDiseases(ensemblId: string): Promise<{
  target: Target & {
    associatedDiseases: { count: number; rows: AssociatedDisease[] };
  };
}> {
  return openTargetsClient.query(GET_TARGET_DISEASES, {
    ensemblId,
  });
}

export async function getTargetDrugs(ensemblId: string): Promise<{
  target: Target & { knownDrugs: { count: number; rows: AssociatedDrug[] } };
}> {
  return openTargetsClient.query(GET_TARGET_DRUGS, {
    ensemblId,
  });
}

export async function getTargetTractability(
  ensemblId: string,
): Promise<{ target: Target }> {
  return openTargetsClient.query(GET_TARGET_TRACTABILITY, {
    ensemblId,
  });
}

export async function getTargetSafety(
  ensemblId: string,
): Promise<{ target: Target & { safetyLiabilities: any[] } }> {
  return openTargetsClient.query(GET_TARGET_SAFETY, {
    ensemblId,
  });
}

export async function getVariantStudies(
  variantId: string,
  first: number = 20,
  after?: string,
): Promise<{
  variant: Variant & { studyLoci: { count: number; rows: StudyLocus[] } };
}> {
  return openTargetsClient.query(GET_VARIANT_STUDIES, {
    variantId,
    first,
    after,
  });
}

export async function getVariantConsequences(
  variantId: string,
): Promise<{ variant: Variant & { transcriptConsequences: any[] } }> {
  return openTargetsClient.query(GET_VARIANT_CONSEQUENCES, {
    variantId,
  });
}

export async function getCredibleSet(
  studyId: string,
  variantId: string,
): Promise<{ credibleSet: CredibleSet }> {
  return openTargetsClient.query(GET_CREDIBLE_SET, {
    studyId,
    variantId,
  });
}

export function formatEnsemblId(geneSymbol: string): string {
  return geneSymbol.startsWith("ENSG") ? geneSymbol : `ENSG${geneSymbol}`;
}

export function formatVariantId(
  chromosome: string,
  position: number,
  ref: string,
  alt: string,
): string {
  return `${chromosome}_${position}_${ref}_${alt}`;
}
