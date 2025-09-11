const OPENTARGETS_API_BASE = 'https://api.platform.opentargets.org/api/v4/graphql';

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

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenTargets API error: ${response.status} ${response.statusText}`);
    }

    const result: OpenTargetsResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }
}

export const openTargetsClient = new OpenTargetsClient();