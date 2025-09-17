import { NextRequest, NextResponse } from "next/server";
import { parseVariantsFromFile } from "@/lib/hg19/batch/parser";
import {
  processBatchAnnotation,
  formatBatchResults,
} from "@/lib/hg19/batch/processor";
import { BatchAnnotationRequest } from "@/lib/hg19/batch/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form data
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;
    const organization = formData.get("organization") as string;
    const coordinateSystem = formData.get("coordinate-system") as
      | "1-base"
      | "0-base";
    const outputFormat = formData.get("output-type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!email || !organization) {
      return NextResponse.json(
        { error: "Email and organization are required" },
        { status: 400 },
      );
    }

    // Generate unique sample ID
    const sampleId = `${organization}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Parse file content
    const fileContent = await file.text();
    const variants = parseVariantsFromFile(
      fileContent,
      file.type || "text/plain",
      sampleId,
    );

    if (variants.length === 0) {
      return NextResponse.json(
        { error: "No valid variants found in file" },
        { status: 400 },
      );
    }

    // Coordinate system adjustment (0-base to 1-base conversion if needed)
    if (coordinateSystem === "0-base") {
      variants.forEach((variant) => (variant.position += 1));
    }

    // Process batch annotation
    const result = await processBatchAnnotation(variants, sampleId);

    // Get annotated data from result
    const annotatedData = result.annotatedData;

    // Format results
    const format = outputFormat?.includes("json")
      ? "json"
      : outputFormat?.includes("tsv")
        ? "tsv"
        : "csv";

    const formattedResults = await formatBatchResults(annotatedData, format);

    // In a real implementation, you would:
    // 1. Queue the job for background processing
    // 2. Send an email when complete
    // 3. Store results in a file storage system
    // 4. Return a job ID for status checking

    const response = new NextResponse(formattedResults, {
      status: 200,
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json"
            : format === "tsv"
              ? "text/tab-separated-values"
              : "text/csv",
        "Content-Disposition": `attachment; filename="batch_annotation_${sampleId}.${format === "json" ? "json" : format}"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Batch annotation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
