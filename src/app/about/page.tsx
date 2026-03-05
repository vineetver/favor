import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { ExternalLink } from "@shared/components/ui/external-link";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | FAVOR",
  description:
    "About FAVOR - Functional Annotation of Variants Online Resource. An open-access variant functional annotation portal for whole genome/exome sequencing data.",
};

export default function AboutPage() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            About FAVOR
          </h1>

          {/* Main description */}
          <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Functional Annotation of Variants - Online Resource (FAVOR), is an
              open-access variant functional annotation portal for whole
              genome/exome sequencing (WGS/WES) data. FAVOR provides variant and
              indel functional annotation information obtained from a collection
              of databases. These annotations span a spectrum of variant
              attributes, for example, variant categories, allele frequencies,
              evidence of open chromatin, protein function, conservation, clinvar
              information, local nucleotide diversity.
            </p>
            <p>
              In its current release (V2.0), FAVOR includes functional
              annotation information for all possible SNVs (8,812,917,339 SNVs)
              across the human genome and observed INDELs (79,997,898 indels)
              from the Trans-Omics for Precision Medicine (TOPMed){" "}
              <ExternalLink iconSize="sm" href="https://bravo.sph.umich.edu/freeze8/hg38/">
                BRAVO variant set
              </ExternalLink>{" "}
              (Build GRCh38) (NHLBI TOPMed Consortium, 2018; Taliun et al.,
              2021). All together FAVOR contains total 8,892,915,237 variants
              (all possible 8,812,917,339 SNVs and 79,997,898 Observed indels).
              More data will be provided in future releases.
            </p>
            <p>
              This data is publicly available for the benefit of the bioscience
              community to all users who agree to the terms. FAVOR is being
              developed with the support from the{" "}
              <ExternalLink iconSize="sm" href="https://www.genome.gov/Funded-Programs-Projects/NHGRI-Genome-Sequencing-Program">
                NHGRI Genome Sequencing Program
              </ExternalLink>
              , in collaboration with TOPMed. There are no publication
              restrictions or embargos on these data.
            </p>
            <p>
              See the{" "}
              <Link href="/docs" className="text-primary hover:underline">
                Documentation
              </Link>{" "}
              for more info on using FAVOR. Post to the{" "}
              <ExternalLink iconSize="sm" href="https://discussion.genohub.org/">
                Discussion Forum
              </ExternalLink>{" "}
              for user support and feature requests. If you have any questions
              about this website or would like to report bugs, please email{" "}
              <a
                href="mailto:favor@genohub.org"
                className="text-primary hover:underline"
              >
                favor@genohub.org
              </a>
              .
            </p>
          </div>

          {/* Team */}
          <Card className="mt-12 border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <p className="font-medium text-foreground mb-1">
                  FAVOR Developers
                </p>
                <p>
                  <ExternalLink iconSize="sm" href="https://www.hsph.harvard.edu/hufeng-zhou/">
                    Hufeng Zhou
                  </ExternalLink>{" "}
                  (Lead),{" "}
                  <ExternalLink iconSize="sm" href="https://www.vineetverma.io/">
                    Vineet Verma
                  </ExternalLink>{" "}
                  (Software Engineer Lead),{" "}
                  <ExternalLink iconSize="sm" href="https://content.sph.harvard.edu/xlin/">
                    Xihong Lin
                  </ExternalLink>
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  FAVORannotator Developers
                </p>
                <p>
                  <ExternalLink iconSize="sm" href="https://www.hsph.harvard.edu/hufeng-zhou/">
                    Hufeng Zhou
                  </ExternalLink>{" "}
                  (Lead),{" "}
                  <ExternalLink iconSize="sm" href="https://www.xihaoli.org/">
                    Xihao Li
                  </ExternalLink>{" "}
                  (Co Lead),{" "}
                  <ExternalLink iconSize="sm" href="https://zilinli1988.github.io/">
                    Zilin Li
                  </ExternalLink>{" "}
                  (Co Lead),{" "}
                  <ExternalLink iconSize="sm" href="https://content.sph.harvard.edu/xlin/">
                    Xihong Lin
                  </ExternalLink>
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  Other Contributors
                </p>
                <p>
                  NHGRI Genome Sequencing Program Functional Annotation Working
                  Group: Xihong Lin (Chair), Theodore Arapoglou (Co-Lead), Xiuwen
                  Zheng, Jill Moore, Abhijith Asok, Sushant Kumar, Elizabeth E.
                  Blue, Steven Buyske, Nancy Cox, Adam Felsenfeld, Mark
                  Gerstein, Eimear Kenny, Bingshan Li, Tara Matise, Anthony
                  Philippakis, Heidi Rehm, Heidi J. Sofia, Grace Snyder, NHGRI
                  Genome Sequencing Program Variant Functional Annotation Working
                  Group, Zhiping Weng, Benjamin Neale, Shamil R. Sunyaev,
                  Genevieve Wojcik.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  Helpful Discussions
                </p>
                <p>Sheila Gaynor, Ryan Sun, Genevieve Wojcik</p>
              </div>
            </CardContent>
          </Card>

          {/* Funding */}
          <Card className="mt-6 border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Funding & Acknowledgement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <p className="font-medium text-foreground mb-1">Funding</p>
                <p>
                  This work was supported by grant nos. R35-CA197449,
                  P01-CA134294, U19-CA203654 and R01-HL113338 (to X. Lin),
                  U01-HG012064 (to Z. Weng and X. Lin), U01-HG009088 (to X.
                  Lin, S.R.S. and B.M.N.).
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Acknowledgement
                </p>
                <p>
                  NHGRI Genome Sequencing Program Analysis Centers, Centers of
                  Mendelian Diseases, Centers for Common Diseases, and
                  Coordinating Center; NHLBI TOPMed Steering Committee, Data
                  Coordinating Center, Informatics Research Center, and TOPMed
                  investigators.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Citations */}
          <Card className="mt-6 border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Citation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground leading-relaxed">
              {/* FAVOR */}
              <div>
                <p className="font-medium text-foreground mb-2">1. FAVOR</p>
                <p className="text-sm">
                  Hufeng Zhou*, Theodore Arapoglou*, Xihao Li, Zilin Li, Xiuwen
                  Zheng, Jill Moore, Abhijith Asok, Sushant Kumar, Elizabeth E.
                  Blue, Steven Buyske, Nancy Cox, Adam Felsenfeld, Mark
                  Gerstein, Eimear Kenny, Bingshan Li, Tara Matise, Anthony
                  Philippakis, Heidi Rehm, Heidi J. Sofia, Grace Snyder, NHGRI
                  Genome Sequencing Program Variant Functional Annotation Working
                  Group, Zhiping Weng, Benjamin Neale, Shamil R. Sunyaev, Xihong
                  Lin.{" "}
                  <strong>
                    FAVOR: Functional Annotation of Variants Online Resource and
                    Annotator for Variation across the Human Genome
                  </strong>
                  . Nucleic Acids Res 2022 Nov 9; gkac966. PMID:{" "}
                  <ExternalLink iconSize="sm" href="https://pubmed.ncbi.nlm.nih.gov/36350676/">
                    36350676
                  </ExternalLink>
                  . DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://academic.oup.com/nar/article/51/D1/D1300/6814464?login=false">
                    10.1093/nar/gkac966
                  </ExternalLink>
                  .
                </p>
                <p className="text-sm mt-2">
                  FAVOR Full Database, DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/KFUBKG">
                    10.7910/DVN/KFUBKG
                  </ExternalLink>
                  . FAVOR Essential Database, DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/1VGTJI">
                    10.7910/DVN/1VGTJI
                  </ExternalLink>
                  .
                </p>
              </div>

              {/* FAVOR-GPT */}
              <div>
                <p className="font-medium text-foreground mb-2">
                  2. FAVOR-GPT
                </p>
                <p className="text-sm">
                  Thomas Cheng Li, Hufeng Zhou, Vineet Verma, Xiangru Tang,
                  Yanjun Shao, Eric Van Buren, Zhiping Weng, Mark Gerstein,
                  Benjamin Neale, Shamil R. Sunyaev, Xihong Lin.{" "}
                  <strong>
                    FAVOR-GPT: a generative natural language interface to whole
                    genome variant functional annotations
                  </strong>
                  . <em>Bioinformatics Advances</em>, Volume 4, Issue 1, 2024,
                  vbae143. DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://doi.org/10.1093/bioadv/vbae143">
                    10.1093/bioadv/vbae143
                  </ExternalLink>
                  .
                </p>
              </div>

              {/* STAAR */}
              <div>
                <p className="font-medium text-foreground mb-2">3. STAAR</p>
                <p className="text-sm">
                  Li X, Li Z, Zhou H, Gaynor SM, Liu Y, Chen H, Sun R, Dey R,
                  Arnett DK, Aslibekyan S, Ballantyne CM, Bielak LF, Blangero
                  J, Boerwinkle E, Bowden DW, Broome JG, Conomos MP, Correa A,
                  Cupples LA, Curran JE, Freedman BI, Guo X, Hindy G, Irvin MR,
                  Kardia SLR, Kathiresan S, Khan AT, Kooperberg CL, Laurie CC,
                  Liu XS, Mahaney MC, Manichaikul AW, Martin LW, Mathias RA,
                  McGarvey ST, Mitchell BD, Montasser ME, Moore JE, Morrison AC,
                  O&apos;Connell JR, Palmer ND, Pampana A, Peralta JM, Peyser
                  PA, Psaty BM, Redline S, Rice KM, Rich SS, Smith JA, Tiwari
                  HK, Tsai MY, Vasan RS, Wang FF, Weeks DE, Weng Z, Wilson JG,
                  Yanek LR, NHLBI Trans-Omics for Precision Medicine (TOPMed)
                  Consortium, TOPMed Lipids Working Group, Neale BM, Sunyaev SR,
                  Abecasis GR, Rotter JI, Willer CJ, Peloso GM, Natarajan P,
                  and Lin X.{" "}
                  <strong>
                    Dynamic incorporation of multiple in silico functional
                    annotations empowers rare variant association analysis of
                    large whole-genome sequencing studies at scale
                  </strong>
                  . <em>Nature Genetics</em> 2020; 52(9): 969-983. PMID:{" "}
                  <ExternalLink iconSize="sm" href="https://pubmed.ncbi.nlm.nih.gov/32839606/">
                    32839606
                  </ExternalLink>
                  . DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://www.nature.com/articles/s41588-020-0676-4">
                    10.1038/s41588-020-0676-4
                  </ExternalLink>
                  .
                </p>
              </div>

              {/* STAARpipeline */}
              <div>
                <p className="font-medium text-foreground mb-2">
                  4. STAARpipeline
                </p>
                <p className="text-sm">
                  Zilin Li*, Xihao Li*, Hufeng Zhou, Sheila M. Gaynor, Margaret
                  S. Selvaraj, Theodore Arapoglou, Corbin Quick, Yaowu Liu, Han
                  Chen, Ryan Sun, Rounak Dey, Donna K. Arnett, Lawrence F.
                  Bielak, Joshua C. Bis, Thomas W. Blackwell, John Blangero,
                  Eric Boerwinkle, Donald W. Bowden, Jennifer A. Brody, Brian E.
                  Cade, Matthew P. Conomos, Adolfo Correa, L. Adrienne Cupples,
                  Joanne E. Curran, Paul S. de Vries, Ravindranath Duggirala,
                  Barry I. Freedman, Harald H. H. Göring, Xiuqing Guo, Rita R.
                  Kalyani, Charles Kooperberg, Brian G. Kral, Leslie A. Lange,
                  Ani Manichaikul, Lisa W. Martin, Braxton D. Mitchell, May E.
                  Montasser, Alanna C. Morrison, Take Naseri, Jeffrey R.
                  O&apos;Connell, Nicholette D. Palmer, Patricia A. Peyser,
                  Bruce M. Psaty, Laura M. Raffield, Susan Redline, Alexander P.
                  Reiner, Muagututi&apos;a Sefuiva Reupena, Kenneth M. Rice,
                  Stephen S. Rich, Jennifer A. Smith, Kent D. Taylor,
                  Ramachandran S. Vasan, Daniel E. Weeks, James G. Wilson, Lisa
                  R. Yanek, Wei Zhao, NHLBI Trans-Omics for Precision Medicine
                  (TOPMed) Consortium, TOPMed Lipids Working Group, Jerome I.
                  Rotter, Cristen J. Willer, Pradeep Natarajan, Gina M. Peloso,
                  Xihong Lin.{" "}
                  <strong>
                    A framework for detecting noncoding rare variant
                    associations of large-scale whole-genome sequencing studies.
                  </strong>{" "}
                  <em>Nature Methods</em> 19, 1599&ndash;1611 (2022) DOI:{" "}
                  <ExternalLink iconSize="sm" href="https://doi.org/10.1038/s41592-022-01640-x">
                    s41592-022-01640-x
                  </ExternalLink>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
