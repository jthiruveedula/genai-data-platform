"""Module 85 (Agents & MCP) — a real, runnable OAuth-protected MCP tool server.

This is the working implementation behind the OSS flavor's code snippet on
the site (site/src/data/flavors/oss.ts, "85-agents"). It exposes one MCP
tool, search_docs, gated by an OAuth 2.1 resource-server check: the caller's
bearer token must carry a valid signature and the required scope, or the
call is rejected before the tool ever runs.

In production, the signing key comes from your authorization server's JWKS
endpoint (Keycloak, Auth0, ...) — see README.md. For this lab, the public
key is injected via `configure(public_key=...)` so the whole thing runs
fully offline, with no external identity provider required to try it or to
test it in CI.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
import jwt

app = FastAPI(title="GDP MCP Server — search_docs")

REQUIRED_SCOPE = "mcp:search_docs:read"
AUDIENCE = "gdp-mcp-server"
ALGORITHM = "RS256"

_public_key: str | None = None


def configure(public_key: str) -> None:
    """Set the RSA public key used to verify incoming bearer tokens.

    Call this once at startup with your authorization server's signing key
    (fetched from its JWKS endpoint). Tests call it with a locally generated
    keypair so no network access is needed to verify the auth gate works.
    """
    global _public_key
    _public_key = public_key


def verify_scoped_token(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="expected a Bearer token")
    if _public_key is None:
        raise HTTPException(status_code=500, detail="server not configured with a signing key")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, _public_key, algorithms=[ALGORITHM], audience=AUDIENCE)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"invalid token: {exc}")

    granted_scopes = claims.get("scope", "").split()
    if REQUIRED_SCOPE not in granted_scopes:
        raise HTTPException(status_code=403, detail=f"token missing required scope: {REQUIRED_SCOPE}")

    return claims


def run_module25_retrieval(query: str) -> dict:
    """Stand-in for the actual Module 25 retrieval call this lab doesn't
    reimplement — the point of this lab is the auth gate in front of it,
    not the retrieval logic (already covered in Module 25's own lab)."""
    return {"query": query, "chunks": [{"chunk_id": "doc-1#0", "text": "(retrieval result would appear here)"}]}


@app.post("/tools/search_docs")
def search_docs(query: str, claims: dict = Depends(verify_scoped_token)) -> dict:
    # `claims` is only reached if the bearer token is valid, unexpired, and
    # scoped — an expired or under-scoped token 403s/401s before this line.
    return run_module25_retrieval(query)
