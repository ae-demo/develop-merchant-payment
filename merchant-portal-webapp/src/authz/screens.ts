// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each row names the screen's
// route and the one API operation it LOADS — the call whose answer the screen
// renders on open. The gate follows from that operation's scope, projected
// from payment-collections-api's openapi.yaml into ./operations.gen.ts.
//
// Order matches specs/design/components/merchant-portal-webapp/wireframes.dsl's
// sidebar — Dashboard, Transactions, Ledger, Settlements, Notifications — which
// is the rail order and the landing-screen order. TransactionDetail and
// SettlementDetail are drill-down screens the wireframe reaches by a table row,
// not the rail, so they are not in the sidebar but still gated on their load
// operation.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", loads: "GET /me/transactions" },
  { key: "transactions", label: "Transactions", path: "/transactions", loads: "GET /me/transactions" },
  {
    key: "transaction-detail",
    label: "Transaction Detail",
    path: "/transactions/:transactionId",
    loads: "GET /me/transactions/{transactionId}",
  },
  { key: "ledger", label: "Ledger", path: "/ledger", loads: "GET /me/ledger-entries" },
  { key: "settlements", label: "Settlements", path: "/settlements", loads: "GET /me/settlements" },
  {
    key: "settlement-detail",
    label: "Settlement Detail",
    path: "/settlements/:settlementId",
    loads: "GET /me/settlements/{settlementId}",
  },
  { key: "notifications", label: "Notifications", path: "/notifications", loads: "GET /me/notifications" },
];

/** The rail — the screens shown as navigation links, in sidebar order. */
export const SIDEBAR_SCREENS: readonly ScreenRoute[] = SCREEN_ROUTES.filter((screen) =>
  ["dashboard", "transactions", "ledger", "settlements", "notifications"].includes(screen.key),
);

for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

/** Same filter, restricted to the rail — what the sidebar actually shows. */
export function reachableSidebarScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  const reachable = new Set(reachableScreens(scopes, signedIn).map((s) => s.key));
  return SIDEBAR_SCREENS.filter((screen) => reachable.has(screen.key));
}
