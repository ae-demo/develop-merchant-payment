import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chip,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Search } from "@wso2/oxygen-ui-icons-react";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDateTime, statusColor, titleCase } from "../format";

type Transaction = components["schemas"]["Transaction"];

const CHANNELS: Array<Transaction["channel"]> = ["mobile_money", "card"];
const STATUSES: Array<Transaction["status"]> = ["collected", "failed", "reversed"];

export function TransactionsPage(): JSX.Element {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await collectionsApi.GET("/me/transactions", {
          params: {
            query: {
              limit: 100,
              ...(channel ? { channel: channel as Transaction["channel"] } : {}),
              ...(status ? { status: status as Transaction["status"] } : {}),
            },
          },
        });
        if (!live) return;
        if (res.error) throw new Error("Could not load transactions");
        setTransactions(res.data.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, [channel, status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions ?? [];
    return (transactions ?? []).filter(
      (tx) => tx.id.toLowerCase().includes(q) || tx.channel.toLowerCase().includes(q),
    );
  }, [transactions, query]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Transactions</PageTitle.Header>
        <PageTitle.SubHeader>All collections over mobile money and card</PageTitle.SubHeader>
      </PageTitle>

      {error ? (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search transactions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ input: { startAdornment: <Search size={18} /> } }}
          sx={{ flex: 1 }}
        />
        <TextField select label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All channels</MenuItem>
          {CHANNELS.map((c) => (
            <MenuItem key={c} value={c}>
              {c === "mobile_money" ? "Mobile Money" : "Card"}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {titleCase(s)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

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
            {filtered.map((tx) => (
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
        {transactions && filtered.length === 0 ? (
          <ListingTable.EmptyState
            title="No transactions found"
            description={query || channel || status ? "Try adjusting your filters." : "Collections will show up here."}
          />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
