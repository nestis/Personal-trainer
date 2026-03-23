import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

interface Env {
  API_URL: string;
  API_PASSWORD: string;
  COOKIE_ENCRYPTION_KEY?: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
}
