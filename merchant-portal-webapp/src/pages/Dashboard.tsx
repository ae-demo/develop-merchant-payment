import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  StatCard,
  Typography,
} from "@wso2/oxygen-ui";
import { Wallet, CalendarClock, Activity } from "@wso2/oxygen-ui-icons-react";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDateTime, statusColor, titleCase } from "../format";

type Transaction = components["schemas"]["Transaction"];
type Settlement = components["schemas"]["Settlement"];

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [txRes, settleRes] = await Promise.all([
          collectionsApi.GET("/me/transactions", { params: { query: { limit: 5 } } }),
          collectionsApi.GET("/me/settlements", { params: { query: { limit: 20 } } }),
        ]);
        if (!live) return;
        if (txRes.error) throw new Error("Could not load transactions");
        if (settleRes.error) throw new Error("Could not load settlements");
        setTransactions(txRes.data.data);
        setSettlements(settleRes.data.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // "Collected this period" and "Next settlement" are read directly off the
  // API's own numbers — never computed here beyond a sum/pick over what the
  // service returned.
  const collectedThisPeriod = (transactions ?? [])
    .filter((t) => t.status === "collected")
    .reduce((sum, t) => sum + t.amount, 0);
  const collectedCurrency = transactions?.[0]?.currency ?? "KES";
  const nextSettlement = (settlements ?? [])
    .filter((s) => s.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Dashboard</PageTitle.Header>
        <PageTitle.SubHeader>Collections summary and next settlement at a glance</PageTitle.SubHeader>
      </PageTitle>

      {error ? (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            value={transactions ? formatAmount(collectedThisPeriod, collectedCurrency) : "…"}
            label="Collected this period"
            icon={<Wallet size={24} />}
            iconColor="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            value={nextSettlement ? formatAmount(nextSettlement.netAmount, nextSettlement.currency) : "—"}
            label="Next settlement"
            icon={<CalendarClock size={24} />}
            iconColor="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard value="Active" label="Trading status" icon={<Activity size={24} />} iconColor="success" />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Recent transactions
      </Typography>

      <ListingTable.Container disablePaper sx={{ width: "100%" }}>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Channel</ListingTable.Cell>
              <ListingTable.Cell>Amount</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(transactions ?? []).map((tx) => (
              <ListingTable.Row
                key={tx.id}
                clickable
                hover
                onClick={() => navigate(`/transactions/${tx.id}`)}
              >
                <ListingTable.Cell>{formatDateTime(tx.occurredAt)}</ListingTable.Cell>
                <ListingTable.Cell>{tx.channel === "mobile_money" ? "Mobile Money" : "Card"}</ListingTable.Cell>
                <ListingTable.Cell>{formatAmount(tx.amount, tx.currency)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={titleCase(tx.status)} size="small" color={statusColor(tx.status)} />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {transactions && transactions.length === 0 ? (
          <ListingTable.EmptyState title="No transactions yet" description="Collections will show up here." />
        ) : null}
      </ListingTable.Container>

      <Box sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/transactions")}>
          View all transactions
        </Button>
      </Box>
    </PageContent>
  );
}
