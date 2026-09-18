import { useEffect, useState, type JSX } from "react";
import { Chip, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDateTime, titleCase } from "../format";

type LedgerEntry = components["schemas"]["LedgerEntry"];

function referenceFor(entry: LedgerEntry): string {
  if (entry.transactionId) return "Transaction";
  if (entry.settlementId) return "Settlement";
  return "Fee";
}

export function LedgerPage(): JSX.Element {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await collectionsApi.GET("/me/ledger-entries", { params: { query: { limit: 100 } } });
        if (!live) return;
        if (res.error) throw new Error("Could not load the ledger");
        setEntries(res.data.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Ledger</PageTitle.Header>
        <PageTitle.SubHeader>Double-entry ledger backing the net settlement calculation</PageTitle.SubHeader>
      </PageTitle>

      {error ? (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Ledger entries
      </Typography>

      <ListingTable.Container disablePaper sx={{ width: "100%" }}>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Type</ListingTable.Cell>
              <ListingTable.Cell>Amount</ListingTable.Cell>
              <ListingTable.Cell>Reference</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(entries ?? []).map((entry) => (
              <ListingTable.Row key={entry.id}>
                <ListingTable.Cell>{formatDateTime(entry.createdAt)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip
                    label={titleCase(entry.entryType)}
                    size="small"
                    color={entry.entryType === "credit" ? "success" : "default"}
                  />
                </ListingTable.Cell>
                <ListingTable.Cell>{formatAmount(entry.amount, entry.currency)}</ListingTable.Cell>
                <ListingTable.Cell>{referenceFor(entry)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {entries && entries.length === 0 ? (
          <ListingTable.EmptyState title="No ledger entries yet" description="Entries appear as collections and settlements post." />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
