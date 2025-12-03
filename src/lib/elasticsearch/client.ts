import { Client } from "@elastic/elasticsearch";

if (!process.env.ES_HOST || !process.env.ES_USER || !process.env.ES_PASS) {
	throw new Error("Missing Elasticsearch environment variables");
}

const ES_HOST = process.env.ES_HOST;
const ES_USER = process.env.ES_USER;
const ES_PASS = process.env.ES_PASS;

class ElasticsearchClient {
	private client: Client;

	constructor() {
		this.client = new Client({
			node: ES_HOST,
			auth: {
				username: ES_USER,
				password: ES_PASS,
			},
			tls: {
				rejectUnauthorized: process.env.NODE_ENV === "production",
			},
			maxRetries: 3,
			requestTimeout: 10000,
			sniffOnStart: false,
		});
	}

	getClient(): Client {
		return this.client;
	}

	async healthCheck(): Promise<boolean> {
		try {
			const health = await this.client.cluster.health();
			return health.status !== "red";
		} catch {
			return false;
		}
	}
}

let esClient: ElasticsearchClient | null = null;

export function getElasticsearchClient(): Client {
	if (!esClient) {
		esClient = new ElasticsearchClient();
	}
	return esClient.getClient();
}
