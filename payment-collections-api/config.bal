import ballerina/os;

// Every value here is read once, by name, in this one file. No other module
// calls os:getEnv directly. Every setting has a sensible fallback so the
// service starts with no required environment variables.

// --- ledger-db (platform-resource, postgres-mopay) ---
// Names match design.json's wiring.envBindings verbatim.
configurable string ledgerDbHost = os:getEnv("LEDGER_DB_HOST");
configurable string ledgerDbPortRaw = os:getEnv("LEDGER_DB_PORT");
configurable string ledgerDbDatabase = os:getEnv("LEDGER_DB_DATABASE");
configurable string ledgerDbUsername = os:getEnv("LEDGER_DB_USERNAME");
configurable string ledgerDbPassword = os:getEnv("LEDGER_DB_PASSWORD");

final int ledgerDbPort = resolveIntEnv(ledgerDbPortRaw, 5432);

// --- payment-gateway (external, Flutterwave-shaped, ASSUMED interface) ---
configurable string flutterwaveBaseUrlRaw = os:getEnv("FLUTTERWAVE_BASE_URL");
configurable string flutterwaveSecretKey = os:getEnv("FLUTTERWAVE_SECRET_KEY");

final string flutterwaveBaseUrl = flutterwaveBaseUrlRaw.trim() == ""
    ? "https://api.flutterwave.com/v3"
    : trimTrailingSlash(flutterwaveBaseUrlRaw.trim());

// --- merchant-identity-service (external, ASSUMED interface) ---
configurable string merchantIdentityBaseUrlRaw = os:getEnv("MERCHANT_IDENTITY_BASE_URL");
configurable string merchantIdentityApiKey = os:getEnv("MERCHANT_IDENTITY_API_KEY");

final string merchantIdentityBaseUrl = trimTrailingSlash(merchantIdentityBaseUrlRaw.trim());

// --- settlement business rules: not platform-wired, so these are OUR OWN
// config with sensible defaults, each overridable by an env var. The PRD
// leaves the exact fee percentage unstated; 1.5% is this component's own
// named default.
final decimal settlementFeePercent = resolveDecimalEnv(os:getEnv("SETTLEMENT_FEE_PERCENT"), 1.5d);
final int settlementRunHourUtc = resolveIntEnv(os:getEnv("SETTLEMENT_RUN_HOUR_UTC"), 0);
final int settlementRunMinuteUtc = resolveIntEnv(os:getEnv("SETTLEMENT_RUN_MINUTE_UTC"), 0);

isolated function resolveIntEnv(string envValue, int fallback) returns int {
    string trimmed = envValue.trim();
    if trimmed == "" {
        return fallback;
    }
    int|error parsed = int:fromString(trimmed);
    if parsed is error {
        return fallback;
    }
    return parsed;
}

isolated function resolveDecimalEnv(string envValue, decimal fallback) returns decimal {
    string trimmed = envValue.trim();
    if trimmed == "" {
        return fallback;
    }
    decimal|error parsed = decimal:fromString(trimmed);
    if parsed is error {
        return fallback;
    }
    return parsed;
}

// An injected base URL may end in "/" — join a path onto it rather than
// concatenating strings.
isolated function trimTrailingSlash(string url) returns string {
    if url.endsWith("/") {
        return url.substring(0, url.length() - 1);
    }
    return url;
}
