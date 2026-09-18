// mockEnv carries exactly the keys the platform emits for this component's
// thunder-auth dependency (react-webapp Constraints) — nothing a sibling
// service's address would need, since payment-collections-api is same-origin
// /api.
export const mockEnv = {
  THUNDER_AUTH_CLIENT_ID: "mock-client",
  THUNDER_AUTH_ISSUER: "https://mock-idp.test",
  // No THUNDER_AUTH_JWKS_URL: the browser never validates a token, so
  // src/env.ts does not declare it and mock mode does not carry it either.
  THUNDER_AUTH_SCOPES:
    "openid profile email group ou collections:read ledger:read settlements:read notifications:read notifications:acknowledge",
  THUNDER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
