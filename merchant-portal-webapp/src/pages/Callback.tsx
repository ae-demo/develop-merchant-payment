import { useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/** The OIDC redirect target. Runs the code exchange once, then lands at "/". */
export function CallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void handleCallback().finally(() => navigate("/", { replace: true }));
  }, [navigate]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6">Signing you in…</Typography>
      </Stack>
    </Box>
  );
}
