import payment_collections_api.paymentgateway;
import ballerina/log;
import ballerina/time;
import ballerina/uuid;

# Records one customer collection notified by payment-gateway (mobile money
# or card).
#
# This component's own openapi.yaml exposes only the merchant's `/me/*` read
# views — it declares no inbound webhook path — and the assumed
# payment-gateway contract itself offers no "list new transactions" endpoint
# to poll, only a per-id verify. So this function is the ingestion boundary a
# real trigger (a gateway webhook, or a queue consumer reading
# payment-gateway's own notifications) would call once it learns a
# `gatewayTransactionId` was raised for a `merchantId`. It is intentionally
# not wired to any scheduler or HTTP route here — the task's instruction is
# not to invent a public endpoint beyond the contract, and there is no
# documented way for this service to discover a new collection on its own.
#
# Verifies the collection with payment-gateway, then posts the Transaction
# and its debit/credit ledger entry pair: a credit increasing the merchant's
# collected balance, and the offsetting debit against the gateway's
# clearing/in-transit position for the same amount, so the pair always
# balances.
#
# + merchantId - the merchant the collection belongs to
# + gatewayTransactionId - payment-gateway's own transaction id to verify
# + return - the recorded transaction's id, or an error
public isolated function ingestCollection(string merchantId, string gatewayTransactionId) returns string|error {
    paymentgateway:Client gatewayClient = check paymentGatewayClient();
    paymentgateway:inline_response_200 verification = check gatewayClient->/transactions/[gatewayTransactionId]/verify.get();
    paymentgateway:Transaction? gatewayTxn = verification?.data;
    if gatewayTxn is () {
        return error("payment-gateway returned no transaction data for gateway id " + gatewayTransactionId);
    }
    string gatewayStatus = gatewayTxn?.status ?: "";
    if gatewayStatus == "pending" {
        return error("collection " + gatewayTransactionId + " is still pending at the gateway");
    }
    string status = gatewayStatus == "successful" ? "collected" : "failed";
    decimal amount = gatewayTxn?.amount ?: 0d;
    string currency = gatewayTxn?.currency ?: "";
    string paymentType = gatewayTxn?.payment_type ?: "";
    string channel = paymentType.toLowerAscii().includes("card") ? "card" : "mobile_money";
    string occurredAt = gatewayTxn?.created_at ?: time:utcToString(time:utcNow());

    string txnId = uuid:createRandomUuid();
    string createdAt = time:utcToString(time:utcNow());
    TransactionRow row = {
        id: txnId,
        merchantId,
        channel,
        amount,
        currency,
        status,
        occurredAt,
        settlementId: ()
    };
    check insertTransaction(row, gatewayTransactionId, createdAt);

    if status == "collected" {
        check insertLedgerEntry({
            id: uuid:createRandomUuid(),
            transactionId: txnId,
            settlementId: (),
            entryType: "credit",
            amount,
            currency,
            createdAt
        }, merchantId);
        check insertLedgerEntry({
            id: uuid:createRandomUuid(),
            transactionId: txnId,
            settlementId: (),
            entryType: "debit",
            amount,
            currency,
            createdAt
        }, merchantId);
    }
    log:printInfo("collection ingested", merchantId = merchantId, transactionId = txnId, status = status);
    return txnId;
}
