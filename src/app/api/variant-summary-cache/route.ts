import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vcf = searchParams.get("vcf");

  if (!vcf) {
    return Response.json({ error: "VCF parameter required" }, { status: 400 });
  }

  try {
    const record = await prisma.variantSummary.findUnique({
      where: { vcf },
    });

    if (!record) {
      return Response.json({ exists: false });
    }

    return Response.json({
      exists: true,
      summary: record.summary,
      status: record.status,
      error: record.error,
      timestamp: record.updatedAt
    });
  } catch (error) {
    console.error("Error reading cache:", error);
    return Response.json({ error: "Failed to read cache" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { vcf, summary, status, error } = await req.json();

  if (!vcf) {
    return Response.json(
      { error: "VCF is required" },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.variantSummary.upsert({
      where: { vcf },
      update: {
        summary: summary || undefined,
        status: status || "completed",
        error: error || null,
      },
      create: {
        vcf,
        summary: summary || null,
        status: status || "pending",
        error: error || null,
      },
    });

    return Response.json({ success: true, timestamp: record.updatedAt });
  } catch (error) {
    console.error("Error writing cache:", error);
    return Response.json({ error: "Failed to write cache" }, { status: 500 });
  }
}
