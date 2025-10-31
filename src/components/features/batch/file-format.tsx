import { ChevronsUpDown, FileIcon, Sparkles } from "lucide-react";
import { Note } from "@/components/ui/note";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export function FileFormat() {
  return (
    <div className="grid gap-8">
      <Collapsible defaultOpen>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-md bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              Wildcard Queries (New Feature)
            </h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="space-y-4">
              <p>
                You can now query multiple variants at once using wildcard patterns.
                This is useful when you want to retrieve all variants at a specific
                position or all variants with a specific allele.
              </p>

              <div className="rounded-lg bg-muted p-4 space-y-3">
                <h4 className="font-semibold">Supported Query Patterns:</h4>

                <div className="space-y-2">
                  <div>
                    <code className="text-sm bg-background px-2 py-1 rounded">chr pos</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Returns all variants at the specified position
                    </p>
                  </div>

                  <div>
                    <code className="text-sm bg-background px-2 py-1 rounded">chr pos ref</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Returns all alternate alleles for the specified reference
                    </p>
                  </div>

                  <div>
                    <code className="text-sm bg-background px-2 py-1 rounded">chr pos * alt</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Returns all reference alleles for the specified alternate
                    </p>
                  </div>

                  <div>
                    <code className="text-sm bg-background px-2 py-1 rounded">chr pos ref *</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Returns all alternate alleles for the specified reference
                    </p>
                  </div>

                  <div>
                    <code className="text-sm bg-background px-2 py-1 rounded">chr pos ref alt</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Returns exact match (original behavior)
                    </p>
                  </div>
                </div>
              </div>

              <Note>
                <strong>Performance Note:</strong> Wildcard queries may return multiple
                results per input line and take slightly longer to process than exact
                matches. For best performance with large files, use exact matches when
                possible.
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
            <h3 className="text-lg font-semibold">
              TSV (Tab-Separated Values)
            </h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              If you have a tab-separated file, you can upload it for batch
              annotation. Files can contain 2-4 fields for flexible querying.
              The fields MUST be in the following order (additional fields will be ignored).
            </p>
            <div className="grid gap-2 py-2">
              <p className="font-medium">Required Fields (minimum 2):</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM (required)</li>
                <li>POS (required)</li>
                <li>REF (optional - omit for wildcard)</li>
                <li>ALT (optional - omit for wildcard, or use * for wildcard)</li>
              </ul>

              <p className="py-1 font-medium">Example TSV content with wildcards:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                {`CHROM\tPOS\tREF\tALT
1\t10001\tA\tT
1\t10002
1\t10003\tA
1\t10004\t*\tT
1\t10005\tG\t*`}
              </pre>

              <p className="py-1 font-medium">What each line returns:</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                <li>Line 1: Exact match for variant 1:10001:A:T</li>
                <li>Line 2: All variants at position 1:10002</li>
                <li>Line 3: All ALT variants with REF=A at 1:10003</li>
                <li>Line 4: All REF variants with ALT=T at 1:10004</li>
                <li>Line 5: All ALT variants with REF=G at 1:10005</li>
              </ul>
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
            <h3 className="text-lg font-semibold">
              CSV (Comma-Separated Values)
            </h3>
            <CollapsibleTrigger className="ml-auto">
              <ChevronsUpDown className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p>
              Files can contain 2-4 fields for flexible querying. The fields MUST be
              in the following order (additional fields will be ignored).
            </p>
            <div className="grid gap-2 py-2">
              <p className="font-medium">Required Fields (minimum 2):</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM (required)</li>
                <li>POS (required)</li>
                <li>REF (optional - omit for wildcard)</li>
                <li>ALT (optional - omit for wildcard, or use * for wildcard)</li>
              </ul>

              <p className="py-1 font-medium">Example CSV content with wildcards:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                {`CHROM,POS,REF,ALT
1,10001,A,T
1,10002
1,10003,A
1,10004,*,T
1,10005,G,*`}
              </pre>

              <p className="py-1 font-medium">What each line returns:</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                <li>Line 1: Exact match for variant 1:10001:A:T</li>
                <li>Line 2: All variants at position 1:10002</li>
                <li>Line 3: All ALT variants with REF=A at 1:10003</li>
                <li>Line 4: All REF variants with ALT=T at 1:10004</li>
                <li>Line 5: All ALT variants with REF=G at 1:10005</li>
              </ul>
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
              You can directly upload a VCF file to annotate variants. VCF files can
              now contain 3-5 fields for flexible querying (the ID field is required but
              can be &apos;.&apos; for unknown).{" "}
              <a
                href="https://samtools.github.io/hts-specs/VCFv4.2.pdf"
                className="text-primary hover:underline"
              >
                Learn more
              </a>
            </p>
            <div className="grid gap-2 py-2">
              <p className="font-medium">Required Fields (minimum 3):</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM (required)</li>
                <li>POS (required)</li>
                <li>ID (required - use &apos;.&apos; if unknown)</li>
                <li>REF (optional - omit for wildcard)</li>
                <li>ALT (optional - omit for wildcard, or use * for wildcard)</li>
              </ul>

              <p className="py-1 font-medium">Example VCF content with wildcards:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                {`##fileformat=VCFv4.2
##contig=<ID=chr1,length=249250621>
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
1\t10001\trs123\tA\tT\t100\tPASS\t.
1\t10002\t.
1\t10003\t.\tA
1\t10004\t.\t*\tT
1\t10005\t.\tG\t*`}
              </pre>

              <p className="py-1 font-medium">What each line returns:</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                <li>Line 1: Exact match for variant 1:10001:A:T</li>
                <li>Line 2: All variants at position 1:10002</li>
                <li>Line 3: All ALT variants with REF=A at 1:10003</li>
                <li>Line 4: All REF variants with ALT=T at 1:10004</li>
                <li>Line 5: All ALT variants with REF=G at 1:10005</li>
              </ul>

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
              You can upload a plain text file with variants separated by &apos;-&apos;.
              Files can contain 2-4 fields for flexible wildcard querying.
            </p>
            <p className="text-sm text-muted-foreground">
              Note: When using HG19 assembly, RSID fields in uploaded files will
              be preserved in the results.
            </p>
            <div className="grid gap-2 py-2">
              <p className="font-medium">Required Fields (minimum 2):</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>CHROM (required)</li>
                <li>POS (required)</li>
                <li>REF (optional - omit for wildcard)</li>
                <li>ALT (optional - omit for wildcard, or use * for wildcard)</li>
              </ul>

              <p className="py-1 font-medium">Example TXT content with wildcards:</p>
              <pre className="rounded-md bg-muted p-4 font-mono text-sm">
                {`1-10001-A-T
1-10002
1-10003-A
1-10004-*-T
1-10005-G-*`}
              </pre>

              <p className="py-1 font-medium">What each line returns:</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                <li>Line 1: Exact match for variant 1:10001:A:T</li>
                <li>Line 2: All variants at position 1:10002</li>
                <li>Line 3: All ALT variants with REF=A at 1:10003</li>
                <li>Line 4: All REF variants with ALT=T at 1:10004</li>
                <li>Line 5: All ALT variants with REF=G at 1:10005</li>
              </ul>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
