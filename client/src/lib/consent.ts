const COOKIE_NAME = "monitoring_consent";
const COOKIE_MAX_AGE_DAYS = 365;

export type ConsentState = "granted" | "denied" | "pending";

export function getConsent(): ConsentState {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  if (value === "granted" || value === "denied") {
    return value;
  }
  return "pending";
}

export function setConsent(state: "granted" | "denied"): void {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not widely supported yet
  document.cookie = `${COOKIE_NAME}=${state}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
