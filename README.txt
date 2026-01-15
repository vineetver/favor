Liver E2G (Enhancer-to-Gene) BED Files
======================================

Source: Lipid Knowledge Portal scE2G predictions
Genome: hg38
Threshold: E2G.Score >= 0.177

Files
-----
- hepatocytes.bed.gz    (62,180 regions)
- kupffer.bed.gz        (64,171 regions)
- lsec.bed.gz           (64,159 regions)
- b_cells.bed.gz        (63,590 regions)
- cholangiocytes.bed.gz (59,353 regions)
- mesenchymal.bed.gz    (63,479 regions)
- nk-t.bed.gz           (60,545 regions)
- all_regions.bed.gz    (437,477 regions, all cell types combined)

Column Schema (BED7)
--------------------
1. chrom        - Chromosome (1-22, X, Y)
2. chromStart   - Enhancer region start (0-based)
3. chromEnd     - Enhancer region end
4. gene_tss     - Target gene TSS position
5. gene         - Target gene symbol
6. score        - E2G score (0-1, higher = stronger link)
7. region_class - promoter | intergenic | genic

Gosling.js Usage
----------------
{
  "data": {
    "type": "bed",
    "url": "https://.../hepatocytes.bed.gz",
    "indexUrl": "https://.../hepatocytes.bed.gz.tbi",
    "customFields": ["gene_tss", "gene", "score", "region_class"]
  }
}

Arc Visualization (Enhancer → Gene TSS)
---------------------------------------
Use chromStart/chromEnd for enhancer position
Use gene_tss for the target gene position
Color/opacity by score

Generated: 2026-01-14
