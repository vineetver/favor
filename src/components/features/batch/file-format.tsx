import { ChevronsUpDown, FileIcon } from "lucide-react";
import { Note } from "@/components/ui/note";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export function FileFormat() {
  return (
    <div className="grid gap-8">
      <Collapsible>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-md bg-muted p-3">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">TSV (Tab-Separated Values)</h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              If you have a tab-separated file, you can upload it for batch
              annotation. The first 4 fields in the TSV file MUST be in the
              following order (additional fields will be ignored).
            </p>
            <div className="grid gap-2 py-2">
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM</li>
                <li>POS</li>
                <li>REF</li>
                <li>ALT</li>
              </ul>

              <p className="py-1 font-medium">Example TSV content:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                CHROM POS REF ALT{"\n"}1 1000 A T{"\n"}1 1001 G C
              </pre>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      <Collapsible>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-md bg-muted p-3">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">CSV (Comma-Separated Values)</h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              The first 4 fields in the CSV file MUST be in the following order
              (additional fields will be ignored).
            </p>
            <div className="grid gap-2 py-2">
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM</li>
                <li>POS</li>
                <li>REF</li>
                <li>ALT</li>
              </ul>

              <p className="py-1 font-medium">Example CSV content:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                CHROM,POS,REF,ALT{"\n"}1,1000,A,T{"\n"}1,1001,G,C
              </pre>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      <Collapsible>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-md bg-muted p-3">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">VCF (Vcard)</h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              You can directly upload a VCF file to annotate the variants. The
              VCF file should contain the information of the variants in the
              standard VCF format.{" "}
              <a
                href="https://samtools.github.io/hts-specs/VCFv4.2.pdf"
                className="text-primary hover:underline"
              >
                Learn more
              </a>
            </p>
            <div className="grid gap-2 py-2">
              <p>The first 5 fields in the VCF file should be:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM</li>
                <li>POS</li>
                <li>ID</li>
                <li>REF</li>
                <li>ALT</li>
              </ul>

              <p className="py-1 font-medium">Example VCF content:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                {`##fileformat=VCFv4.2
##contig=<ID=chr1,length=249250621>
#CHROM POS ID REF ALT QUAL FILTER INFO
1 1000 . A T 100 PASS .
1 1001 . G C 100 PASS .`}
              </pre>

              <Note>
                If your VCF file contains more than 5 fields, the additional
                fields will be ignored.
              </Note>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      <Collapsible>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-md bg-muted p-3">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">TXT (Plain Text)</h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              You can upload a plain text file with one variant per row
              separated by a &#39;-&#39;. This is our standard format for FAVOR and
              batch annotation. The first 4 fields in the TXT file MUST be:
            </p>
            <p className="text-sm text-muted-foreground">
              Note: When using HG19 assembly, RSID fields in uploaded files will be preserved in the results.
            </p>
            <div className="grid gap-2 py-2">
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM</li>
                <li>POS</li>
                <li>REF</li>
                <li>ALT</li>
              </ul>
              <p className="py-1 font-medium">Example TXT content:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                1-1000-A-T{"\n"}1-1001-G-C
              </pre>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

