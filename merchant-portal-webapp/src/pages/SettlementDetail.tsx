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
  PageContent,
  PageTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { collectionsApi } from "../api";
import type { components } from "../generated/payment-collections-api";
import { formatAmount, formatDateTime, statusColor, titleCase } from "../format";

type Settlement = components["schemas"]["Settlement"];

export function SettlementDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { settlementId = "" } = useParams<{ settlementId: string }>();
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let live = true;
    setSettlement(null);
    setNotFound(false);
    setError(null);
    void (async () => {
      try {
        const res = await collectionsApi.GET("/me/settlements/{settlementId}", {
          params: { path: { settlementId } },
        });
        if (!live) return;
        if (res.response.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.error) throw new Error("Could not load this settlement");
        setSettlement(res.data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
    return () => {
      live = false;
    };
  }, [settlementId]);

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "settlements", label: "Settlements", onClick: () => navigate("/settlements") },
          { key: "detail", label: "Detail" },
        ]}
        sx={{ mb: 2 }}
      />
      <PageTitle>
        <PageTitle.Header>Settlement</PageTitle.Header>
        <PageTitle.SubHeader>One settlement's netting and payout</PageTitle.SubHeader>
      </PageTitle>

      {error ? <Typography color="error.main">{error}</Typography> : null}
      {notFound ? <Typography color="text.secondary">No such settlement on your account.</Typography> : null}

      {settlement ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader title="Settlement" action={<Chip label={titleCase(settlement.status)} color={statusColor(settlement.status)} />} />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  Gross
                </Typography>
                <Typography variant="h5">{formatAmount(settlement.grossAmount, settlement.currency)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  Fee
                </Typography>
                <Typography variant="h5">{formatAmount(settlement.feeAmount, settlement.currency)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  Net
                </Typography>
                <Typography variant="h5">{formatAmount(settlement.netAmount, settlement.currency)}</Typography>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip label={titleCase(settlement.status)} size="small" color={statusColor(settlement.status)} />
            </Stack>

            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Payout reference | {settlement.payoutReference ?? "Not yet assigned"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paid to account on file with merchant identity
            </Typography>
            {settlement.status === "withheld" ? (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                This settlement is withheld and has not been paid out.
              </Typography>
            ) : null}
            {settlement.paidAt ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Paid at {formatDateTime(settlement.paidAt)}
              </Typography>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Button variant="outlined" onClick={() => navigate("/settlements")}>
        Back to settlements
      </Button>
    </PageContent>
  );
}
