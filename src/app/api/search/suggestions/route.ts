import type { NextRequest } from "next/server";
import type { ElasticsearchResponse } from "@/lib/search/api/elasticsearch";

export const dynamic = "force-dynamic";

const ES_HOST = process.env.ES_HOST;
const ES_USER = process.env.ES_USER;
const ES_PASS = process.env.ES_PASS;

if (!ES_HOST || !ES_USER || !ES_PASS) {
  throw new Error("Missing Elasticsearch environment variables");
}

const AUTH_HEADER = `Basic ${Buffer.from(`${ES_USER}:${ES_PASS}`).toString("base64")}`;

function inferTypeFromValue(value: string): string {
  if (value.startsWith("rs") && /^rs\d+$/i.test(value)) {
    return "rsid";
  }

  // Check for variant VCF format: chromosome-position-ref-alt
  if (/^(chr)?\d{1,2}|X|Y|MT?-\d+-[ATCG]+-[ATCG]+$/i.test(value)) {
    return "variant";
  }

  // Check for region format: chromosome-startPosition-endPosition
  if (/^(chr)?\d{1,2}|X|Y|MT?-\d+-\d+$/i.test(value)) {
    return "region";
  }

  return "gene";
}

export async function GET(req: NextRequest) {
  try {
    const prefix = req.nextUrl.searchParams.get("q");
    if (!prefix || prefix.length < 3) {
      return Response.json([]);
    }

    const esUrl = `${ES_HOST}/autocomplete_combined/_search`;
    const body = JSON.stringify({
      query: {
        bool: {
          should: [
            {
              term: {
                "value.exact": {
                  value: prefix.toLowerCase(),
                  boost: 100,
                },
              },
            },
            {
              match: {
                value: {
                  query: prefix.toLowerCase(),
                  boost: 10,
                },
              },
            },
            {
              prefix: {
                value: {
                  value: prefix.toLowerCase(),
                  boost: 70,
                },
              },
            },
          ],
        },
      },
      _source: ["value", "data"],
      sort: [
        {
          _score: {
            order: "desc",
          },
        },
      ],
    });

    const response = await fetch(esUrl, {
      method: "POST",
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      console.error(
        `Elasticsearch error: ${response.status} ${response.statusText}`,
      );
      return Response.json([], { status: 500 });
    }

    const data = (await response.json()) as ElasticsearchResponse;
    const hits = data.hits?.hits || [];

    const suggestions = hits.map((hit) => {
      const inferredType = inferTypeFromValue(hit._source.value);

      return {
        id: `${hit._id}`,
        value: hit._source.value,
        data: hit._source.data,
        type: inferredType,
        score: hit._score,
      };
    });

    return Response.json(suggestions);
  } catch (error) {
    console.error("Search API error:", error);
    return Response.json([], { status: 500 });
  }
}
