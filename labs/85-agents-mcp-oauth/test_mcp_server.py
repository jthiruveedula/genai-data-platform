"""Proves the auth gate actually works — not just that the code parses.

Generates a real RSA keypair, mints real signed JWTs (valid, wrong-scope,
and expired), and asserts the server accepts exactly the token it should.
No network access, no external identity provider — self-contained so it
runs the same in CI as on a laptop.
"""

from __future__ import annotations

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi.testclient import TestClient

import mcp_server


@pytest.fixture(scope="module")
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


@pytest.fixture(scope="module", autouse=True)
def configured_server(keypair):
    _, public_pem = keypair
    mcp_server.configure(public_key=public_pem)


@pytest.fixture()
def client():
    return TestClient(mcp_server.app)


def mint_token(private_pem: bytes, *, scope: str, expires_in: int = 300) -> str:
    now = int(time.time())
    payload = {
        "aud": mcp_server.AUDIENCE,
        "iat": now,
        "exp": now + expires_in,
        "scope": scope,
    }
    return jwt.encode(payload, private_pem, algorithm=mcp_server.ALGORITHM)


def test_valid_scoped_token_is_accepted(client, keypair):
    private_pem, _ = keypair
    token = mint_token(private_pem, scope="mcp:search_docs:read")

    response = client.post("/tools/search_docs", params={"query": "chunking strategy"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["query"] == "chunking strategy"


def test_missing_scope_is_rejected(client, keypair):
    private_pem, _ = keypair
    token = mint_token(private_pem, scope="mcp:some_other_tool:read")

    response = client.post("/tools/search_docs", params={"query": "x"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert "missing required scope" in response.json()["detail"]


def test_expired_token_is_rejected(client, keypair):
    private_pem, _ = keypair
    token = mint_token(private_pem, scope="mcp:search_docs:read", expires_in=-10)

    response = client.post("/tools/search_docs", params={"query": "x"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert "expired" in response.json()["detail"]


def test_missing_authorization_header_is_rejected(client):
    response = client.post("/tools/search_docs", params={"query": "x"})

    assert response.status_code == 422  # FastAPI: required header not supplied


def test_token_signed_by_a_different_key_is_rejected(client):
    other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    other_private_pem = other_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    token = mint_token(other_private_pem, scope="mcp:search_docs:read")

    response = client.post("/tools/search_docs", params={"query": "x"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert "invalid token" in response.json()["detail"]
