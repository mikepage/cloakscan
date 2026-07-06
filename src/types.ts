export type ProfileName = "browser" | "googlebot" | "amp-cache";

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  profile: ProfileName;
  error?: string;
}

export interface Artifacts {
  /** Absolute http(s) URLs of <a href> */
  links: string[];
  /** Absolute http(s) URLs of <script src> */
  scripts: string[];
  /** Bodies of inline <script> tags that are executable JS (not JSON/LD+JSON) */
  inlineScripts: string[];
  /** Absolute http(s) URLs of <iframe src> */
  iframes: string[];
  /** Absolute http(s) URLs of <form action> */
  forms: string[];
  /** Target URL of <meta http-equiv=refresh>, if any */
  metaRefresh: string | null;
  /** Document has <html amp> or <html ⚡> */
  isAmp: boolean;
  /** Resolved <link rel=amphtml> href, if any */
  ampUrl: string | null;
  /** Resolved <link rel=canonical> href, if any */
  canonicalUrl: string | null;
}

export type Severity = "high" | "medium" | "low";

export type FindingType =
  | "amp-cloaked-injection"
  | "ua-cloaking"
  | "amp-only-external-link"
  | "amp-only-script"
  | "amp-only-iframe"
  | "disallowed-script-in-amp"
  | "inline-script-in-amp"
  | "meta-refresh-in-amp"
  | "amp-only-form"
  | "hidden-amp-endpoint";

export interface Finding {
  type: FindingType;
  severity: Severity;
  page: string;
  ampUrl?: string;
  detail: string;
  evidence: string[];
}

export interface PageResult {
  url: string;
  ampUrl: string | null;
  ampDiscovery: "declared" | "guessed" | "self" | "none";
  findings: Finding[];
  errors: string[];
}

export interface ScanOptions {
  startUrl: string;
  maxPages: number;
  concurrency: number;
  timeoutMs: number;
  guessAmp: boolean;
  quiet: boolean;
}

export interface ScanReport {
  site: string;
  startedAt: string;
  finishedAt: string;
  pagesScanned: number;
  ampPagesFound: number;
  findings: Finding[];
  pages: PageResult[];
}
