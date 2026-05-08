import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { ApiClient } from "./api-client";
import { registerTools } from "./tools";

type Props = {
  authenticated: true;
  jwtToken: string;
};

export class PersonalTrainerMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Personal Trainer",
    version: "1.0.0",
  });

  async init() {
    const api = new ApiClient({
      API_URL: this.env.API_URL,
      jwtToken: this.props.jwtToken,
    });
    registerTools(this.server, api);
  }
}

function getHmacSecret(env: Env): string {
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

const AuthHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize" && request.method === "GET") {
      const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      if (!oauthReqInfo.clientId) {
        return new Response("Invalid OAuth request", { status: 400 });
      }

      const payload = btoa(JSON.stringify(oauthReqInfo));
      const signature = await hmacSign(payload, getHmacSecret(env));
      const stateParam = `${payload}.${signature}`;
      return new Response(loginPage(stateParam), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/authorize" && request.method === "POST") {
      const formData = await request.formData();
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const stateParam = formData.get("oauthState") as string;

      if (!stateParam || !stateParam.includes(".")) {
        return new Response("Invalid state", { status: 400 });
      }

      if (!username || !password) {
        return new Response(loginPage(stateParam, "Username and password are required"), {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Authenticate against the backend API
      let loginResult: { token: string; userId: string };
      try {
        const res = await fetch(`${env.API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Login failed" }));
          return new Response(loginPage(stateParam, (err as { error: string }).error || "Invalid credentials"), {
            status: 401,
            headers: { "Content-Type": "text/html" },
          });
        }
        loginResult = await res.json() as { token: string; userId: string };
      } catch {
        return new Response(loginPage(stateParam, "Could not reach the API server"), {
          status: 502,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Verify HMAC
      const dotIdx = stateParam.lastIndexOf(".");
      const statePayload = stateParam.slice(0, dotIdx);
      const stateSig = stateParam.slice(dotIdx + 1);

      if (!await hmacVerify(statePayload, stateSig, getHmacSecret(env))) {
        return new Response("Tampered state", { status: 400 });
      }

      const oauthReq = JSON.parse(atob(statePayload));

      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq,
        userId: loginResult.userId,
        scope: oauthReq.scope,
        props: { authenticated: true, jwtToken: loginResult.token } as Props,
        metadata: {
          label: `Personal Trainer (${username})`,
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
  input[type=text], input[type=password] { width: 100%; padding: 10px; margin: 6px 0 14px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
  label { font-size: 14px; font-weight: 500; color: #555; }
  button { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 6px; }
  button:hover { background: #1d4ed8; }
  .error { color: #dc2626; margin-bottom: 10px; }
</style>
</head>
<body>
  <h1>Personal Trainer MCP</h1>
  <p>Sign in to authorize Claude to access your workout data.</p>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
  <form method="POST">
    <input type="hidden" name="oauthState" value="${escapeHtml(oauthState)}">
    <label>Username</label>
    <input type="text" name="username" placeholder="Your username" required autofocus>
    <label>Password</label>
    <input type="password" name="password" placeholder="Your password" required>
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
