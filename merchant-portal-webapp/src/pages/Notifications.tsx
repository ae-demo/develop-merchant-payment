import { useEffect, useState, type JSX } from "react";
import {
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatDateTime } from "../format";
import { Can } from "../authz/gates";

type Notification = components["schemas"]["Notification"];

export function NotificationsPage(): JSX.Element {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);

  async function load(): Promise<void> {
    try {
      const res = await collectionsApi.GET("/me/notifications", { params: { query: { limit: 100 } } });
      if (res.error) throw new Error("Could not load notifications");
      setNotifications(res.data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAllAsRead(): Promise<void> {
    const unread = (notifications ?? []).filter((n) => !n.readAt);
    if (unread.length === 0) return;
    setAcking(true);
    try {
      // No bulk-acknowledge operation in the contract: call the single
      // acknowledge endpoint once per unread notification.
      for (const n of unread) {
        await collectionsApi.POST("/me/notifications/{notificationId}/acknowledge", {
          params: { path: { notificationId: n.id } },
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark notifications as read");
    } finally {
      setAcking(false);
    }
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.readAt).length;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Notifications</PageTitle.Header>
        <PageTitle.SubHeader>In-app settlement notifications</PageTitle.SubHeader>
        <PageTitle.Actions>
          <Can op="POST /me/notifications/{notificationId}/acknowledge">
            <Button variant="outlined" disabled={acking || unreadCount === 0} onClick={() => void markAllAsRead()}>
              Mark all as read
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error ? (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {notifications && notifications.length === 0 ? (
        <Typography color="text.secondary">You have no notifications yet.</Typography>
      ) : (
        <List>
          {(notifications ?? []).map((n) => (
            <ListItem
              key={n.id}
              secondaryAction={!n.readAt ? <Chip label="Unread" size="small" color="info" /> : undefined}
              sx={{ borderBottom: "1px solid", borderColor: "divider" }}
            >
              <ListItemText primary={n.message} secondary={formatDateTime(n.createdAt)} />
            </ListItem>
          ))}
        </List>
      )}
      <Box sx={{ mt: 2 }} />
    </PageContent>
  );
}
