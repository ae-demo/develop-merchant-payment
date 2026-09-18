# Daily settlement and payout

A Merchant checks their upcoming settlement; the platform gates it on trading
status held by the merchant identity system, nets the collected amount, and
disburses through the payment gateway before notifying the Merchant.

```mermaid
sequenceDiagram
    actor Merchant
    participant api as payment-collections-api
    participant identity as merchant-identity-service
    participant gateway as payment-gateway

    Merchant->>api: view upcoming settlement
    api->>identity: check trading status & payout account
    alt trading suspended
        identity-->>api: suspended
        api-->>Merchant: settlement withheld
    else trading active
        identity-->>api: active + payout account
        api->>api: net collections (gross - fees)
        api->>gateway: disburse net settlement
        gateway-->>api: payout confirmed
        api-->>Merchant: in-app notification: settlement paid
    end
```

