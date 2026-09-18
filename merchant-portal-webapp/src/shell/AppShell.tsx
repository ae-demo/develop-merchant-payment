import type { JSX } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Divider,
  Footer,
  Header,
  Sidebar,
  ColorSchemeToggle,
  UserMenu,
} from "@wso2/oxygen-ui";
import {
  LayoutDashboard,
  CreditCard,
  BookOpen,
  Wallet,
  Bell,
  LogOut,
} from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { signOut } from "../authz/session";
import { SIDEBAR_SCREENS } from "../authz/screens";

const ICON_BY_KEY: Record<string, JSX.Element> = {
  dashboard: <LayoutDashboard size={18} />,
  transactions: <CreditCard size={18} />,
  ledger: <BookOpen size={18} />,
  settlements: <Wallet size={18} />,
  notifications: <Bell size={18} />,
};

export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const roles = useHeldRoles();

  const active = SIDEBAR_SCREENS.find((screen) => pathname.startsWith(screen.path))?.key;

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Merchant"} />
              <UserMenu.Header
                name={username || "Merchant"}
                email={username || ""}
                role={roles[0] ?? undefined}
              />
              <UserMenu.Item icon={<LogOut size={18} />} label="Sign out" onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {SIDEBAR_SCREENS.map((screen) =>
                screen.loads === null ? (
                  <Sidebar.Item key={screen.key} id={screen.key} link={<Link to={screen.path} />}>
                    <Sidebar.ItemIcon>{ICON_BY_KEY[screen.key]}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                ) : (
                  <Can key={screen.key} op={screen.loads}>
                    <Sidebar.Item id={screen.key} link={<Link to={screen.path} />}>
                      <Sidebar.ItemIcon>{ICON_BY_KEY[screen.key]}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                ),
              )}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
