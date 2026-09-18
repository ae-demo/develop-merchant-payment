import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDate, statusColor, titleCase } from "../format";

type Settlement = components["schemas"]["Settlement"];

const STATUSES: Array<Settlement["status"]> = ["scheduled", "withheld", "paid", "failed"];

export function SettlementsPage(): JSX.Element {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await collectionsApi.GET("/me/settlements", {
          params: { query: { limit: 100, ...(status ? { status: status as Settlement["status"] } : {}) } },
        });
        if (!live) return;
        if (res.error) throw new Error("Could not load settlements");
        setSettlements(res.data.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, [status]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Settlements</PageTitle.Header>
        <PageTitle.SubHeader>Past and upcoming settlements</PageTitle.SubHeader>
      </PageTitle>

      {error ? (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {titleCase(s)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Cadence: daily
        </Typography>
      </Stack>

      <ListingTable.Container disablePaper sx={{ width: "100%" }}>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Gross</ListingTable.Cell>
              <ListingTable.Cell>Fee</ListingTable.Cell>
              <ListingTable.Cell>Net</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(settlements ?? []).map((s) => (
              <ListingTable.Row key={s.id} clickable hover onClick={() => navigate(`/settlements/${s.id}`)}>
                <ListingTable.Cell>{formatDate(s.scheduledDate)}</ListingTable.Cell>
                <ListingTable.Cell>{formatAmount(s.grossAmount, s.currency)}</ListingTable.Cell>
                <ListingTable.Cell>{formatAmount(s.feeAmount, s.currency)}</ListingTable.Cell>
                <ListingTable.Cell>{formatAmount(s.netAmount, s.currency)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={titleCase(s.status)} size="small" color={statusColor(s.status)} />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {settlements && settlements.length === 0 ? (
          <ListingTable.EmptyState title="No settlements found" description="Settlements appear here once scheduled." />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
