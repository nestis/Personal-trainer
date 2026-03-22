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

// Simple password-based auth handler for single-user app
const AuthHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize" && request.method === "GET") {
      // Parse the OAuth authorization request from query params
      const oauthReqInfo = await (env as any).OAUTH_PROVIDER.parseAuthRequest(request);
      if (!oauthReqInfo.clientId) {
        return new Response("Invalid OAuth request", { status: 400 });
      }

      // Encode OAuth request info as base64 for round-tripping through the form
      const stateParam = btoa(JSON.stringify(oauthReqInfo));
      return new Response(loginPage(stateParam), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/authorize" && request.method === "POST") {
      const formData = await request.formData();
      const password = formData.get("password") as string;
      const stateParam = formData.get("oauthState") as string;

      if (password !== env.API_PASSWORD) {
        return new Response(loginPage(stateParam, "Invalid password"), {
          status: 401,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Decode the OAuth request info preserved from the GET request
      const oauthReq = JSON.parse(atob(stateParam));

      // Password correct — complete OAuth authorization
      const { redirectTo } = await (env as any).OAUTH_PROVIDER.completeAuthorization({
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

    // Fallback: show a landing page
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        `<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;text-align:center">
          <h1>Personal Trainer MCP Server</h1>
          <p>This is a remote MCP server. Connect to it from Claude.ai via Settings → Integrations.</p>
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Wire it all together
export default new OAuthProvider({
  apiHandler: PersonalTrainerMCP.serve("/mcp"),
  apiRoute: "/mcp",
  defaultHandler: AuthHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
