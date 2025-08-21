import { z } from 'zod';
import { tool } from 'ai';

// Gene API Tools
import { fetchGeneSummary } from '@/lib/gene/summary/api';
import { fetchGeneAnnotation } from '@/lib/gene/annotation/api';
import { fetchGeneTableData } from '@/lib/gene/table/api';
import { getPathwayPairs, getPathwayGenes } from '@/lib/gene/pathways/api';
import { fetchCosmicByGene } from '@/lib/gene/cosmic/api';
import { getBiogridInteractions, getIntactInteractions, getHuriInteractions } from '@/lib/gene/ppi/api';

// Variant API Tools
import { fetchVariant, fetchVariantsByRsid } from '@/lib/variant/api';
import { fetchGnomadExome, fetchGnomadGenome } from '@/lib/variant/gnomad/api';
import { fetchABCPeaks, fetchABCScores } from '@/lib/variant/abc/api';
import { fetchScentTissueByVCF } from '@/lib/variant/scent/api';
import { fetchCV2F } from '@/lib/variant/cv2f/api';
import { fetchGWAS } from '@/lib/variant/gwas/api';
import { fetchPGBoost } from '@/lib/variant/pgboost/api';
import { getCCREByVCF } from '@/lib/variant/ccre/api';
import { fetchEntexDefault } from '@/lib/variant/entex/api';

// Region API Tools
import { fetchRegionSummary } from '@/lib/region/summary/api';
import { fetchRegionTableData } from '@/lib/region/table/api';
import { fetchABCPeaksByRegion, fetchABCScoresByRegion } from '@/lib/region/abc/api';
import { fetchCosmicByRegion } from '@/lib/region/cosmic/api';
import { fetchRegionAnnotation } from '@/lib/region/annotation/api';
import { fetchPGBoostByRegion } from '@/lib/region/pgboost/api';
import { fetchVistaEnhancerByRegion } from '@/lib/region/vista-enhancers/api';
import { fetchEpimapByRegion } from '@/lib/region/epimap/api';

// ==== GENE ANALYSIS TOOLS ====

export function getComprehensiveGeneSummary() {
  return tool({
    description: 'Get comprehensive gene summary including SNV, InDel, and total variant statistics',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name (e.g., BRCA1, TP53)'),
      category: z.enum(['SNV-summary', 'InDel-summary', 'total-summary']).optional().describe('Type of summary to retrieve')
    }),
    execute: async ({ geneName, category = 'total-summary' }) => {
      const result = await fetchGeneSummary(geneName);
      if (!result) return { error: `No data found for gene ${geneName}` };
      
      return {
        gene: geneName,
        summary: category === 'SNV-summary' ? result.snv_summary : 
                category === 'InDel-summary' ? result.indel_summary : 
                result.total_summary,
        metadata: {
          dataType: 'gene_summary',
          category,
          source: 'genohub'
        }
      };
    }
  });
}

export function getGeneAnnotationData() {
  return tool({
    description: 'Get detailed gene-level annotations including functional information',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get annotations for')
    }),
    execute: async ({ geneName }) => {
      const result = await fetchGeneAnnotation(geneName);
      if (!result) return { error: `No annotation data found for gene ${geneName}` };
      
      return {
        gene: geneName,
        annotation: result,
        metadata: {
          dataType: 'gene_annotation',
          source: 'genohub'
        }
      };
    }
  });
}

export function getGeneVariantData() {
  return tool({
    description: 'Get variant table data for a specific gene',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get variants for'),
      limit: z.number().optional().describe('Maximum number of variants to return'),
      offset: z.number().optional().describe('Number of variants to skip')
    }),
    execute: async ({ geneName, limit, offset }) => {
      const result = await fetchGeneTableData(geneName, {
        subcategory: 'SNV-table',
        pageSize: limit,
        cursor: offset?.toString()
      });
      if (!result) return { error: `No variant data found for gene ${geneName}` };
      
      return {
        gene: geneName,
        variants: result,
        metadata: {
          dataType: 'gene_variants',
          source: 'genohub',
          limit,
          offset
        }
      };
    }
  });
}

