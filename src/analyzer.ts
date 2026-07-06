import { DOMParser, type HTMLDocument } from "@b-fuze/deno-dom";
import type { Artifacts } from "./types.ts";
import { hostOf, registrableDomain, resolveHttpUrl } from "./urls.ts";

/** The only script host allowed in a valid AMP document. */
export const AMP_RUNTIME_HOST = "cdn.ampproject.org";

/** Hosts that are benign noise in diffs (AMP runtime, fonts, consent, analytics loaders). */
const BENIGN_DIFF_HOSTS = new Set([
  "cdn.ampproject.org",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "www.gstatic.com",
  "www.google.com",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "schema.org",
]);

/**
 * Keywords typical of SEO-spam payloads injected via AMP cloaking.
 * A hit upgrades a finding's severity; it never creates one on its own.
 */
const SPAM_KEYWORDS = [
  "casino",
  "poker",
  "slot",
  "betting",
  "gambl",
  "togel",
  "judi",
  "viagra",
  "cialis",
  "pharma",
  "pills",
  "porn",
  "xxx",
  "escort",
  "adult",
  "payday",
  "loan",
  "forex",
  "crypto-invest",
  "replica",
  "essay",
  "jersey",
  "oakley",
  "vuitton",
];

export function parseHtml(html: string): HTMLDocument | null {
  try {
    return new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
}

function isJsonScriptType(type: string): boolean {
  const t = type.trim().toLowerCase();
  return t === "application/json" || t === "application/ld+json";
}

export function extractArtifacts(html: string, baseUrl: string): Artifacts {
  const empty: Artifacts = {
    links: [],
    scripts: [],
    inlineScripts: [],
    iframes: [],
    forms: [],
    metaRefresh: null,
    isAmp: false,
    ampUrl: null,
    canonicalUrl: null,
  };
  const doc = parseHtml(html);
  if (!doc) return empty;

  const root = doc.documentElement;
  empty.isAmp = root !== null &&
    (root.hasAttribute("amp") || root.hasAttribute("⚡") || root.hasAttribute("⚡️"));

  const collect = (selector: string, attr: string, into: string[]) => {
    for (const el of doc.querySelectorAll(selector)) {
      const raw = el.getAttribute(attr);
      if (!raw) continue;
      const abs = resolveHttpUrl(raw, baseUrl);
      if (abs) into.push(abs);
    }
  };

  collect("a[href]", "href", empty.links);
  collect("script[src]", "src", empty.scripts);
  collect("iframe[src]", "src", empty.iframes);
  collect("form[action]", "action", empty.forms);

  for (const el of doc.querySelectorAll("script:not([src])")) {
    const type = el.getAttribute("type") ?? "text/javascript";
    if (isJsonScriptType(type)) continue;
    const body = el.textContent?.trim() ?? "";
    if (body.length > 0) empty.inlineScripts.push(body);
  }

  const ampLink = doc.querySelector('link[rel~="amphtml"]')?.getAttribute("href");
  if (ampLink) empty.ampUrl = resolveHttpUrl(ampLink, baseUrl);
  const canonical = doc.querySelector('link[rel~="canonical"]')?.getAttribute("href");
  if (canonical) empty.canonicalUrl = resolveHttpUrl(canonical, baseUrl);

  const refresh = doc.querySelector('meta[http-equiv="refresh" i]')?.getAttribute("content");
  if (refresh) {
    const m = refresh.match(/url\s*=\s*['"]?([^'";]+)/i);
    if (m) empty.metaRefresh = resolveHttpUrl(m[1], baseUrl);
  }

  return empty;
}

/** URLs in `candidate` whose host is external to the site and absent from `reference`. */
export function newExternalUrls(
  candidate: string[],
  reference: string[],
  siteDomain: string,
): string[] {
  const refHosts = new Set(reference.map(hostOf).filter(Boolean));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of candidate) {
    const host = hostOf(url);
    if (!host || refHosts.has(host) || BENIGN_DIFF_HOSTS.has(host)) continue;
    if (registrableDomain(host) === siteDomain) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function looksLikeSpam(urls: string[]): boolean {
  return urls.some((u) => {
    const s = u.toLowerCase();
    return SPAM_KEYWORDS.some((k) => s.includes(k));
  });
}

/** Script srcs in an AMP document that are not the AMP runtime/extensions. */
export function disallowedAmpScripts(scripts: string[]): string[] {
  return scripts.filter((s) => hostOf(s) !== AMP_RUNTIME_HOST);
}

export function truncate(s: string, max = 200): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : oneLine.slice(0, max) + "…";
}
