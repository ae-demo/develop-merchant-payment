import ballerina/sql;
import ballerinax/postgresql;

// --- merchants (local reference row) ---

isolated function upsertMerchant(string merchantId, string country, string currency) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        INSERT INTO merchants (merchant_id, country, currency)
        VALUES (${merchantId}, ${country}, ${currency})
        ON CONFLICT (merchant_id) DO UPDATE SET country = EXCLUDED.country, currency = EXCLUDED.currency
    `);
}

isolated function getMerchantRow(string merchantId) returns MerchantRow?|error {
    postgresql:Client dbClient = check ledgerDb();
    MerchantRow|error result = dbClient->queryRow(`
        SELECT merchant_id AS "merchantId", country, currency
        FROM merchants WHERE merchant_id = ${merchantId}
    `);
    if result is error {
        if isNoRows(result) {
            return ();
        }
        return result;
    }
    return result;
}

// --- transactions ---

isolated function insertTransaction(TransactionRow row, string gatewayTransactionId, string createdAt) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        INSERT INTO transactions
            (id, merchant_id, channel, amount, currency, status, occurred_at, gateway_transaction_id, settlement_id, created_at)
        VALUES
            (${row.id}, ${row.merchantId}, ${row.channel}, ${row.amount}, ${row.currency}, ${row.status},
             ${row.occurredAt}, ${gatewayTransactionId}, ${row.settlementId}, ${createdAt})
    `);
}

isolated function countTransactionsByMerchant(string merchantId, string? channel, string? status) returns int|error {
    postgresql:Client dbClient = check ledgerDb();
    sql:ParameterizedQuery q = `SELECT COUNT(*) AS cnt FROM transactions WHERE merchant_id = ${merchantId}`;
    if channel is string {
        q = sql:queryConcat(q, ` AND channel = ${channel}`);
    }
    if status is string {
        q = sql:queryConcat(q, ` AND status = ${status}`);
    }
    record {| int cnt; |} result = check dbClient->queryRow(q);
    return result.cnt;
}

