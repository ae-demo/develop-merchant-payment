# Merchant Payment Collections &amp; Settlement — PRD

## Problem Statement

Merchants operating in two African countries accept payments from their
customers over mobile money and card, but today have no single place that
tells them what they have actually collected, what the platform has deducted,
and when they will be paid. Reconciling collections across two payment
channels against eventual bank or mobile-money payouts is manual and opaque,
and it happens after the fact rather than as it occurs.

## Solution

A merchant payment collections and settlement platform that aggregates a
merchant's mobile money and card collections, keeps a double-entry ledger of
every collection and every settlement, nets and pays merchants out on a fixed
schedule, and gives each merchant a self-service view of what has been
collected, how the net payable was calculated, and when they will be — or have
been — paid. Merchant identity — who a merchant is, whether they may trade,
their payout account and their credit limit — is owned and maintained by a
separate system run by another team; this platform consumes that data rather
than owning it.

## Actors

- **Merchant**: a business that accepts customer payments through this
platform over mobile money and card. Signs in to a self-service portal to
view collections, the ledger, upcoming and past settlements, and individual
transaction detail for their own account only.

## User Stories

1. As a Merchant, I want to sign in securely to a self-service portal, so that
only I can view my own collections and settlement data.
2. As a Merchant, I want to see all payments my customers have made to me over
mobile money and card, so that I can track my sales activity.
3. As a Merchant, I want to see a double-entry ledger view of my account —
gross collections, fees deducted, and net payable — so that I understand
exactly how my settlement amount is calculated.
4. As a Merchant, I want to see the date and amount of my next scheduled
settlement, so that I can plan my cash flow.
5. As a Merchant, I want to see a history of past settlements paid to me, so
that I can reconcile against my bank or mobile money statements.
6. As a Merchant, I want to be notified when a settlement has been paid out to
me, so that I know the funds have arrived.
7. As a Merchant, I want to view the details of an individual transaction
(channel, amount, timestamp, status), so that I can investigate any
discrepancy.
8. As a Merchant, I want collections made via mobile money and via card to be
aggregated into a single settlement, so that I receive one consolidated
payout per cycle rather than one per channel.
9. As a Merchant, I want new collections to stop being settled to me if my
trading status (held by the merchant identity system) is not active, so
that funds are protected while I am not eligible to trade.
10. As a Merchant, I want my settlements paid to the payout account on file
with the merchant identity system, so that I don't have to re-enter my
banking details in this product.

## Product Decisions

- **Sign-in**: merchants sign in via SSO through Thunder, the platform IDP
(organization default).
- **Countries and currencies**: the platform operates in Kenya (KES) and
Nigeria (NGN).
- **Settlement schedule**: settlement runs on a single, fixed, platform-wide
daily cadence — no per-merchant schedules. There is no dedicated
operations/back-office actor in this product; the cadence is fully
automated and is maintained as a system configuration value rather than
through a user-facing admin console.
- **Fee model**: the platform deducts a transaction fee from gross collections
before computing each merchant's net settlement amount; the fee is
percentage-based per transaction.
- **Currency handling**: each merchant trades in the currency of the one
country they operate in (KES or NGN); the platform does not convert between
the two countries' currencies for a single merchant's ledger or settlement.
- **Merchant identity is external**: who a merchant is, whether they may
trade, their payout account, and their credit limit are owned by a separate
merchant-identity system run by another team. This platform reads that data
(identity, trading status, payout account) to gate collections settlement
and to route payouts; it does not duplicate or edit it.
- **Credit limit usage**: the merchant's credit limit, held by the external
identity system, is not used by this product in the current scope (e.g. no
advance funding against future settlements).
- **Settlement notification**: merchants are notified of a completed
settlement via an in-app notification.
- **Collection channels**: the platform collects over mobile money and card.
No specific mobile money or card processor has been chosen yet — this
remains a capability to be resolved when the design names its integration
partners.

## Out of Scope

- Merchant onboarding, KYC, trading-eligibility determination, payout-account
management, and credit-limit management — all owned by the separate
merchant identity system.
- An internal operations/back-office console: this platform runs settlement
automatically, with no staff role for monitoring, approving, or manually
triggering runs.
- Any customer-facing (payer-facing) interface, confirmation page, or
receipt — customers interact only with the mobile money/card rails
themselves, never with this platform.
- Advance or credit-based funding against future settlements.
- Cross-currency conversion for a merchant trading in one country's currency.
- Refunds or chargebacks from a customer back through mobile money or card:
handled entirely outside this platform's ledger and settlement flow.

## Open Questions

1. Which mobile money and card payment providers will the platform integrate
with for collections in Kenya and Nigeria? No preference has been stated
yet — left for the design to resolve.

