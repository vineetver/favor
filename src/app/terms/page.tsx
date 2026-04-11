import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { ExternalLink } from "@shared/components/ui/external-link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | FAVOR",
  description:
    "Terms of use for the FAVOR database. All data are released openly under the MIT license.",
};

export default function TermsPage() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of Use
          </h1>

          <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
            <p>
              All data in FAVOR are released openly and publicly for the benefit
              of the broad biomedical and health science community. It is
              distributed under the terms of the{" "}
              <ExternalLink
                iconSize="sm"
                href="https://opensource.org/licenses/MIT"
              >
                MIT license
              </ExternalLink>
              . Users may freely download, search the data and are encouraged to
              use and publish results generated from these data. There are no
              restrictions or embargoes on the publication of results derived
              from the FAVOR database.
            </p>
            <p>
              All users of the FAVOR data agree to not attempt to re-identify or
              contact participants, protect data confidentiality, and abide by
              all applicable laws and regulations for handling genomic data.
            </p>
            <p>
              This data set has been subjected to extensive quality control,
              there is still the potential for errors. Please contact us using
              the{" "}
              <ExternalLink iconSize="sm" href="https://discussion.genohub.org">
                Discussion Forum
              </ExternalLink>{" "}
              or email us at{" "}
              <a
                href="mailto:favor@genohub.org"
                className="text-primary hover:underline"
              >
                favor@genohub.org
              </a>
              , in the event that any dubious values are encountered so that we
              may address them.
            </p>
            <p>
              When using FAVOR in your work, please use the following citation
              and include the copyright notice stated in the MIT license
              somewhere in your product or its documentation.
            </p>
          </div>

          {/* Citations */}
          <Card className="mt-12 border border-border">
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
                  Genome Sequencing Program Variant Functional Annotation
                  Working Group, Zhiping Weng, Benjamin Neale, Shamil R.
                  Sunyaev, Xihong Lin.{" "}
                  <strong>
                    FAVOR: Functional Annotation of Variants Online Resource and
                    Annotator for Variation across the Human Genome
                  </strong>
                  . Nucleic Acids Res 2022 Nov 9; gkac966. PMID:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://pubmed.ncbi.nlm.nih.gov/36350676/"
                  >
                    36350676
                  </ExternalLink>
                  . DOI:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://academic.oup.com/nar/article/51/D1/D1300/6814464?login=false"
                  >
                    10.1093/nar/gkac966
                  </ExternalLink>
                  .
                </p>
                <p className="text-sm mt-2">
                  FAVOR Full Database, DOI:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/KFUBKG"
                  >
                    10.7910/DVN/KFUBKG
                  </ExternalLink>
                  . FAVOR Essential Database, DOI:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/1VGTJI"
                  >
                    10.7910/DVN/1VGTJI
                  </ExternalLink>
                  .
                </p>
              </div>

              {/* STAAR */}
              <div>
                <p className="font-medium text-foreground mb-2">2. STAAR</p>
                <p className="text-sm">
                  Li X, Li Z, Zhou H, Gaynor SM, Liu Y, Chen H, Sun R, Dey R,
                  Arnett DK, Aslibekyan S, Ballantyne CM, Bielak LF, Blangero J,
                  Boerwinkle E, Bowden DW, Broome JG, Conomos MP, Correa A,
                  Cupples LA, Curran JE, Freedman BI, Guo X, Hindy G, Irvin MR,
                  Kardia SLR, Kathiresan S, Khan AT, Kooperberg CL, Laurie CC,
                  Liu XS, Mahaney MC, Manichaikul AW, Martin LW, Mathias RA,
                  McGarvey ST, Mitchell BD, Montasser ME, Moore JE, Morrison AC,
                  O&apos;Connell JR, Palmer ND, Pampana A, Peralta JM, Peyser
                  PA, Psaty BM, Redline S, Rice KM, Rich SS, Smith JA, Tiwari
                  HK, Tsai MY, Vasan RS, Wang FF, Weeks DE, Weng Z, Wilson JG,
                  Yanek LR, NHLBI Trans-Omics for Precision Medicine (TOPMed)
                  Consortium, TOPMed Lipids Working Group, Neale BM, Sunyaev SR,
                  Abecasis GR, Rotter JI, Willer CJ, Peloso GM, Natarajan P, and
                  Lin X.{" "}
                  <strong>
                    Dynamic incorporation of multiple in silico functional
                    annotations empowers rare variant association analysis of
                    large whole-genome sequencing studies at scale
                  </strong>
                  . <em>Nature Genetics</em> 2020; 52(9): 969-983. PMID:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://pubmed.ncbi.nlm.nih.gov/32839606/"
                  >
                    32839606
                  </ExternalLink>
                  . DOI:{" "}
                  <ExternalLink
                    iconSize="sm"
                    href="https://www.nature.com/articles/s41588-020-0676-4"
                  >
                    10.1038/s41588-020-0676-4
                  </ExternalLink>
                  .
                </p>
              </div>

              {/* STAARpipeline */}
              <div>
                <p className="font-medium text-foreground mb-2">
                  3. STAARpipeline
                </p>
                <p className="text-sm">
                  Zilin Li*, Xihao Li*, Hufeng Zhou, Sheila M. Gaynor, Margaret
                  S. Selvaraj, Theodore Arapoglou, Corbin Quick, Yaowu Liu, Han
                  Chen, Ryan Sun, Rounak Dey, Donna K. Arnett, Lawrence F.
                  Bielak, Joshua C. Bis, Thomas W. Blackwell, John Blangero,
                  Eric Boerwinkle, Donald W. Bowden, Jennifer A. Brody, Brian E.
                  Cade, Matthew P. Conomos, Adolfo Correa, L. Adrienne Cupples,
                  Joanne E. Curran, Paul S. de Vries, Ravindranath Duggirala,
                  Barry I. Freedman, Harald H. H. G&ouml;ring, Xiuqing Guo, Rita
                  R. Kalyani, Charles Kooperberg, Brian G. Kral, Leslie A.
                  Lange, Ani Manichaikul, Lisa W. Martin, Braxton D. Mitchell,
                  May E. Montasser, Alanna C. Morrison, Take Naseri, Jeffrey R.
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
                  <ExternalLink
                    iconSize="sm"
                    href="https://doi.org/10.1038/s41592-022-01640-x"
                  >
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
