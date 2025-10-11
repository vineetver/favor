import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "Gene symbol required" }, { status: 400 });
  }

  try {
    const record = await prisma.geneSummary.findUnique({
      where: { symbol },
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
    console.error("Error reading gene cache:", error);
    return Response.json({ error: "Failed to read cache" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { symbol, summary, status, error } = await req.json();

  if (!symbol) {
    return Response.json(
      { error: "Gene symbol is required" },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.geneSummary.upsert({
      where: { symbol },
      update: {
        summary: summary || undefined,
        status: status || "completed",
        error: error || null,
      },
      create: {
        symbol,
        summary: summary || null,
        status: status || "pending",
        error: error || null,
      },
    });

    return Response.json({ success: true, timestamp: record.updatedAt });
  } catch (error) {
    console.error("Error writing gene cache:", error);
    return Response.json({ error: "Failed to write cache" }, { status: 500 });
  }
}
