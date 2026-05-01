import { test as base, type Page } from "@playwright/test";

const KEYCLOAK_URL = "http://localhost:18080";
const KEYCLOAK_REALM = "tum";
const CLIENT_ID = "requestaccess";

// A fake JWT that the server will ignore (auth_bypass=true)
// but the client's parseJwt will extract claims from.
function createFakeJwt(): string {
  const header = { alg: "RS256", typ: "JWT", kid: "test-key" };
  const payload = {
    sub: "test-user-001",
    iss: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    auth_time: Math.floor(Date.now() / 1000),
    jti: "test-jti-001",
    sid: "test-session-001",
    typ: "Bearer",
    acr: "1",
    scope: "openid profile email",
    email_verified: true,
    name: "Test User",
    preferred_username: "testuser",
    given_name: "Test",
    family_name: "User",
    email: "test@tum.de",
    realm_access: { roles: ["request-admin"] },
    resource_access: {
      [CLIENT_ID]: { roles: ["request-admin"] },
    },
  };
  const sig = "fake-signature";

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64url")
      .replace(/=+$/, "");

  return `${encode(header)}.${encode(payload)}.${sig}`;
}

const FAKE_TOKEN = createFakeJwt();

// OIDC session storage key used by oidc-client-ts
const OIDC_STORAGE_KEY = `oidc.user:${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}:${CLIENT_ID}`;

const OIDC_USER_SESSION = {
  access_token: FAKE_TOKEN,
  token_type: "Bearer",
  scope: "openid profile email",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  profile: {
    sub: "test-user-001",
    email: "test@tum.de",
    email_verified: true,
    name: "Test User",
    preferred_username: "testuser",
    given_name: "Test",
    family_name: "User",
    iss: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    aud: CLIENT_ID,
  },
};

// Mock OIDC discovery document
const MOCK_OIDC_CONFIG = {
  issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  authorization_endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`,
  token_endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
  userinfo_endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
  end_session_endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
  jwks_uri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  check_session_iframe: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/login-status-iframe.html`,
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
};

async function setupOidcInterception(page: Page): Promise<void> {
  // Intercept OIDC discovery
  await page.route(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OIDC_CONFIG),
      });
    },
  );

  // Intercept JWKS endpoint
  await page.route(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ keys: [] }),
      });
    },
  );

  // Intercept session iframe
  await page.route("**/login-status-iframe.html**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body></body></html>",
    });
  });

  // Intercept token endpoint (for silent renew)
  await page.route(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
    async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Session not active" }),
      });
    },
  );

  // Intercept userinfo endpoint
  await page.route(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sub: "test-user-001",
          email: "test@tum.de",
          email_verified: true,
          name: "Test User",
          preferred_username: "testuser",
          given_name: "Test",
          family_name: "User",
        }),
      });
    },
  );

  // Block any other requests to Keycloak to prevent hangs
  await page.route(`${KEYCLOAK_URL}/**`, async (route) => {
    const url = route.request().url();
    if (
      url.includes(".well-known/openid-configuration") ||
      url.includes("/certs") ||
      url.includes("login-status-iframe") ||
      url.includes("/token") ||
      url.includes("/userinfo")
    ) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>mocked</body></html>",
    });
  });
}

async function setupGitHubMock(page: Page): Promise<void> {
  await page.route("**/api.github.com/users/**", async (route) => {
    const url = route.request().url();
    const username = url.split("/users/")[1];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        login: username,
        id: 12345,
        avatar_url: `https://avatars.githubusercontent.com/u/12345`,
        html_url: `https://github.com/${username}`,
        name: "Test GitHub User",
        bio: "Test bio for E2E",
        public_repos: 10,
      }),
    });
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
  anonymousPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupOidcInterception(page);
    await setupGitHubMock(page);

    // Pre-seed OIDC session into sessionStorage
    await page.addInitScript(
      ({ key, session }: { key: string; session: typeof OIDC_USER_SESSION }) => {
        sessionStorage.setItem(key, JSON.stringify(session));
      },
      { key: OIDC_STORAGE_KEY, session: OIDC_USER_SESSION },
    );

    await use(page);
  },

  anonymousPage: async ({ page }, use) => {
    await setupOidcInterception(page);
    await setupGitHubMock(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
export { FAKE_TOKEN };