export function getGenePathwayInteractions() {
  return tool({
    description: 'Get pathway interaction pairs for a gene',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get pathway interactions for'),
      limit: z.number().optional().describe('Maximum number of interactions to return'),
      source: z.string().optional().describe('Specific pathway source to filter by')
    }),
    execute: async ({ geneName, limit, source }) => {
      const result = await getPathwayPairs(geneName, limit, source);
      if (!result) return { error: `No pathway interactions found for gene ${geneName}` };
      
      return {
        gene: geneName,
        pathwayPairs: result,
        metadata: {
          dataType: 'pathway_interactions',
          source: source || 'all',
          limit
        }
      };
    }
  });
}

export function getGenePathwayGenes() {
  return tool({
    description: 'Get genes in the same pathways as the query gene',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to find pathway genes for'),
      source: z.string().optional().describe('Specific pathway source to filter by')
    }),
    execute: async ({ geneName, source }) => {
      const result = await getPathwayGenes(geneName, source);
      if (!result) return { error: `No pathway genes found for gene ${geneName}` };
      
      return {
        gene: geneName,
        pathwayGenes: result,
        metadata: {
          dataType: 'pathway_genes',
          source: source || 'all'
        }
      };
    }
  });
}

export function getGeneCosmicData() {
  return tool({
    description: 'Get COSMIC cancer gene census data',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get COSMIC data for')
    }),
    execute: async ({ geneName }) => {
      const result = await fetchCosmicByGene(geneName);
      if (!result) return { error: `No COSMIC data found for gene ${geneName}` };
      
      return {
        gene: geneName,
        cosmic: result,
        metadata: {
          dataType: 'cosmic_gene',
          source: 'cosmic'
        }
      };
    }
  });
}

export function getGeneProteinInteractions() {
  return tool({
    description: 'Get protein-protein interactions from multiple databases (BioGRID, IntAct, HuRI)',
    inputSchema: z.object({
      geneName: z.string().describe('Gene name to get protein interactions for'),
      database: z.enum(['biogrid', 'intact', 'huri', 'all']).optional().describe('Specific PPI database to query'),
      limit: z.number().optional().describe('Maximum number of interactions to return')
    }),
    execute: async ({ geneName, database = 'all', limit }) => {
      const results: any = {};
      
      if (database === 'all' || database === 'biogrid') {
        results.biogrid = await getBiogridInteractions(geneName, limit);
      }
      if (database === 'all' || database === 'intact') {
        results.intact = await getIntactInteractions(geneName, limit);
      }
      if (database === 'all' || database === 'huri') {
        results.huri = await getHuriInteractions(geneName, limit);
      }
      
      return {
        gene: geneName,
        interactions: results,
        metadata: {
          dataType: 'protein_interactions',
          database,
          limit
        }
      };
    }
  });
}

// ==== VARIANT ANALYSIS TOOLS ====

export function getVariantInformation() {
  return tool({
    description: 'Get comprehensive variant information by VCF format',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format (chr:pos:ref:alt)')
    }),
    execute: async ({ vcf }) => {
      const result = await fetchVariant(vcf);
      if (!result) return { error: `No data found for variant ${vcf}` };
      
      return {
        variant: vcf,
        data: result,
        metadata: {
          dataType: 'variant_info',
          source: 'genohub'
        }
      };
    }
  });
}

export function getVariantsByRsid() {
  return tool({
    description: 'Get variants by rsID',
    inputSchema: z.object({
      rsid: z.string().describe('rsID (e.g., rs1234567)')
    }),
    execute: async ({ rsid }) => {
      const result = await fetchVariantsByRsid(rsid);
      if (!result) return { error: `No variants found for rsID ${rsid}` };
      
      return {
        rsid,
        variants: result,
        metadata: {
          dataType: 'variant_rsid',
          source: 'genohub'
        }
      };
    }
  });
}

