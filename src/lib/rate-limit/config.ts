export interface RateLimitConfig {
	identifier: string;
	limit: number;
	window: number;
}

export const RATE_LIMITS = {
	SEARCH_SUGGESTIONS: {
		limit: 30,
		window: 60,
	},
	SEARCH_SUBMIT: {
		limit: 10,
		window: 60,
	},
} as const;
