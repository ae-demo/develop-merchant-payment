// Covers the gateway-signed assertion this service verifies on every `/me/*`
// call (`thunder-authentication` / `ballerina` skill: "Verify a package with
// gateway_assertion.bal in it"). Mints tokens against a throwaway RSA
// keypair (tests/resources/) and points GATEWAY_ASSERTION_CERTIFICATE at its
// self-signed certificate — nothing here talks to a real gateway or IdP.
//
// This contract has no `security: []` (public) operation — every `/me/*`
// path requires a scope — so the fourth case the skill describes ("a
// security: [] resource answers 200 with no assertion") is adapted to this
// contract's shape: a protected resource called with NO assertion header at
// all answers 401 from the resource's own `requireGatewayCaller`, since the
// gateway itself is not in this test's path.

import ballerina/http;
import ballerina/jwt;
import ballerina/test;

final http:Client testClient = check new ("http://localhost:9090");

isolated function mintAssertion(string keyFile, string issuer, string subject) returns string|error {
    jwt:IssuerConfig issuerConfig = {
        issuer,
        username: subject,
        customClaims: {
            "scope": "collections:read ledger:read settlements:read notifications:read notifications:acknowledge",
            "username": "merchant-login"
        },
        expTime: 300,
        signatureConfig: {
            config: {keyFile, keyPassword: ""}
        }
    };
    return jwt:issue(issuerConfig);
}

@test:Config {}
function testValidAssertionIsAccepted() returns error? {
    string issuer = "test-gateway";
    string token = check mintAssertion("tests/resources/test_private.key", issuer, "merchant-1");
    http:Response response = check testClient->get("/me/notifications", {"x-jwt-assertion": token});
    // Accepted by the interceptor: whatever the DB-backed resource answers
    // (ledger-db is not reachable in this test run), it must not be the
    // interceptor's own 401.
    test:assertNotEquals(response.statusCode, 401, "a validly-signed, current assertion must not be rejected");
}

@test:Config {}
function testAssertionSignedByAnotherKeyIs401() returns error? {
    string issuer = "test-gateway";
    string token = check mintAssertion("tests/resources/other_private.key", issuer, "merchant-1");
    http:Response response = check testClient->get("/me/notifications", {"x-jwt-assertion": token});
    test:assertEquals(response.statusCode, 401, "an assertion signed by a different key must be rejected");
}

@test:Config {}
function testTamperedAssertionIs401() returns error? {
    string issuer = "test-gateway";
    string token = check mintAssertion("tests/resources/test_private.key", issuer, "merchant-1");
    string[] parts = re `\.`.split(token);
    if parts.length() != 3 {
        test:assertFail("expected a three-part JWT");
    }
    string payload = parts[1];
    string flippedChar = payload.startsWith("A") ? "B" : "A";
    string tamperedPayload = flippedChar + payload.substring(1, payload.length());
    string tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];
    http:Response response = check testClient->get("/me/notifications", {"x-jwt-assertion": tamperedToken});
    test:assertEquals(response.statusCode, 401, "a payload edited after signing must never be treated as anonymous");
}

@test:Config {}
function testNoAssertionOnProtectedResourceIs401() returns error? {
    http:Response response = check testClient->get("/me/notifications");
    test:assertEquals(response.statusCode, 401, "a protected resource with no caller at all must refuse, not serve empty data");
}
