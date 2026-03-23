import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { ApiClient } from "./api-client";
import { registerTools } from "./tools";

type Props = {
  authenticated: true;
};

export class PersonalTrainerMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Personal Trainer",
    version: "1.0.0",
  });

  async init() {
    const api = new ApiClient({
      API_URL: this.env.API_URL,
      API_PASSWORD: this.env.API_PASSWORD,
    });
    registerTools(this.server, api);
  }
}

// HMAC helpers for integrity-protecting the OAuth state round-trip
function getHmacSecret(env: Env): string {
  // COOKIE_ENCRYPTION_KEY is preferred; fall back to API_PASSWORD
  return env.COOKIE_ENCRYPTION_KEY || env.API_PASSWORD;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// Simple password-based auth handler for single-user app
const AuthHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize" && request.method === "GET") {
      const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      if (!oauthReqInfo.clientId) {
        return new Response("Invalid OAuth request", { status: 400 });
      }

      // Encode OAuth request info as base64 + HMAC to prevent tampering
      const payload = btoa(JSON.stringify(oauthReqInfo));
      const signature = await hmacSign(payload, getHmacSecret(env));
      const stateParam = `${payload}.${signature}`;
      return new Response(loginPage(stateParam), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/authorize" && request.method === "POST") {
      const formData = await request.formData();
      const password = formData.get("password") as string;
      const stateParam = formData.get("oauthState") as string;

      if (!stateParam || !stateParam.includes(".")) {
        return new Response("Invalid state", { status: 400 });
      }

      if (password !== env.API_PASSWORD) {
        return new Response(loginPage(stateParam, "Invalid password"), {
          status: 401,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Verify HMAC to ensure state hasn't been tampered with
      const dotIdx = stateParam.lastIndexOf(".");
      const payload = stateParam.slice(0, dotIdx);
      const signature = stateParam.slice(dotIdx + 1);

      if (!await hmacVerify(payload, signature, getHmacSecret(env))) {
        return new Response("Tampered state", { status: 400 });
      }

      const oauthReq = JSON.parse(atob(payload));

      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq,
        userId: "owner",
        scope: oauthReq.scope,
        props: { authenticated: true } as Props,
        metadata: {
          label: "Personal Trainer",
        },
      });

      return Response.redirect(redirectTo, 302);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        `<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;text-align:center">
          <h1>Personal Trainer MCP Server</h1>
          <p>This is a remote MCP server. Connect to it from Claude.ai via Settings &rarr; Integrations.</p>
          <p>MCP endpoint: <code>${url.origin}/mcp</code></p>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

function loginPage(oauthState: string, error?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize – Personal Trainer MCP</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 400px; margin: 80px auto; padding: 0 20px; }
  h1 { font-size: 1.4em; }
  input[type=password] { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
  button { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .error { color: #dc2626; margin-bottom: 10px; }
</style>
</head>
<body>
  <h1>Personal Trainer MCP</h1>
  <p>Enter your app password to authorize Claude to access your workout data.</p>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
  <form method="POST">
    <input type="hidden" name="oauthState" value="${escapeHtml(oauthState)}">
    <input type="password" name="password" placeholder="App password" required autofocus>
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export default new OAuthProvider({
  apiHandler: PersonalTrainerMCP.serve("/mcp"),
  apiRoute: "/mcp",
  defaultHandler: AuthHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
