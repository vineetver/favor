import { aggregate } from "@features/platform-status/aggregate";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  const status = await aggregate();
  return Response.json(status, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
