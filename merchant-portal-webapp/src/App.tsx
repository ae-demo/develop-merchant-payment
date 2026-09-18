// ROUTING STRUCTURE, prescribed by thunder-authentication (adapted from
// assets/App.example.tsx, not copied verbatim — PAGE_BY_KEY and APP_NAME are
// this app's own):
//
//   NoAccess sits ABOVE the shell route and REPLACES it.
//   Forbidden sits INSIDE the shell, at /forbidden.
//   /forbidden is wired into authz/client once, from the router root.
//   Every gated route is wrapped in <RequireOperation>, from SCREEN_ROUTES.
//   /callback is routed OUTSIDE the provider.
//
// merchant-portal-webapp has no public screens: every screen in
// wireframes.dsl's one flow carries `role "Merchant"`, so SCREEN_ROUTES has no
// `public: true` entries and PUBLIC_SCREENS is always empty.

import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { DashboardPage } from "./pages/Dashboard";
import { TransactionsPage } from "./pages/Transactions";
import { TransactionDetailPage } from "./pages/TransactionDetail";
import { LedgerPage } from "./pages/Ledger";
import { SettlementsPage } from "./pages/Settlements";
import { SettlementDetailPage } from "./pages/SettlementDetail";
import { NotificationsPage } from "./pages/Notifications";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  dashboard: <DashboardPage />,
  transactions: <TransactionsPage />,
  "transaction-detail": <TransactionDetailPage />,
  ledger: <LedgerPage />,
  settlements: <SettlementsPage />,
  "settlement-detail": <SettlementDetailPage />,
  notifications: <NotificationsPage />,
};

/** The screens reachable before sign-in — none, for this app. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export function App(): ReactElement {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      {PUBLIC_SCREENS.map((screen) => (
        <Route
          key={screen.key}
          path={screen.path}
          element={<AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>}
        />
      ))}
      <Route
        path="*"
        element={
          <AuthzProvider fallback={<Splash />}>
            <ForbiddenWiring />
            <SignedIn />
          </AuthzProvider>
        }
      />
    </Routes>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside the
 * router and above every route.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6">{APP_NAME}</Typography>
        <Typography variant="body2" color="text.secondary">
          Checking your session…
        </Typography>
      </Stack>
    </Box>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // has already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  // NoAccess REPLACES the shell. It is returned here, above the <Routes> that
  // carry AppShell, so there is no rail to wrap it.
  if (reachable.length === 0) return <NoAccess appName={APP_NAME} />;

  const landing = reachable[0].path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
