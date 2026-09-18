import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBreadcrumbs,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDateTime, statusColor, titleCase } from "../format";

type Transaction = components["schemas"]["Transaction"];

export function TransactionDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { transactionId = "" } = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let live = true;
    setTransaction(null);
    setNotFound(false);
    setError(null);
    void (async () => {
      try {
        const res = await collectionsApi.GET("/me/transactions/{transactionId}", {
          params: { path: { transactionId } },
        });
        if (!live) return;
        if (res.response.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.error) throw new Error("Could not load this transaction");
        setTransaction(res.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, [transactionId]);

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "transactions", label: "Transactions", onClick: () => navigate("/transactions") },
          { key: "detail", label: "Detail" },
        ]}
        sx={{ mb: 2 }}
      />
      <PageTitle>
        <PageTitle.Header>Transaction</PageTitle.Header>
        <PageTitle.SubHeader>A single collection's detail</PageTitle.SubHeader>
      </PageTitle>

      {error ? <Typography color="error.main">{error}</Typography> : null}
      {notFound ? <Typography color="text.secondary">No such transaction on your account.</Typography> : null}

      {transaction ? (
        <>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Transaction" />
            <CardContent>
              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="overline" color="text.secondary">
                    Channel
                  </Typography>
                  <Typography variant="h6">
                    {transaction.channel === "mobile_money" ? "Mobile Money" : "Card"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="overline" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h6">{formatAmount(transaction.amount, transaction.currency)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="overline" color="text.secondary">
                    Status
                  </Typography>
                  <Chip label={titleCase(transaction.status)} size="small" color={statusColor(transaction.status)} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="overline" color="text.secondary">
                    Occurred at
                  </Typography>
                  <Typography variant="h6">{formatDateTime(transaction.occurredAt)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Transaction fields
          </Typography>
          <ListingTable.Container disablePaper sx={{ width: "100%", mb: 3 }}>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Field</ListingTable.Cell>
                  <ListingTable.Cell>Value</ListingTable.Cell>
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                <ListingTable.Row>
                  <ListingTable.Cell>Transaction ID</ListingTable.Cell>
                  <ListingTable.Cell>{transaction.id}</ListingTable.Cell>
                </ListingTable.Row>
                <ListingTable.Row>
                  <ListingTable.Cell>Channel</ListingTable.Cell>
                  <ListingTable.Cell>{transaction.channel === "mobile_money" ? "Mobile Money" : "Card"}</ListingTable.Cell>
                </ListingTable.Row>
                <ListingTable.Row>
                  <ListingTable.Cell>Amount</ListingTable.Cell>
                  <ListingTable.Cell>{formatAmount(transaction.amount, transaction.currency)}</ListingTable.Cell>
                </ListingTable.Row>
                <ListingTable.Row>
                  <ListingTable.Cell>Currency</ListingTable.Cell>
                  <ListingTable.Cell>{transaction.currency}</ListingTable.Cell>
                </ListingTable.Row>
                <ListingTable.Row>
                  <ListingTable.Cell>Status</ListingTable.Cell>
                  <ListingTable.Cell>{titleCase(transaction.status)}</ListingTable.Cell>
                </ListingTable.Row>
                <ListingTable.Row>
                  <ListingTable.Cell>Occurred at</ListingTable.Cell>
                  <ListingTable.Cell>{formatDateTime(transaction.occurredAt)}</ListingTable.Cell>
                </ListingTable.Row>
              </ListingTable.Body>
            </ListingTable>
          </ListingTable.Container>
          {/* "Included in settlement" from the wireframe is not built: the
              Transaction schema carries no settlement reference and no ledger
              entry links a transaction to the settlement that nets it, so the
              value cannot be read from the API without inventing it. Reported
              as a gap rather than fabricated. */}
        </>
      ) : null}

      <Button variant="outlined" onClick={() => navigate("/transactions")}>
        Back to transactions
      </Button>
    </PageContent>
  );
}
