import React from "react";
import { Note } from "@/components/ui/note";
import { BatchForm } from "@/components/features/batch/batch-form";
import { FileFormat } from "@/components/features/batch/file-format";

export default async function Page() {
  return (
    <div className="">
      <div className="mx-auto max-w-2xl">
        <h1 className="mt-2 text-headline-md sm:text-display-sm">
          Batch Annotation
        </h1>
        <div className="mt-6 space-y-6 text-left">
          <h4 className="text-title-lg">File Format</h4>
          <FileFormat />

          <h4 className="text-title-lg">Get Started</h4>
          <p>
            The batch annotation feature allows you to submit a file with
            multiple variants for annotation using HG38 genome assembly. You can now use
            <strong> wildcard queries</strong> to retrieve all variants at a position
            or with specific alleles. Results will be emailed to you when processing
            is complete. The file must be in plain text format with one variant per row.
          </p>
          <h4 className="text-title-lg">Estimated Processing Time</h4>
          <p>
            The processing time depends on the number of input lines in your file:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="py-3 text-left font-medium">Input Lines</th>
                  <th className="py-3 text-left font-medium">Processing Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">1 - 10,000 Lines</td>
                  <td className="py-3">A few minutes</td>
                </tr>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">10,000 to 100,000 Lines</td>
                  <td className="py-3">15 - 40 minutes</td>
                </tr>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">500,000 to 1,000,000 Lines</td>
                  <td className="py-3">1 - 6 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Note>
            <strong>Note:</strong> Wildcard queries return multiple variants per input line
            and may take longer to process. Processing times may vary based on server load,
            the number of wildcard queries, and the size of result sets.
          </Note>
          <BatchForm />
        </div>
      </div>
    </div>
  );
}
