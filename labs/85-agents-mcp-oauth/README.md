# Lab: OAuth-protected MCP server (Module 85, OSS flavor)

A real, runnable implementation of the auth pattern described in [Module 85's
"Authenticating agents and MCP servers"](../../site/src/pages/modules/85-agents/index.astro)
and shown as a code snippet in the site's [OSS flavor tab](../../site/src/data/flavors/oss.ts).
This is that snippet, promoted to an actual file you can run and test.

## What it demonstrates

An MCP tool server (`search_docs`) gated by an **OAuth 2.1 resource-server
check**: the agent never holds a long-lived API key. Instead it presents a
short-lived bearer token, and this server validates:

1. The token's signature (issued by an authorization server — Keycloak,
   Auth0, or anything else that signs JWTs)
2. The token hasn't expired
3. The token carries the specific scope this tool requires (`mcp:search_docs:read`)

A request that fails any of these is rejected (401/403) before the actual
tool logic ever runs.

## Run it

```bash
pip install -r requirements.txt
pytest -v
```

`test_mcp_server.py` generates its own RSA keypair and mints real signed
JWTs — no external identity provider needed to see the gate work. It proves:

- a validly scoped, unexpired token is **accepted**
- a token with the wrong scope is **rejected** (403)
- an expired token is **rejected** (401)
- a token missing entirely is **rejected** (422)
- a token signed by a different key (i.e. not actually from your
  authorization server) is **rejected** (401)

## Run the server itself

```bash
uvicorn mcp_server:app --reload
```

By default `mcp_server._public_key` is unset, so every request 500s until
you call `mcp_server.configure(public_key=...)` with your real
authorization server's signing key — normally fetched from its JWKS
endpoint at startup (see the `PyJWKClient` example in the site's Module 85
OSS snippet for the JWKS-fetching version of this same check).

## Wiring into a real deployment

Replace `run_module25_retrieval` with your actual Module 25 retrieval call,
and replace the hardcoded public key with a `PyJWKClient` pointed at your
authorization server, exactly as shown in the site's snippet. Everything
else — the scope check, the 401/403 behavior — is production-ready as-is.
