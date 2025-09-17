export default async function Page() {
  return (
    <>
      <div className="relative">
        <div>
          <div className="mx-auto max-w-3xl">
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              About FAVOR
            </h1>
            <div className="mt-6 space-y-6 text-left">
              <p>
                Functional Annotation of Variants - Online Resource (FAVOR), is
                an open-access variant functional annotation portal for whole
                genome/exome sequencing (WGS/WES) data. FAVOR provides variant
                and indel functional annotation information obtained from a
                collection of databases. These annotations span a spectrum of
                variant attributes, for example, variant categories, allele
                frequencies, evidence of open chromatin, protein function,
                conservation, clinvar information, local nucleotide diversity.
                In its current release (V2.0), FAVOR includes functional
                annotation information for all possible SNVs (8,812,917,339
                SNVs) across the human genome and observed INDELs (79,997,898
                indels) from the Trans-Omics for Precision Medicine (TOPMed){" "}
                <a
                  href="https://bravo.sph.umich.edu/freeze8/hg38/"
                  className="text-primary hover:underline"
                >
                  BRAVO variant set
                </a>{" "}
                (Build GRCh38) (NHLBI TOPMed Consortium, 2018; Taliun et al.,
                2021). All together FAVOR contains total 8,892,915,237 variants
                (all possible 8,812,917,339 SNVs and 79,997,898 Observed
                indels). More data will be provided in future releases.
              </p>
              <p>
                This data is publicly available for the benefit of the
                bioscience community to all users who agree to the terms. FAVOR
                is being developed with the support from the{" "}
                <a
                  href="https://www.genome.gov/Funded-Programs-Projects/NHGRI-Genome-Sequencing-Program"
                  className="text-primary hover:underline"
                >
                  NHGRI Genome Sequencing Program
                </a>
                , in collaboration with TOPMed. There are no publication
                restrictions or embargos on these data.{" "}
              </p>
              <p>
                See the Documentation for more info on using FAVOR. Post to the{" "}
                <a
                  href="https://discussion.genohub.org/"
                  className="text-primary hover:underline"
                >
                  Discussion Forum
                </a>{" "}
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
              <p>
                <strong>FAVOR Developers:</strong>{" "}
                <a
                  href="https://www.hsph.harvard.edu/hufeng-zhou/"
                  className="text-primary hover:underline"
                >
                  Hufeng Zhou
                </a>{" "}
                (Lead),{" "}
                <a
                  href="https://www.vineetverma.io/"
                  className="text-primary hover:underline"
                >
                  Vineet Verma
                </a>{" "}
                (Software Engineer Lead),{" "}
                <a
                  href="https://content.sph.harvard.edu/xlin/"
                  className="text-primary hover:underline"
                >
                  Xihong Lin
                </a>
              </p>
              <p>
                <strong>FAVORannotator Developers:</strong>{" "}
                <a
                  href="https://www.hsph.harvard.edu/hufeng-zhou/"
                  className="text-primary hover:underline"
                >
                  Hufeng Zhou
                </a>{" "}
                (Lead),{" "}
                <a
                  href="https://www.xihaoli.org/"
                  className="text-primary hover:underline"
                >
                  Xihao Li
                </a>{" "}
                (Co Lead),{" "}
                <a
                  href="https://zilinli1988.github.io/"
                  className="text-primary hover:underline"
                >
                  Zilin Li
                </a>{" "}
                (Co Lead),{" "}
                <a
                  href="https://content.sph.harvard.edu/xlin/"
                  className="text-primary hover:underline"
                >
                  Xihong Lin
                </a>
              </p>
              <p>
                <strong>Other Contributors:</strong> NHGRI Genome Sequencing
                Program Functional Annotation Working Group: Xihong Lin (Chair),
                Theodore Arapoglou (Co-Lead), Xiuwen Zheng, Jill Moore, Abhijith
                Asok, Sushant Kumar, Elizabeth E. Blue, Steven Buyske, Nancy
                Cox, Adam Felsenfeld, Mark Gerstein, Eimear Kenny, Bingshan Li,
                Tara Matise, Anthony Philippakis, Heidi Rehm, Heidi J. Sofia,
                Grace Snyder, NHGRI Genome Sequencing Program Variant Functional
                Annotation Working Group, Zhiping Weng, Benjamin Neale, Shamil
                R. Sunyaev, Genevieve Wojcik.
              </p>

              <p>
                <strong>Helpful Discussions:</strong> Sheila Gaynor, Ryan Sun,
                Genevieve Wojcik
              </p>
              <p>
                <strong>Funding:</strong> This work was supported by grant nos.
                R35-CA197449, P01-CA134294, U19-CA203654 and R01-HL113338 (to X.
                Lin), U01-HG012064 (to Z. Weng and X. Lin), U01-HG009088 (to X.
                Lin, S.R.S. and B.M.N.).
              </p>
              <p>
                <strong>Acknowledgement:</strong> NHGRI Genome Sequencing
                Program Analysis Centers, Centers of Mendelian Diseases, Centers
                for Common Diseases, and Coordinating Center; NHLBI TOPMed
                Steering Committee, Data Coordinating Center, Informatics
                Research Center, and TOPMed investigators.{" "}
              </p>
              <p className="text-xl font-bold">Citation</p>
              <p>
                <strong>1. FAVOR</strong>{" "}
              </p>
              <p>
                Hufeng Zhou*, Theodore Arapoglou*, Xihao Li, Zilin Li, Xiuwen
                Zheng, Jill Moore, Abhijith Asok, Sushant Kumar, Elizabeth E.
                Blue, Steven Buyske, Nancy Cox, Adam Felsenfeld, Mark Gerstein,
                Eimear Kenny, Bingshan Li, Tara Matise, Anthony Philippakis,
                Heidi Rehm, Heidi J. Sofia, Grace Snyder, NHGRI Genome
                Sequencing Program Variant Functional Annotation Working Group,
                Zhiping Weng, Benjamin Neale, Shamil R. Sunyaev, Xihong Lin.{" "}
                <strong>
                  FAVOR: Functional Annotation of Variants Online Resource and
                  Annotator for Variation across the Human Genome
                </strong>{" "}
                . Nucleic Acids Res 2022 Nov 9; gkac966. PMID:{" "}
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/36350676/"
                  className="text-primary hover:underline"
                >
                  36350676
                </a>
                . DOI:{" "}
                <a
                  href="https://academic.oup.com/nar/article/51/D1/D1300/6814464?login=false"
                  className="text-primary hover:underline"
                >
                  10.1093/nar/gkac966.
                </a>
                .{" "}
              </p>
              <p>
                FAVOR Full Database, DOI:{" "}
                <a
                  href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/KFUBKG"
                  className="text-primary hover:underline"
                >
                  10.7910/DVN/KFUBKG
                </a>
                . FAVOR Esssential Database, DOI:{" "}
                <a
                  href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/1VGTJI"
                  className="text-primary hover:underline"
                >
                  10.7910/DVN/1VGTJI
                </a>
                .
              </p>
              <p>
                <strong>2. FAVOR-GPT</strong>
              </p>
              <p>
                Thomas Cheng Li, Hufeng Zhou, Vineet Verma, Xiangru Tang, Yanjun
                Shao, Eric Van Buren, Zhiping Weng, Mark Gerstein, Benjamin
                Neale, Shamil R. Sunyaev, Xihong Lin.{" "}
                <strong>
                  FAVOR-GPT: a generative natural language interface to whole
                  genome variant functional annotations
                </strong>
                . <em>Bioinformatics Advances</em>, Volume 4, Issue 1, 2024,
                vbae143. DOI:{" "}
                <a
                  href="https://doi.org/10.1093/bioadv/vbae143"
                  className="text-primary hover:underline"
                >
                  10.1093/bioadv/vbae143
                </a>
                .
              </p>
              <p>
                <strong>3. STAAR</strong>{" "}
              </p>
              <p>
                Li X, Li Z, Zhou H, Gaynor SM, Liu Y, Chen H, Sun R, Dey R,
                Arnett DK, Aslibekyan S, Ballantyne CM, Bielak LF, Blangero J,
                Boerwinkle E, Bowden DW, Broome JG, Conomos MP, Correa A,
                Cupples LA, Curran JE, Freedman BI, Guo X, Hindy G, Irvin MR,
                Kardia SLR, Kathiresan S, Khan AT, Kooperberg CL, Laurie CC, Liu
                XS, Mahaney MC, Manichaikul AW, Martin LW, Mathias RA, McGarvey
                ST, Mitchell BD, Montasser ME, Moore JE, Morrison AC, O’Connell
                JR, Palmer ND, Pampana A, Peralta JM, Peyser PA, Psaty BM,
                Redline S, Rice KM, Rich SS, Smith JA, Tiwari HK, Tsai MY, Vasan
                RS, Wang FF, Weeks DE, Weng Z, Wilson JG, Yanek LR, NHLBI
                Trans-Omics for Precision Medicine (TOPMed) Consortium, TOPMed
                Lipids Working Group, Neale BM, Sunyaev SR, Abecasis GR, Rotter
                JI, Willer CJ, Peloso GM, Natarajan P, and Lin X.{" "}
                <strong>
                  Dynamic incorporation of multiple in silico functional
                  annotations empowers rare variant association analysis of
                  large whole-genome sequencing studies at scale
                </strong>
                . <em>Nature Genetics</em> 2020; 52(9): 969-983. PMID:{" "}
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/32839606/"
                  className="text-primary hover:underline"
                >
                  32839606
                </a>
                . DOI:{" "}
                <a
                  href="https://www.nature.com/articles/s41588-020-0676-4"
                  className="text-primary hover:underline"
                >
                  10.1038/s41588-020-0676-4
                </a>
                .
              </p>
              <p>
                <strong>4. STAARpipeline</strong>{" "}
              </p>
              <p>
                Zilin Li*, Xihao Li*, Hufeng Zhou, Sheila M. Gaynor, Margaret S.
                Selvaraj, Theodore Arapoglou, Corbin Quick, Yaowu Liu, Han Chen,
                Ryan Sun, Rounak Dey, Donna K. Arnett, Lawrence F. Bielak,
                Joshua C. Bis, Thomas W. Blackwell, John Blangero, Eric
                Boerwinkle, Donald W. Bowden, Jennifer A. Brody, Brian E. Cade,
                Matthew P. Conomos, Adolfo Correa, L. Adrienne Cupples, Joanne
                E. Curran, Paul S. de Vries, Ravindranath Duggirala, Barry I.
                Freedman, Harald H. H. Göring, Xiuqing Guo, Rita R. Kalyani,
                Charles Kooperberg, Brian G. Kral, Leslie A. Lange, Ani
                Manichaikul, Lisa W. Martin, Braxton D. Mitchell, May E.
                Montasser, Alanna C. Morrison, Take Naseri, Jeffrey R.
                O’Connell, Nicholette D. Palmer, Patricia A. Peyser, Bruce M.
                Psaty, Laura M. Raffield, Susan Redline, Alexander P. Reiner,
                Muagututi‘a Sefuiva Reupena, Kenneth M. Rice, Stephen S. Rich,
                Jennifer A. Smith, Kent D. Taylor, Ramachandran S. Vasan, Daniel
                E. Weeks, James G. Wilson, Lisa R. Yanek, Wei Zhao, NHLBI
                Trans-Omics for Precision Medicine (TOPMed) Consortium, TOPMed
                Lipids Working Group, Jerome I. Rotter, Cristen J. Willer,
                Pradeep Natarajan, Gina M. Peloso, Xihong Lin.{" "}
                <strong>
                  A framework for detecting noncoding rare variant associations
                  of large-scale whole-genome sequencing studies.
                </strong>{" "}
                <em>Nature Methods</em> 19, 1599–1611 (2022) DOI:{" "}
                <a
                  href="https://doi.org/10.1038/s41592-022-01640-x"
                  className="text-primary hover:underline"
                >
                  s41592-022-01640-x
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
