/** Common second-level registries so `shop.example.co.uk` groups under `example.co.uk`. */
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "ac", "edu", "or", "ne"]);

/** Approximate registrable domain (eTLD+1) without a full public-suffix list. */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];
  const take = tld.length === 2 && SECOND_LEVEL.has(sld) ? 3 : 2;
  return labels.slice(-take).join(".");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function sameSite(url: string, siteDomain: string): boolean {
  const host = hostOf(url);
  return host !== "" && registrableDomain(host) === siteDomain;
}

/** Resolve href against base; return absolute http(s) URL without fragment, or null. */
export function resolveHttpUrl(href: string, baseUrl: string): string | null {
  try {
    const u = new URL(href.trim(), baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

/** Canonical key for visited-set deduplication. */
export function normalizeForVisit(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return url;
  }
}

/** Candidate AMP endpoints malware commonly registers without linking to them. */
export function guessAmpCandidates(pageUrl: string): string[] {
  const out: string[] = [];
  try {
    const u = new URL(pageUrl);

    const withPath = new URL(u.href);
    withPath.pathname = u.pathname.endsWith("/") ? `${u.pathname}amp/` : `${u.pathname}/amp/`;
    out.push(withPath.href);

    const withQuery = new URL(u.href);
    withQuery.searchParams.set("amp", "1");
    out.push(withQuery.href);

    const bareQuery = new URL(u.href);
    bareQuery.search = u.search ? `${u.search}&amp` : "?amp";
    out.push(bareQuery.href);
  } catch {
    // ignore malformed URLs
  }
  return out.filter((c) => c !== pageUrl);
}