isolated function listTransactionsByMerchant(string merchantId, int 'limit, int offset, string? channel, string? status)
        returns TransactionRow[]|error {
    postgresql:Client dbClient = check ledgerDb();
    sql:ParameterizedQuery q = `SELECT id, merchant_id AS "merchantId", channel, amount, currency, status,
            occurred_at AS "occurredAt", settlement_id AS "settlementId"
        FROM transactions WHERE merchant_id = ${merchantId}`;
    if channel is string {
        q = sql:queryConcat(q, ` AND channel = ${channel}`);
    }
    if status is string {
        q = sql:queryConcat(q, ` AND status = ${status}`);
    }
    q = sql:queryConcat(q, ` ORDER BY occurred_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    stream<TransactionRow, sql:Error?> resultStream = dbClient->query(q);
    TransactionRow[] rows = [];
    check from TransactionRow row in resultStream
        do {
            rows.push(row);
        };
    return rows;
}

isolated function getTransactionByIdForMerchant(string id, string merchantId) returns TransactionRow?|error {
    postgresql:Client dbClient = check ledgerDb();
    TransactionRow|error result = dbClient->queryRow(`
        SELECT id, merchant_id AS "merchantId", channel, amount, currency, status,
               occurred_at AS "occurredAt", settlement_id AS "settlementId"
        FROM transactions WHERE id = ${id} AND merchant_id = ${merchantId}
    `);
    if result is error {
        if isNoRows(result) {
            return ();
        }
        return result;
    }
    return result;
}

// The merchant ids with at least one collected transaction not yet folded
// into a settlement — the daily job's worklist.
isolated function merchantIdsWithUnsettledTransactions() returns string[]|error {
    postgresql:Client dbClient = check ledgerDb();
    stream<record {| string merchantId; |}, sql:Error?> resultStream = dbClient->query(`
        SELECT DISTINCT merchant_id AS "merchantId" FROM transactions
        WHERE status = 'collected' AND settlement_id IS NULL
    `);
    string[] ids = [];
    check from record {| string merchantId; |} row in resultStream
        do {
            ids.push(row.merchantId);
        };
    return ids;
}

// Aggregates a merchant's un-settled collected transactions (mobile money and
// card together — never split by channel) into the single gross figure and
// the id list the settlement will consume.
isolated function unsettledCollectionsForMerchant(string merchantId)
        returns record {| decimal grossAmount; string currency; string[] transactionIds; |}|error {
    postgresql:Client dbClient = check ledgerDb();
    stream<record {| string id; decimal amount; string currency; |}, sql:Error?> resultStream = dbClient->query(`
        SELECT id, amount, currency FROM transactions
        WHERE merchant_id = ${merchantId} AND status = 'collected' AND settlement_id IS NULL
    `);
    decimal gross = 0d;
    string currency = "";
    string[] ids = [];
    check from record {| string id; decimal amount; string currency; |} row in resultStream
        do {
            gross += row.amount;
            currency = row.currency;
            ids.push(row.id);
        };
    return {grossAmount: gross, currency, transactionIds: ids};
}

isolated function markTransactionsSettled(string[] transactionIds, string settlementId) returns error? {
    if transactionIds.length() == 0 {
        return;
    }
    postgresql:Client dbClient = check ledgerDb();
    foreach string txnId in transactionIds {
        _ = check dbClient->execute(`
            UPDATE transactions SET settlement_id = ${settlementId} WHERE id = ${txnId}
        `);
    }
}

// --- ledger entries ---

isolated function insertLedgerEntry(LedgerEntryRow row, string merchantId) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        INSERT INTO ledger_entries (id, merchant_id, transaction_id, settlement_id, entry_type, amount, currency, created_at)
        VALUES (${row.id}, ${merchantId}, ${row.transactionId}, ${row.settlementId}, ${row.entryType}, ${row.amount}, ${row.currency}, ${row.createdAt})
    `);
}

isolated function countLedgerEntriesByMerchant(string merchantId) returns int|error {
    postgresql:Client dbClient = check ledgerDb();
    record {| int cnt; |} result = check dbClient->queryRow(`
        SELECT COUNT(*) AS cnt FROM ledger_entries WHERE merchant_id = ${merchantId}
    `);
    return result.cnt;
}

isolated function listLedgerEntriesByMerchant(string merchantId, int 'limit, int offset) returns LedgerEntryRow[]|error {
    postgresql:Client dbClient = check ledgerDb();
    stream<LedgerEntryRow, sql:Error?> resultStream = dbClient->query(`
        SELECT id, transaction_id AS "transactionId", settlement_id AS "settlementId",
               entry_type AS "entryType", amount, currency, created_at AS "createdAt"
        FROM ledger_entries WHERE merchant_id = ${merchantId}
        ORDER BY created_at DESC LIMIT ${'limit} OFFSET ${offset}
    `);
    LedgerEntryRow[] rows = [];
    check from LedgerEntryRow row in resultStream
        do {
            rows.push(row);
        };
    return rows;
}

// --- settlements ---

isolated function insertSettlement(SettlementRow row, string createdAt) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        INSERT INTO settlements
            (id, merchant_id, period_start, period_end, gross_amount, fee_amount, net_amount,
             currency, status, scheduled_date, paid_at, payout_reference, created_at)
        VALUES
            (${row.id}, ${row.merchantId}, ${row.periodStart}, ${row.periodEnd}, ${row.grossAmount},
             ${row.feeAmount}, ${row.netAmount}, ${row.currency}, ${row.status}, ${row.scheduledDate},
             ${row.paidAt}, ${row.payoutReference}, ${createdAt})
    `);
}

isolated function updateSettlementPaid(string id, string paidAt, string payoutReference) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        UPDATE settlements SET status = 'paid', paid_at = ${paidAt}, payout_reference = ${payoutReference}
        WHERE id = ${id}
    `);
}

