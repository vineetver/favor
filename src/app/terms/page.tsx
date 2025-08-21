
export default async function Page() {
  return (
    <>
      <div className="relative">
        <div className="mx-auto max-w-3xl">
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Use
          </h1>
          <div className="mt-6 space-y-6 text-left">
            <p>
              All data in FAVOR are released openly and publicly for the benefit
              of the broad biomedical and health science community. It is
              distributed under the terms of{" "}
              <a href="https://opensource.org/licenses/MIT" className="text-primary hover:underline">MIT license</a>.
              Users may freely download, search the data and are encouraged to
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
              the Discussion <a href="https://discussion.genohub.org" className="text-primary hover:underline">Forum</a>{" "}
              or email us at{" "}
              <a href="mailto:favor@genohub.org" className="text-primary hover:underline">favor@genohub.org</a>, in the
              event that any dubious values are encountered so that we may
              address them.
            </p>
            <p>
              When using FAVOR in your work, please use the following citation
              and include the copyright notice stated in the MIT license
              somewhere in your product or its documentation.
            </p>
            <p className="text-xl font-bold">Citation</p>
            <p>
              <strong>1. FAVOR </strong>{" "}
            </p>
            <p>
              Hufeng Zhou*, Theodore Arapoglou*, Xihao Li, Zilin Li, Xiuwen
              Zheng, Jill Moore, Abhijith Asok, Sushant Kumar, Elizabeth E.
              Blue, Steven Buyske, Nancy Cox, Adam Felsenfeld, Mark Gerstein,
              Eimear Kenny, Bingshan Li, Tara Matise, Anthony Philippakis, Heidi
              Rehm, Heidi J. Sofia, Grace Snyder, NHGRI Genome Sequencing
              Program Variant Functional Annotation Working Group, Zhiping Weng,
              Benjamin Neale, Shamil R. Sunyaev, Xihong Lin.{" "}
              <strong>
                FAVOR: Functional Annotation of Variants Online Resource and
                Annotator for Variation across the Human Genome
              </strong>{" "}
              . Nucleic Acids Res 2022 Nov 9; gkac966. PMID:{" "}
              <a href="https://pubmed.ncbi.nlm.nih.gov/36350676/" className="text-primary hover:underline">36350676</a>.
              DOI:{" "}
              <a href="https://academic.oup.com/nar/article/51/D1/D1300/6814464?login=false" className="text-primary hover:underline">
                10.1093/nar/gkac966.
              </a>
              .{" "}
            </p>
            <p>
              FAVOR Full Database, DOI:{" "}
              <a href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/KFUBKG" className="text-primary hover:underline">
                10.7910/DVN/KFUBKG
              </a>
              . FAVOR Esssential Database, DOI:{" "}
              <a href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/1VGTJI" className="text-primary hover:underline">
                10.7910/DVN/1VGTJI
              </a>
              .
            </p>
            <p>
              <strong>2. STAAR </strong>{" "}
            </p>
            <p>
              Li X, Li Z, Zhou H, Gaynor SM, Liu Y, Chen H, Sun R, Dey R, Arnett
              DK, Aslibekyan S, Ballantyne CM, Bielak LF, Blangero J, Boerwinkle
              E, Bowden DW, Broome JG, Conomos MP, Correa A, Cupples LA, Curran
              JE, Freedman BI, Guo X, Hindy G, Irvin MR, Kardia SLR, Kathiresan
              S, Khan AT, Kooperberg CL, Laurie CC, Liu XS, Mahaney MC,
              Manichaikul AW, Martin LW, Mathias RA, McGarvey ST, Mitchell BD,
              Montasser ME, Moore JE, Morrison AC, O’Connell JR, Palmer ND,
              Pampana A, Peralta JM, Peyser PA, Psaty BM, Redline S, Rice KM,
              Rich SS, Smith JA, Tiwari HK, Tsai MY, Vasan RS, Wang FF, Weeks
              DE, Weng Z, Wilson JG, Yanek LR, NHLBI Trans-Omics for Precision
              Medicine (TOPMed) Consortium, TOPMed Lipids Working Group, Neale
              BM, Sunyaev SR, Abecasis GR, Rotter JI, Willer CJ, Peloso GM,
              Natarajan P, and Lin X.{" "}
              <strong>
                Dynamic incorporation of multiple in silico functional
                annotations empowers rare variant association analysis of large
                whole-genome sequencing studies at scale
              </strong>
              . <em>Nature Genetics</em> 2020; 52(9): 969-983. PMID:{" "}
              <a href="https://pubmed.ncbi.nlm.nih.gov/32839606/" className="text-primary hover:underline">32839606</a>.
              DOI:{" "}
              <a href="https://www.nature.com/articles/s41588-020-0676-4" className="text-primary hover:underline">
                10.1038/s41588-020-0676-4
              </a>
              .
            </p>
            <p>
              <strong>3. STAARpipeline </strong>{" "}
            </p>
            <p>
              Zilin Li*, Xihao Li*, Hufeng Zhou, Sheila M. Gaynor, Margaret S.
              Selvaraj, Theodore Arapoglou, Corbin Quick, Yaowu Liu, Han Chen,
              Ryan Sun, Rounak Dey, Donna K. Arnett, Lawrence F. Bielak, Joshua
              C. Bis, Thomas W. Blackwell, John Blangero, Eric Boerwinkle,
              Donald W. Bowden, Jennifer A. Brody, Brian E. Cade, Matthew P.
              Conomos, Adolfo Correa, L. Adrienne Cupples, Joanne E. Curran,
              Paul S. de Vries, Ravindranath Duggirala, Barry I. Freedman,
              Harald H. H. Göring, Xiuqing Guo, Rita R. Kalyani, Charles
              Kooperberg, Brian G. Kral, Leslie A. Lange, Ani Manichaikul, Lisa
              W. Martin, Braxton D. Mitchell, May E. Montasser, Alanna C.
              Morrison, Take Naseri, Jeffrey R. O’Connell, Nicholette D. Palmer,
              Patricia A. Peyser, Bruce M. Psaty, Laura M. Raffield, Susan
              Redline, Alexander P. Reiner, Muagututi‘a Sefuiva Reupena, Kenneth
              M. Rice, Stephen S. Rich, Jennifer A. Smith, Kent D. Taylor,
              Ramachandran S. Vasan, Daniel E. Weeks, James G. Wilson, Lisa R.
              Yanek, Wei Zhao, NHLBI Trans-Omics for Precision Medicine (TOPMed)
              Consortium, TOPMed Lipids Working Group, Jerome I. Rotter, Cristen
              J. Willer, Pradeep Natarajan, Gina M. Peloso, Xihong Lin.{" "}
              <strong>
                A framework for detecting noncoding rare variant associations of
                large-scale whole-genome sequencing studies.
              </strong>{" "}
              <em>Nature Methods</em> 19, 1599–1611 (2022) DOI:{" "}
              <a href="https://doi.org/10.1038/s41592-022-01640-x" className="text-primary hover:underline">
                s41592-022-01640-x
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
