const OPENTARGETS_API_BASE =
  "https://api.platform.opentargets.org/api/v4/graphql";

export interface OpenTargetsResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

export class OpenTargetsClient {
  private baseUrl: string;

  constructor(baseUrl: string = OPENTARGETS_API_BASE) {
    this.baseUrl = baseUrl;
  }

  async query<T>(
    query: string,
    variables?: Record<string, any>,
  ): Promise<T | null> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!response.ok) {
        console.error(
          `OpenTargets API error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const result: OpenTargetsResponse<T> = await response.json();

      if (result.errors && result.errors.length > 0) {
        console.error(
          `OpenTargets GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`,
        );
        // If there's partial data, still return it
        if (result.data) {
          return result.data;
        }
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("OpenTargets API request failed:", error);
      return null;
    }
  }
}

export const openTargetsClient = new OpenTargetsClient();
