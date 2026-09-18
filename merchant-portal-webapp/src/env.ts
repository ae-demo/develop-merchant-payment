// Typed read of window._env_, mounted by the platform's /env-config.js at
// request time. Only keys this app actually has: the thunder-auth OIDC keys
// (dependency name "thunder-auth" -> THUNDER_AUTH_*). There is no browser API
// URL — payment-collections-api is same-origin /api (react-webapp).
type Env = {
  // The four the SPA reads. THUNDER_AUTH_JWKS_URL is emitted too, but the
  // browser never validates a token — the API gateway does — so it is not
  // declared here.
  THUNDER_AUTH_CLIENT_ID: string;
  THUNDER_AUTH_ISSUER: string;
  THUNDER_AUTH_SCOPES: string;
  THUNDER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
