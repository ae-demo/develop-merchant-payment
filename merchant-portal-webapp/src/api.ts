import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/payment-collections-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Same-origin: nginx in this pod reverse-proxies /api to the API gateway,
// which validates the bearer and injects the caller's identity. There is no
// browser-visible host for payment-collections-api.
export const collectionsApi = createClient<paths>({ baseUrl: "/api" });

// Every authorization decision goes through src/authz/client.ts — this client
// adds nothing of its own about it (thunder-authentication §4).
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

collectionsApi.use(authMiddleware);