export function getGnomadData() {
  return tool({
    description: 'Get gnomAD population frequency data for a variant',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format'),
      dataset: z.enum(['exome', 'genome', 'both']).optional().describe('gnomAD dataset to query')
    }),
    execute: async ({ vcf, dataset = 'both' }) => {
      const results: any = {};
      
      if (dataset === 'both' || dataset === 'exome') {
        results.exome = await fetchGnomadExome(vcf);
      }
      if (dataset === 'both' || dataset === 'genome') {
        results.genome = await fetchGnomadGenome(vcf);
      }
      
      return {
        variant: vcf,
        gnomad: results,
        metadata: {
          dataType: 'gnomad',
          dataset
        }
      };
    }
  });
}

export function getVariantABCData() {
  return tool({
    description: 'Get Activity-by-Contact (ABC) enhancer-gene predictions for a variant',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format'),
      dataType: z.enum(['peaks', 'scores', 'both']).optional().describe('Type of ABC data to retrieve')
    }),
    execute: async ({ vcf, dataType = 'both' }) => {
      const results: any = {};
      
      if (dataType === 'both' || dataType === 'peaks') {
        results.peaks = await fetchABCPeaks(vcf);
      }
      if (dataType === 'both' || dataType === 'scores') {
        results.scores = await fetchABCScores(vcf);
      }
      
      return {
        variant: vcf,
        abc: results,
        metadata: {
          dataType: 'variant_abc',
          source: 'abc'
        }
      };
    }
  });
}

export function getVariantFunctionalScores() {
  return tool({
    description: 'Get functional prediction scores for variants (SCENT, CV2F, PGBoost)',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format'),
      scoreType: z.enum(['scent', 'cv2f', 'pgboost', 'all']).optional().describe('Type of functional score to retrieve')
    }),
    execute: async ({ vcf, scoreType = 'all' }) => {
      const results: any = {};
      
      if (scoreType === 'all' || scoreType === 'scent') {
        results.scent = await fetchScentTissueByVCF(vcf);
      }
      if (scoreType === 'all' || scoreType === 'cv2f') {
        results.cv2f = await fetchCV2F(vcf);
      }
      if (scoreType === 'all' || scoreType === 'pgboost') {
        results.pgboost = await fetchPGBoost(vcf);
      }
      
      return {
        variant: vcf,
        functionalScores: results,
        metadata: {
          dataType: 'functional_scores',
          scoreType
        }
      };
    }
  });
}

export function getVariantGWASData() {
  return tool({
    description: 'Get GWAS catalog associations for a variant',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format')
    }),
    execute: async ({ vcf }) => {
      const result = await fetchGWAS(vcf);
      if (!result) return { error: `No GWAS data found for variant ${vcf}` };
      
      return {
        variant: vcf,
        gwas: result,
        metadata: {
          dataType: 'gwas_catalog',
          source: 'ebi_gwas'
        }
      };
    }
  });
}

export function getVariantRegulatoryData() {
  return tool({
    description: 'Get regulatory element data for variants (CCRE, ENTEX)',
    inputSchema: z.object({
      vcf: z.string().describe('Variant in VCF format'),
      dataType: z.enum(['ccre', 'entex', 'both']).optional().describe('Type of regulatory data to retrieve')
    }),
    execute: async ({ vcf, dataType = 'both' }) => {
      const results: any = {};
      
      if (dataType === 'both' || dataType === 'ccre') {
        results.ccre = await getCCREByVCF(vcf);
      }
      if (dataType === 'both' || dataType === 'entex') {
        results.entex = await fetchEntexDefault(vcf);
      }
      
      return {
        variant: vcf,
        regulatory: results,
        metadata: {
          dataType: 'regulatory_elements',
          source: dataType
        }
      };
    }
  });
}

