import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;
import ballerina/sql;

// The ledger-db platform-resource may not be provisioned yet in every
// environment this component runs in (the component contract calls its
// provisioning "platform-flagged, not part of this Task's build"). So the
// client is constructed lazily, on first actual use, rather than at module
// init — a missing or unreachable database then fails the request that
// needed it, never the service's own startup.
// A module-level mutable global can only be protected by `lock` from inside
// an isolated OBJECT's own methods, not from a plain top-level `isolated
// function` — so the lazily-built client and the schema-ready flag live in
// one small isolated class instead of bare module variables.
isolated class LedgerDbHolder {
    private postgresql:Client? clientValue = ();
    private boolean schemaReady = false;

    isolated function currentClient() returns postgresql:Client? {
        lock {
            return self.clientValue;
        }
    }

    isolated function setClient(postgresql:Client c) {
        lock {
            self.clientValue = c;
        }
    }

    isolated function isSchemaReady() returns boolean {
        lock {
            return self.schemaReady;
        }
    }

    isolated function markSchemaReady() {
        lock {
            self.schemaReady = true;
        }
    }
}

final LedgerDbHolder ledgerDbHolder = new;

isolated function ledgerDbClient() returns postgresql:Client|error {
    postgresql:Client? existing = ledgerDbHolder.currentClient();
    if existing is postgresql:Client {
        return existing;
    }
    postgresql:Client newClient = check new (
        host = ledgerDbHost,
        username = ledgerDbUsername,
        password = ledgerDbPassword,
        database = ledgerDbDatabase,
        port = ledgerDbPort
    );
    ledgerDbHolder.setClient(newClient);
    return newClient;
}

isolated function ensureSchema() returns error? {
    if ledgerDbHolder.isSchemaReady() {
        return;
    }
    postgresql:Client dbClient = check ledgerDbClient();
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS merchants (
            merchant_id VARCHAR(64) PRIMARY KEY,
            country VARCHAR(8) NOT NULL,
            currency VARCHAR(8) NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(64) PRIMARY KEY,
            merchant_id VARCHAR(64) NOT NULL,
            channel VARCHAR(16) NOT NULL,
            amount NUMERIC(18,2) NOT NULL,
            currency VARCHAR(8) NOT NULL,
            status VARCHAR(16) NOT NULL,
            occurred_at TEXT NOT NULL,
            gateway_transaction_id VARCHAR(128),
            settlement_id VARCHAR(64),
            created_at TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
            id VARCHAR(64) PRIMARY KEY,
            merchant_id VARCHAR(64) NOT NULL,
            transaction_id VARCHAR(64),
            settlement_id VARCHAR(64),
            entry_type VARCHAR(8) NOT NULL,
            amount NUMERIC(18,2) NOT NULL,
            currency VARCHAR(8) NOT NULL,
            created_at TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS settlements (
            id VARCHAR(64) PRIMARY KEY,
            merchant_id VARCHAR(64) NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            gross_amount NUMERIC(18,2) NOT NULL,
            fee_amount NUMERIC(18,2) NOT NULL,
            net_amount NUMERIC(18,2) NOT NULL,
            currency VARCHAR(8) NOT NULL,
            status VARCHAR(16) NOT NULL,
            scheduled_date TEXT NOT NULL,
            paid_at TEXT,
            payout_reference VARCHAR(128),
            created_at TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(64) PRIMARY KEY,
            merchant_id VARCHAR(64) NOT NULL,
            settlement_id VARCHAR(64),
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            read_at TEXT
        )
    `);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id)
    `);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_unsettled ON transactions(merchant_id, status, settlement_id)
    `);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_ledger_merchant ON ledger_entries(merchant_id)
    `);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlements(merchant_id)
    `);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_notifications_merchant ON notifications(merchant_id)
    `);
    ledgerDbHolder.markSchemaReady();
}

// A connection every DB-backed function opens with: lazily builds the pool
// and makes sure the schema exists, once per process.
isolated function ledgerDb() returns postgresql:Client|error {
    check ensureSchema();
    return ledgerDbClient();
}

# A `sql:NoRowsError` is a 404 for a per-caller lookup, never a 500.
#
# + err - the error `queryRow` returned
# + return - true when the error is exactly "no rows"
isolated function isNoRows(error err) returns boolean {
    return err is sql:NoRowsError;
}
