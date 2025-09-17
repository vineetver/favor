import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { essential, full } from "@/lib/utils/dataset";
import { cn } from "@/lib/utils/general";

const status: { [key: string]: string } = {
  CSV: "bg-green-100 text-green-800 border-green-200",
  SQL: "bg-blue-100 text-blue-800 border-blue-200",
};

export default async function Page() {
  return (
    <>
      <div className="relative">
        <div className="mx-auto max-w-3xl">
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            FAVOR Annotator
          </h1>
          <div className="mt-6 space-y-6 text-left">
            <p>
              FAVORannotator is an open source R program{" "}
              <a
                href="https://github.com/zhouhufeng/FAVORannotator"
                className="text-primary hover:underline"
              >
                GitHub
              </a>{" "}
              for performing offline functional annotation of whole-genome/
              whole-exome sequencing (WGS/WES) studies using{" "}
              <a
                href="https://academic.oup.com/nar/article/51/D1/D1300/6814464"
                className="text-primary hover:underline"
              >
                FAVOR
              </a>{" "}
              database. It combines the functional annotation data with the
              input genotype data (VCF) to create an all-in-one aGDS file. The
              aGDS format allows for both the genotype and functional annotation
              data to be contained in a single file.
            </p>
            <p>
              It converts a genotype VCF input file into a GDS file, searches
              the variants in the GDS file using the FAVOR database for their
              functional annotations (in PostgreSQL), and then integrates these
              annotations into the GDS file to create an aGDS file. This aGDS
              file allows both genotype and functional annotation data to be
              stored in a single file.
            </p>
            <p>
              FAVORannotator can be conveniently integrated into the
              STAARpipeline (
              <a
                href="https://github.com/xihaoli/STAARpipeline"
                className="text-primary hover:underline"
              >
                GitHub
              </a>{" "}
              |{" "}
              <a
                href="https://www.nature.com/articles/s41592-022-01640-x"
                className="text-primary hover:underline"
              >
                Paper
              </a>
              ), a rare variant association analysis tool for WGS/WES studies,
              to perform association analysis of large-scale genetic data.
            </p>
            <p>
              FAVORannotator&apos;s database (containing 20 essential annotation
              scores) can be downloaded from the following links:
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl">
        <div className="mt-8 flow-root">
          <div className="-my-2 overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <Tabs defaultValue="essential">
                <TabsList className="mb-4">
                  <TabsTrigger value="essential">Essential Table</TabsTrigger>
                  <TabsTrigger value="full">Full Table</TabsTrigger>
                </TabsList>
                <TabsContent value="essential">
                  <div className="mt-6">
                    <DatasetTable dataset={essential} />
                  </div>
                </TabsContent>
                <TabsContent value="full">
                  <div className="mt-6">
                    <DatasetTable dataset={full} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DatasetTable({
  dataset,
}: {
  dataset: {
    kind: string;
    files: { name: string; size: string; link: string }[];
  }[];
}) {
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="text-left normal-case text-sm font-medium">
            Filename
          </TableHead>
          <TableHead className="text-left normal-case">Filesize</TableHead>
          <TableHead className="text-right normal-case">
            Harvard Dataverse
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataset.map(
          (items: {
            kind: string;
            files: { name: string; size: string; link: string }[];
          }) => (
            <>
              {items.files?.map((file, index) => (
                <TableRow key={file.name + index} className="overflow-x-scroll">
                  <TableCell>
                    <div className="flex items-start gap-x-3">
                      <div className="font-medium leading-6">{file.name}</div>
                      <div
                        className={cn(
                          status[items.kind],
                          "rounded-md px-2 py-1 text-xs font-medium border",
                        )}
                      >
                        {items.kind}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">{file.size}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Link href={file.link} className="text-primary">
                      Download
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </>
          ),
        )}
      </TableBody>
    </Table>
  );
}
