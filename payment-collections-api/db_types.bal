// Internal row shapes for the ledger-db tables, and the mapping from them
// into the OpenAPI response records the generated service returns.
//
// Every enum-shaped column is stored as its canonical string and narrowed
// back into the contract's string-literal union with a small mapper — this
// service is the only writer of these columns, so the value is always one of
// the canonical ones.

type MerchantRow record {|
    string merchantId;
    string country;
    string currency;
|};

type TransactionRow record {|
    string id;
    string merchantId;
    string channel;
    decimal amount;
    string currency;
    string status;
    string occurredAt;
    string? settlementId;
|};

type LedgerEntryRow record {|
    string id;
    string? transactionId;
    string? settlementId;
    string entryType;
    decimal amount;
    string currency;
    string createdAt;
|};

type SettlementRow record {|
    string id;
    string merchantId;
    string periodStart;
    string periodEnd;
    decimal grossAmount;
    decimal feeAmount;
    decimal netAmount;
    string currency;
    string status;
    string scheduledDate;
    string? paidAt;
    string? payoutReference;
|};

type NotificationRow record {|
    string id;
    string? settlementId;
    string message;
    string createdAt;
    string? readAt;
|};

type UnsettledAggregateRow record {|
    string merchantId;
    string currency;
    decimal grossAmount;
    int txnCount;
|};

isolated function toChannel(string s) returns "mobile_money"|"card" {
    if s == "card" {
        return "card";
    }
    return "mobile_money";
}

isolated function toTransactionStatus(string s) returns "collected"|"failed"|"reversed" {
    if s == "failed" {
        return "failed";
    }
    if s == "reversed" {
        return "reversed";
    }
    return "collected";
}

isolated function toCurrency(string s) returns "KES"|"NGN" {
    if s == "NGN" {
        return "NGN";
    }
    return "KES";
}

isolated function toEntryType(string s) returns "debit"|"credit" {
    if s == "debit" {
        return "debit";
    }
    return "credit";
}

isolated function toSettlementStatus(string s) returns "scheduled"|"withheld"|"paid"|"failed" {
    if s == "withheld" {
        return "withheld";
    }
    if s == "paid" {
        return "paid";
    }
    if s == "failed" {
        return "failed";
    }
    return "scheduled";
}

isolated function transactionFromRow(TransactionRow row) returns Transaction => {
    id: row.id,
    channel: toChannel(row.channel),
    amount: row.amount,
    currency: toCurrency(row.currency),
    status: toTransactionStatus(row.status),
    occurredAt: row.occurredAt
};

isolated function ledgerEntryFromRow(LedgerEntryRow row) returns LedgerEntry => {
    id: row.id,
    transactionId: row.transactionId,
    settlementId: row.settlementId,
    entryType: toEntryType(row.entryType),
    amount: row.amount,
    currency: toCurrency(row.currency),
    createdAt: row.createdAt
};

isolated function settlementFromRow(SettlementRow row) returns Settlement => {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    grossAmount: row.grossAmount,
    feeAmount: row.feeAmount,
    netAmount: row.netAmount,
    currency: toCurrency(row.currency),
    status: toSettlementStatus(row.status),
    scheduledDate: row.scheduledDate,
    paidAt: row.paidAt,
    payoutReference: row.payoutReference
};

isolated function notificationFromRow(NotificationRow row) returns Notification => {
    id: row.id,
    settlementId: row.settlementId,
    message: row.message,
    createdAt: row.createdAt,
    readAt: row.readAt
};
