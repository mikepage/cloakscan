import type { FetchedPage, ProfileName } from "./types.ts";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const GOOGLEBOT_SMARTPHONE_UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Request profiles. AMP-cloaking malware typically keys on the user agent
 * (Googlebot / Google AMP cache) or on AMP-cache-specific request headers,
 * so the same URL is fetched with several disguises and the results diffed.
 */
const PROFILES: Record<ProfileName, Record<string, string>> = {
  browser: {
    "user-agent": CHROME_UA,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  },
  googlebot: {
    "user-agent": GOOGLEBOT_SMARTPHONE_UA,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  "amp-cache": {
    "user-agent": GOOGLEBOT_SMARTPHONE_UA,
    // Sent by browsers/caches requesting an AMP page for cache transformation.
    "amp-cache-transform": 'google;v="1..100"',
    accept: "application/signed-exchange;v=b3;q=0.9,text/html,application/xhtml+xml,*/*;q=0.8",
  },
};

export async function fetchPage(
  url: string,
  profile: ProfileName,
  timeoutMs: number,
): Promise<FetchedPage> {
  const base: FetchedPage = {
    requestedUrl: url,
    finalUrl: url,
    status: 0,
    contentType: "",
    html: "",
    profile,
  };
  try {
    const res = await fetch(url, {
      headers: PROFILES[profile],
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    base.finalUrl = res.url || url;
    base.status = res.status;
    base.contentType = res.headers.get("content-type") ?? "";
    if (base.contentType.includes("html") || base.contentType === "") {
      base.html = await res.text();
    } else {
      await res.body?.cancel();
    }
    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  }
}

export function isHtmlOk(page: FetchedPage): boolean {
  return !page.error && page.status >= 200 && page.status < 300 && page.html.length > 0;
}
