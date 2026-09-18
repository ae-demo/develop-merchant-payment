// The mock service: the app's own seed data, ownership and 404s. Whether an
// operation may be called at ALL is mock/authz/gateway.ts's job, read from
// openapi.yaml exactly as the real gateway is — no scope check belongs here.
//
// State lives in this module's scope, so it behaves like an app for the
// length of one page session: acknowledging a notification here shows up in
// the next list call, but any full page load (reload, a typed URL, a link
// that leaves the SPA) re-runs this module and restores the seed. Only
// in-app navigation carries a change forward.
//
// Every operation in this contract is under /me/ — there is no every-row
// operation to contrast it with — so every handler answers the caller's own
// (and only) seed data; a caller who cannot call the operation at all was
// already refused by mock/authz/gateway.ts and never reaches here.

import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/payment-collections-api";

type Transaction = components["schemas"]["Transaction"];
type LedgerEntry = components["schemas"]["LedgerEntry"];
type Settlement = components["schemas"]["Settlement"];
type Notification = components["schemas"]["Notification"];

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

function at(daysAgo: number, hours: number, minutes: number): string {
  const d = new Date(now.getTime() - daysAgo * DAY);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function dateOnly(daysAgo: number): string {
  const d = new Date(now.getTime() - daysAgo * DAY);
  return d.toISOString().slice(0, 10);
}

// Newest first, as the real listing would return them. The Dashboard reads
// its "Collected this period" stat from the first page of this same list, so
// the demo total (KES 482,300) is exactly the sum of the collected rows a
// `limit=5` call returns — read off these rows, never invented separately.
const transactions: Transaction[] = [
  { id: "TXN-58213", channel: "mobile_money", amount: 1200, currency: "KES", status: "collected", occurredAt: at(0, 14, 2) },
  { id: "TXN-58214", channel: "card", amount: 3400, currency: "KES", status: "collected", occurredAt: at(0, 11, 47) },
  { id: "TXN-58215", channel: "mobile_money", amount: 850, currency: "KES", status: "failed", occurredAt: at(1, 9, 15) },
  { id: "TXN-58212", channel: "mobile_money", amount: 350000, currency: "KES", status: "collected", occurredAt: at(3, 16, 30) },
  { id: "TXN-58211", channel: "card", amount: 127700, currency: "KES", status: "collected", occurredAt: at(4, 10, 5) },
  { id: "TXN-58210", channel: "card", amount: 5000, currency: "KES", status: "reversed", occurredAt: at(5, 8, 40) },
];

const ledgerEntries: LedgerEntry[] = [
  { id: "le-1", transactionId: "TXN-58213", settlementId: null, entryType: "credit", amount: 1200, currency: "KES", createdAt: at(0, 14, 2) },
  { id: "le-2", transactionId: null, settlementId: null, entryType: "debit", amount: 24, currency: "KES", createdAt: at(0, 0, 0) },
  { id: "le-3", transactionId: null, settlementId: "settlement-1", entryType: "debit", amount: 461200, currency: "KES", createdAt: at(1, 0, 0) },
  { id: "le-4", transactionId: "TXN-58212", settlementId: null, entryType: "credit", amount: 350000, currency: "KES", createdAt: at(3, 16, 30) },
  { id: "le-5", transactionId: "TXN-58211", settlementId: null, entryType: "credit", amount: 127700, currency: "KES", createdAt: at(4, 10, 5) },
  { id: "le-6", transactionId: null, settlementId: "settlement-2", entryType: "debit", amount: 389500, currency: "KES", createdAt: at(2, 0, 0) },
];

const settlements: Settlement[] = [
  {
    id: "settlement-1",
    periodStart: dateOnly(2),
    periodEnd: dateOnly(0),
    grossAmount: 483500,
    feeAmount: 22300,
    netAmount: 461200,
    currency: "KES",
    status: "scheduled",
    scheduledDate: dateOnly(-1),
    paidAt: null,
    payoutReference: null,
  },
  {
    id: "settlement-2",
    periodStart: dateOnly(3),
    periodEnd: dateOnly(2),
    grossAmount: 410000,
    feeAmount: 20500,
    netAmount: 389500,
    currency: "KES",
    status: "paid",
    scheduledDate: dateOnly(1),
    paidAt: at(1, 7, 0),
    payoutReference: "PYT-88213",
  },
  {
    id: "settlement-3",
    periodStart: dateOnly(5),
    periodEnd: dateOnly(4),
    grossAmount: 390000,
    feeAmount: 17900,
    netAmount: 372100,
    currency: "KES",
    status: "paid",
    scheduledDate: dateOnly(3),
    paidAt: at(3, 7, 0),
    payoutReference: "PYT-88100",
  },
  {
    id: "settlement-0",
    periodStart: dateOnly(7),
    periodEnd: dateOnly(6),
    grossAmount: 150000,
    feeAmount: 7000,
    netAmount: 143000,
    currency: "KES",
    status: "withheld",
    scheduledDate: dateOnly(5),
    paidAt: null,
    payoutReference: null,
  },
];

let notifications: Notification[] = [
  {
    id: "notif-1",
    settlementId: "settlement-2",
    message: "Settlement of KES 389,500 paid to your account",
    createdAt: at(1, 7, 5),
    readAt: null,
  },
  {
    id: "notif-2",
    settlementId: "settlement-3",
    message: "Settlement of KES 372,100 paid to your account",
    createdAt: at(3, 7, 5),
    readAt: at(3, 8, 0),
  },
];

function page<T>(items: T[], limit: number, offset: number): { count: number; data: T[] } {
  return { count: items.length, data: items.slice(offset, offset + limit) };
}

export const handlers = [
  http.get("/api/me/transactions", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const channel = url.searchParams.get("channel");
    const status = url.searchParams.get("status");
    let filtered = transactions;
    if (channel) filtered = filtered.filter((t) => t.channel === channel);
    if (status) filtered = filtered.filter((t) => t.status === status);
    const { count, data } = page(filtered, limit, offset);
    return HttpResponse.json({ count, next: null, previous: null, data });
  }),

  http.get("/api/me/transactions/:transactionId", ({ params }) => {
    const found = transactions.find((t) => t.id === params.transactionId);
    if (!found) {
      return HttpResponse.json(
        { code: 404, message: "Not found", description: "No such transaction for the caller" },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.get("/api/me/ledger-entries", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const { count, data } = page(ledgerEntries, limit, offset);
    return HttpResponse.json({ count, next: null, previous: null, data });
  }),

  http.get("/api/me/settlements", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const status = url.searchParams.get("status");
    let filtered = settlements;
    if (status) filtered = filtered.filter((s) => s.status === status);
    const { count, data } = page(filtered, limit, offset);
    return HttpResponse.json({ count, next: null, previous: null, data });
  }),

  http.get("/api/me/settlements/:settlementId", ({ params }) => {
    const found = settlements.find((s) => s.id === params.settlementId);
    if (!found) {
      return HttpResponse.json(
        { code: 404, message: "Not found", description: "No such settlement for the caller" },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.get("/api/me/notifications", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const { count, data } = page(notifications, limit, offset);
    return HttpResponse.json({ count, next: null, previous: null, data });
  }),

  http.post("/api/me/notifications/:notificationId/acknowledge", ({ params }) => {
    const found = notifications.find((n) => n.id === params.notificationId);
    if (!found) {
      return HttpResponse.json(
        { code: 404, message: "Not found", description: "No such notification for the caller" },
        { status: 404 },
      );
    }
    if (!found.readAt) {
      notifications = notifications.map((n) => (n.id === found.id ? { ...n, readAt: new Date().toISOString() } : n));
    }
    return HttpResponse.json(notifications.find((n) => n.id === found.id)!);
  }),
];