// ==== REGION ANALYSIS TOOLS ====

export function getRegionSummaryData() {
  return tool({
    description: 'Get region summary statistics for SNVs and InDels',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      category: z.enum(['SNV-summary', 'InDel-summary']).optional().describe('Type of summary to retrieve')
    }),
    execute: async ({ region, category = 'SNV-summary' }) => {
      const result = await fetchRegionSummary(region, category);
      if (!result) return { error: `No summary data found for region ${region}` };
      
      return {
        region,
        summary: result,
        metadata: {
          dataType: 'region_summary',
          category,
          source: 'genohub'
        }
      };
    }
  });
}

export function getRegionVariantData() {
  return tool({
    description: 'Get variant table data for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      limit: z.number().optional().describe('Maximum number of variants to return'),
      offset: z.number().optional().describe('Number of variants to skip')
    }),
    execute: async ({ region, limit, offset }) => {
      const result = await fetchRegionTableData(region, {
        subcategory: 'SNV-table',
        pageSize: limit,
        cursor: offset?.toString()
      });
      if (!result) return { error: `No variant data found for region ${region}` };
      
      return {
        region,
        variants: result,
        metadata: {
          dataType: 'region_variants',
          source: 'genohub',
          limit,
          offset
        }
      };
    }
  });
}

export function getRegionABCData() {
  return tool({
    description: 'Get ABC enhancer-gene predictions for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      dataType: z.enum(['peaks', 'scores', 'both']).optional().describe('Type of ABC data to retrieve')
    }),
    execute: async ({ region, dataType = 'both' }) => {
      const results: any = {};
      
      if (dataType === 'both' || dataType === 'peaks') {
        results.peaks = await fetchABCPeaksByRegion(region);
      }
      if (dataType === 'both' || dataType === 'scores') {
        results.scores = await fetchABCScoresByRegion(region);
      }
      
      return {
        region,
        abc: results,
        metadata: {
          dataType: 'region_abc',
          source: 'abc'
        }
      };
    }
  });
}

export function getRegionAnnotationData() {
  return tool({
    description: 'Get annotation data for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)')
    }),
    execute: async ({ region }) => {
      const result = await fetchRegionAnnotation(region);
      if (!result) return { error: `No annotation data found for region ${region}` };
      
      return {
        region,
        annotation: result,
        metadata: {
          dataType: 'region_annotation',
          source: 'genohub'
        }
      };
    }
  });
}

export function getRegionRegulatoryData() {
  return tool({
    description: 'Get regulatory data for a genomic region (VISTA enhancers, EpiMap)',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)'),
      dataType: z.enum(['vista', 'epimap', 'pgboost', 'all']).optional().describe('Type of regulatory data to retrieve')
    }),
    execute: async ({ region, dataType = 'all' }) => {
      const results: any = {};
      
      if (dataType === 'all' || dataType === 'vista') {
        results.vista = await fetchVistaEnhancerByRegion(region);
      }
      if (dataType === 'all' || dataType === 'epimap') {
        results.epimap = await fetchEpimapByRegion(region);
      }
      if (dataType === 'all' || dataType === 'pgboost') {
        results.pgboost = await fetchPGBoostByRegion(region);
      }
      
      return {
        region,
        regulatory: results,
        metadata: {
          dataType: 'region_regulatory',
          source: dataType
        }
      };
    }
  });
}

export function getRegionCosmicData() {
  return tool({
    description: 'Get COSMIC cancer data for a genomic region',
    inputSchema: z.object({
      region: z.string().describe('Genomic region (e.g., chr1:1000000-2000000)')
    }),
    execute: async ({ region }) => {
      const result = await fetchCosmicByRegion(region);
      if (!result) return { error: `No COSMIC data found for region ${region}` };
      
      return {
        region,
        cosmic: result,
        metadata: {
          dataType: 'cosmic_region',
          source: 'cosmic'
        }
      };
    }
  });
}