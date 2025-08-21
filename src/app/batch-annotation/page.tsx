import React from "react";
import { Note } from "@/components/ui/note";
import { BatchForm } from "@/components/features/batch/batch-form";
import { FileFormat } from "@/components/features/batch/file-format";

export default async function Page()  {
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
            multiple variants for annotation. The file must be in plain text
            format with one variant per row. Once you submit the file, we will
            process it and email you when the results are ready.
          </p>
          <h4 className="text-title-lg">Estimated Processing Time</h4>
          <p>
            The processing time depends on the number of variants in your file.
            Here are some rough estimates:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="py-3 text-left font-medium">Variants</th>
                  <th className="py-3 text-left font-medium">Estimated Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">1 - 10,000 Variants</td>
                  <td className="py-3">A few minutes</td>
                </tr>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">10,000 to 100,000 Variants</td>
                  <td className="py-3">15 - 40 minutes</td>
                </tr>
                <tr className="border-b border-outline-variant">
                  <td className="py-3">500,000 to 1,000,000 Variants</td>
                  <td className="py-3">1 - 6 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Note>
            Please note that these are rough estimates and actual times may vary
            based on server load and other factors.
          </Note>
          <BatchForm />
        </div>
      </div>
    </div>
  );
}
