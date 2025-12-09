// =============================================================================
// Open Targets GraphQL Queries - v4 API Schema
// =============================================================================

/**
 * Get variant basic info with transcript consequences.
 * Field names match the v4 API schema exactly.
 */
export const GET_VARIANT_CONSEQUENCES = `
  query VariantConsequences($variantId: String!) {
    variant(variantId: $variantId) {
      id
      chromosome
      position
      referenceAllele
      alternateAllele
      rsIds
      variantDescription
      mostSevereConsequence {
        id
        label
      }
      transcriptConsequences {
        transcriptId
        transcriptIndex
        isEnsemblCanonical
        impact
        consequenceScore
        distanceFromTss
        distanceFromFootprint
        aminoAcidChange
        codons
        uniprotAccessions
        lofteePrediction
        siftPrediction
        polyphenPrediction
        target {
          id
          approvedSymbol
        }
        variantConsequences {
          id
          label
        }
      }
    }
  }
`;

/**
 * Get credible sets for a variant with L2G predictions.
 * L2G scores are accessed via credibleSet.l2GPredictions.
 */
export const GET_VARIANT_CREDIBLE_SETS = `
  query VariantCredibleSets($variantId: String!, $pageIndex: Int!, $pageSize: Int!) {
    variant(variantId: $variantId) {
      id
      credibleSets(page: { index: $pageIndex, size: $pageSize }) {
        count
        rows {
          studyLocusId
          credibleSetIndex
          chromosome
          position
          beta
          standardError
          zScore
          pValueMantissa
          pValueExponent
          finemappingMethod
          confidence
          studyId
          studyType
          region
          sampleSize
          study {
            id
            traitFromSource
            publicationFirstAuthor
            publicationDate
            pubmedId
          }
          l2GPredictions(page: { index: 0, size: 50 }) {
            count
            rows {
              score
              target {
                id
                approvedSymbol
              }
            }
          }
          locus(page: { index: 0, size: 100 }) {
            count
            rows {
              posteriorProbability
              pValueMantissa
              pValueExponent
              beta
              standardError
              is95CredibleSet
              is99CredibleSet
              variant {
                id
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Get pharmacogenomics data for a variant.
 */
export const GET_VARIANT_PHARMACOGENOMICS = `
  query VariantPharmacogenomics($variantId: String!, $pageIndex: Int!, $pageSize: Int!) {
    variant(variantId: $variantId) {
      id
      pharmacogenomics(page: { index: $pageIndex, size: $pageSize }) {
        genotypeId
        isDirectTarget
        pgxCategory
        evidenceLevel
        phenotypeText
        genotypeAnnotationText
        studyId
        literature
        variantFunctionalConsequence {
          id
          label
        }
        target {
          id
          approvedSymbol
        }
        drugs {
          drugId
          drugFromSource
          drug {
            id
            name
            drugType
          }
        }
      }
    }
  }
`;

/**
 * Get variant effects (pathogenicity predictions).
 * Multiple methods like CADD, AlphaMissense, SIFT, etc.
 */
export const GET_VARIANT_EFFECTS = `
  query VariantEffects($variantId: String!) {
    variant(variantId: $variantId) {
      id
      variantEffect {
        method
        score
        normalisedScore
        assessment
        assessmentFlag
        target {
          id
          approvedSymbol
        }
      }
    }
  }
`;

/**
 * Get protein coding coordinates for a variant.
 * Shows protein-level impact with linked diseases and therapeutic areas.
 */
export const GET_VARIANT_PROTEIN_CODING = `
  query VariantProteinCoding($variantId: String!, $pageIndex: Int!, $pageSize: Int!) {
    variant(variantId: $variantId) {
      id
      proteinCodingCoordinates(page: { index: $pageIndex, size: $pageSize }) {
        count
        rows {
          aminoAcidPosition
          referenceAminoAcid
          alternateAminoAcid
          variantEffect
          therapeuticAreas
          uniprotAccessions
          target {
            id
            approvedSymbol
          }
          diseases {
            id
            name
          }
          variantConsequences {
            id
            label
          }
        }
      }
    }
  }
`;

/**
 * Get disease/target evidence for a variant.
 * Links variants directly to diseases and targets through various evidence sources.
 */
export const GET_VARIANT_EVIDENCES = `
  query VariantEvidences($variantId: String!, $size: Int!, $cursor: String) {
    variant(variantId: $variantId) {
      id
      evidences(size: $size, cursor: $cursor) {
        count
        cursor
        rows {
          id
          score
          datasourceId
          datatypeId
          variantRsId
          variantEffect
          variantAminoacidDescriptions
          studySampleSize
          target {
            id
            approvedSymbol
          }
          disease {
            id
            name
            therapeuticAreas {
              id
              name
            }
          }
          variantFunctionalConsequence {
            id
            label
          }
        }
      }
    }
  }
`;

// Legacy queries for target-level data (kept for compatibility)
export const GET_TARGET_DISEASES = `
  query TargetDiseases($ensemblId: String!) {
    target(ensemblId: $ensemblId) {
      id
      approvedSymbol
      associatedDiseases {
        count
        rows {
          disease {
            id
            name
            description
            therapeuticAreas {
              id
              name
            }
          }
          score
          datasourceScores {
            id
            score
          }
        }
      }
    }
  }
`;

export const GET_TARGET_DRUGS = `
  query TargetDrugs($ensemblId: String!) {
    target(ensemblId: $ensemblId) {
      id
      approvedSymbol
      knownDrugs {
        count
        rows {
          drug {
            id
            name
            drugType
            maximumClinicalTrialPhase
            hasBeenWithdrawn
            blackBoxWarning
          }
          mechanismOfAction
          phase
        }
      }
    }
  }
`;