isolated function updateSettlementStatus(string id, string status) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        UPDATE settlements SET status = ${status} WHERE id = ${id}
    `);
}

isolated function countSettlementsByMerchant(string merchantId, string? status) returns int|error {
    postgresql:Client dbClient = check ledgerDb();
    sql:ParameterizedQuery q = `SELECT COUNT(*) AS cnt FROM settlements WHERE merchant_id = ${merchantId}`;
    if status is string {
        q = sql:queryConcat(q, ` AND status = ${status}`);
    }
    record {| int cnt; |} result = check dbClient->queryRow(q);
    return result.cnt;
}

isolated function listSettlementsByMerchant(string merchantId, int 'limit, int offset, string? status)
        returns SettlementRow[]|error {
    postgresql:Client dbClient = check ledgerDb();
    sql:ParameterizedQuery q = `SELECT id, period_start AS "periodStart", period_end AS "periodEnd",
            gross_amount AS "grossAmount", fee_amount AS "feeAmount", net_amount AS "netAmount",
            currency, status, scheduled_date AS "scheduledDate", paid_at AS "paidAt",
            payout_reference AS "payoutReference", merchant_id AS "merchantId"
        FROM settlements WHERE merchant_id = ${merchantId}`;
    if status is string {
        q = sql:queryConcat(q, ` AND status = ${status}`);
    }
    q = sql:queryConcat(q, ` ORDER BY scheduled_date DESC LIMIT ${'limit} OFFSET ${offset}`);
    stream<SettlementRow, sql:Error?> resultStream = dbClient->query(q);
    SettlementRow[] rows = [];
    check from SettlementRow row in resultStream
        do {
            rows.push(row);
        };
    return rows;
}

isolated function getSettlementByIdForMerchant(string id, string merchantId) returns SettlementRow?|error {
    postgresql:Client dbClient = check ledgerDb();
    SettlementRow|error result = dbClient->queryRow(`
        SELECT id, period_start AS "periodStart", period_end AS "periodEnd",
               gross_amount AS "grossAmount", fee_amount AS "feeAmount", net_amount AS "netAmount",
               currency, status, scheduled_date AS "scheduledDate", paid_at AS "paidAt",
               payout_reference AS "payoutReference", merchant_id AS "merchantId"
        FROM settlements WHERE id = ${id} AND merchant_id = ${merchantId}
    `);
    if result is error {
        if isNoRows(result) {
            return ();
        }
        return result;
    }
    return result;
}

// --- notifications ---

isolated function insertNotification(NotificationRow row, string merchantId) returns error? {
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        INSERT INTO notifications (id, merchant_id, settlement_id, message, created_at, read_at)
        VALUES (${row.id}, ${merchantId}, ${row.settlementId}, ${row.message}, ${row.createdAt}, ${row.readAt})
    `);
}

isolated function countNotificationsByMerchant(string merchantId) returns int|error {
    postgresql:Client dbClient = check ledgerDb();
    record {| int cnt; |} result = check dbClient->queryRow(`
        SELECT COUNT(*) AS cnt FROM notifications WHERE merchant_id = ${merchantId}
    `);
    return result.cnt;
}

isolated function listNotificationsByMerchant(string merchantId, int 'limit, int offset) returns NotificationRow[]|error {
    postgresql:Client dbClient = check ledgerDb();
    stream<NotificationRow, sql:Error?> resultStream = dbClient->query(`
        SELECT id, settlement_id AS "settlementId", message, created_at AS "createdAt", read_at AS "readAt"
        FROM notifications WHERE merchant_id = ${merchantId}
        ORDER BY created_at DESC LIMIT ${'limit} OFFSET ${offset}
    `);
    NotificationRow[] rows = [];
    check from NotificationRow row in resultStream
        do {
            rows.push(row);
        };
    return rows;
}

isolated function getNotificationByIdForMerchant(string id, string merchantId) returns NotificationRow?|error {
    postgresql:Client dbClient = check ledgerDb();
    NotificationRow|error result = dbClient->queryRow(`
        SELECT id, settlement_id AS "settlementId", message, created_at AS "createdAt", read_at AS "readAt"
        FROM notifications WHERE id = ${id} AND merchant_id = ${merchantId}
    `);
    if result is error {
        if isNoRows(result) {
            return ();
        }
        return result;
    }
    return result;
}

// Returns the updated row, or () when no row for this id belongs to this
// merchant — a 404, never a 403.
isolated function acknowledgeNotificationForMerchant(string id, string merchantId, string readAt)
        returns NotificationRow?|error {
    NotificationRow? existing = check getNotificationByIdForMerchant(id, merchantId);
    if existing is () {
        return ();
    }
    postgresql:Client dbClient = check ledgerDb();
    _ = check dbClient->execute(`
        UPDATE notifications SET read_at = ${readAt} WHERE id = ${id} AND merchant_id = ${merchantId}
    `);
    existing.readAt = readAt;
    return existing;
}
