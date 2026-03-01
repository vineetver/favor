export interface ApiKeyItem {
  id: string;
  token_prefix: string;
  label: string;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface CreateApiKeyRequest {
  label: string;
  expires_in_days?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  token: string;
  label: string;
  token_prefix: string;
  expires_at: string | null;
}
