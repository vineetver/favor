export const GET_TARGET_DISEASES = `
  query targetDiseases($ensemblId: String!) {
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
  query targetDrugs($ensemblId: String!) {
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

export const GET_TARGET_TRACTABILITY = `
  query targetTractability($ensemblId: String!) {
    target(ensemblId: $ensemblId) {
      id
      approvedSymbol
      tractability {
        label
        modality
        value
      }
      geneticConstraint {
        constraintType
        exp
        obs
        score
        oe
        oeLower
        oeUpper
      }
    }
  }
`;

export const GET_TARGET_SAFETY = `
  query targetSafety($ensemblId: String!) {
    target(ensemblId: $ensemblId) {
      id
      approvedSymbol
      safetyLiabilities {
        event
        effects {
          direction
          dosing
        }
        organs {
          id
          name
        }
        references {
          pmid
          ref2022
        }
      }
    }
  }
`;

export const GET_VARIANT_STUDIES = `
  query variantStudies($variantId: String!, $first: Int, $after: String) {
    variant(variantId: $variantId) {
      id
      chromosome
      position
      refAllele
      altAllele
      rsId
      studyLoci(first: $first, after: $after) {
        count
        rows {
          study {
            studyId
            traitReported
            pubTitle
            pubAuthor
            pubDate
            pmid
          }
          pval
          beta
          oddsRatio
          confidenceIntervalLower
          confidenceIntervalUpper
          credibleSetSize
        }
      }
    }
  }
`;

export const GET_VARIANT_CONSEQUENCES = `
  query variantConsequences($variantId: String!) {
    variant(variantId: $variantId) {
      id
      chromosome
      position
      refAllele
      altAllele
      rsId
      mostSevereConsequence
      transcriptConsequences {
        gene {
          id
          symbol
        }
        transcript {
          id
        }
        aminoAcidChange
        consequenceType
        impact
        polyphenPrediction
        polyphenScore
        siftPrediction
        siftScore
      }
    }
  }
`;

export const GET_CREDIBLE_SET = `
  query credibleSet($studyId: String!, $variantId: String!) {
    credibleSet(studyId: $studyId, variantId: $variantId) {
      studyId
      studyLocusId
      variants {
        variant {
          id
          chromosome
          position
          refAllele
          altAllele
          rsId
        }
        posteriorProbability
        pval
        beta
        standardError
      }
      locus2GeneTable {
        gene {
          id
          symbol
        }
        yProbaModel
        yProbaDistance
        yProbaInteraction
        yProbaMolecularQTL
        yProbaPathogenicity
        hasColoc
        distanceToLocus
      }
    }
  }
`;