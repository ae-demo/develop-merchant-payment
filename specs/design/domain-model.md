# Domain Model

The core entities this platform owns: the transactions it collects, the
double-entry ledger it keeps, the settlements it pays out, and the
notifications it sends. `Merchant` here is a local reference row keyed to the
merchant identity system's own merchant id — this platform never owns
identity, trading eligibility, payout account, or credit limit.

```mermaid
erDiagram
    MERCHANT ||--o{ TRANSACTION : collects
    MERCHANT ||--o{ SETTLEMENT : "is paid"
    MERCHANT ||--o{ NOTIFICATION : receives
    TRANSACTION ||--o{ LEDGER_ENTRY : posts
    SETTLEMENT ||--o{ LEDGER_ENTRY : posts
    SETTLEMENT ||--o| NOTIFICATION : triggers

    MERCHANT {
        string merchantId PK
        string country
        string currency
    }
    TRANSACTION {
        string id PK
        string merchantId FK
        string channel
        decimal amount
        string currency
        string status
        datetime occurredAt
    }
    LEDGER_ENTRY {
        string id PK
        string merchantId FK
        string transactionId FK
        string settlementId FK
        string entryType
        decimal amount
        string currency
        datetime createdAt
    }
    SETTLEMENT {
        string id PK
        string merchantId FK
        date periodStart
        date periodEnd
        decimal grossAmount
        decimal feeAmount
        decimal netAmount
        string currency
        string status
        date scheduledDate
        datetime paidAt
        string payoutReference
    }
    NOTIFICATION {
        string id PK
        string merchantId FK
        string settlementId FK
        string message
        datetime createdAt
        datetime readAt
    }
```

- **Transaction**: one customer collection over mobile money or card.
- **LedgerEntry**: a double-entry posting against a transaction or a
settlement (debit/credit), the audit trail behind every net amount.
- **Settlement**: one payout cycle for a merchant — gross collected, fee
deducted, net paid, and when.
- **Notification**: an in-app message, generated when a settlement completes.

