import payment_collections_api.merchantidentity;

// Merchant identity, trading eligibility, payout account and credit limit are
// all owned by merchant-identity-service — this component never edits them.
// This function refreshes the local Merchant reference row (merchantId,
// country, currency) from that system, and hands back the full account so a
// caller that also needs tradingStatus/payoutAccount makes one call.

isolated function fetchAndCacheMerchantAccount(string merchantId) returns merchantidentity:MerchantAccount|error {
    merchantidentity:Client identityClient = check merchantIdentityClient();
    merchantidentity:MerchantAccount account = check identityClient->/merchants/[merchantId].get();
    check upsertMerchant(account.merchantId, account.country, account.currency);
    return account;
}
