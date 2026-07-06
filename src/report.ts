import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";
import type { Finding, ScanReport, Severity } from "./types.ts";

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function severityBadge(s: Severity): string {
  switch (s) {
    case "high":
      return red(bold("HIGH  "));
    case "medium":
      return yellow(bold("MEDIUM"));
    case "low":
      return dim(bold("LOW   "));
  }
}

export function printReport(report: ScanReport) {
  const findings = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  console.log("");
  console.log(bold(`AMP link scan — ${report.site}`));
  console.log(
    dim(
      `${report.pagesScanned} page(s) scanned, ${report.ampPagesFound} with an AMP variant, ` +
        `${findings.length} finding(s)`,
    ),
  );

  const errored = report.pages.filter((p) => p.errors.length > 0);
  if (errored.length > 0) {
    console.log(dim(`${errored.length} page(s) had fetch errors (see JSON report for details)`));
  }

  if (findings.length === 0) {
    console.log("");
    console.log(green(bold("✓ No AMP-specific injections or cloaking detected.")));
    console.log(
      dim(
        "Note: this checks server-rendered HTML. Payloads injected at runtime by JS are out of scope.",
      ),
    );
    return;
  }

  const byPage = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byPage.get(f.page) ?? [];
    list.push(f);
    byPage.set(f.page, list);
  }

  for (const [page, pageFindings] of byPage) {
    console.log("");
    console.log(bold(cyan(page)));
    for (const f of pageFindings) {
      console.log(`  ${severityBadge(f.severity)} ${bold(f.type)}`);
      if (f.ampUrl && f.ampUrl !== page) console.log(dim(`         AMP variant: ${f.ampUrl}`));
      console.log(`         ${f.detail}`);
      for (const ev of f.evidence.slice(0, 8)) {
        console.log(red(`           ▸ ${ev}`));
      }
      if (f.evidence.length > 8) {
        console.log(dim(`           … and ${f.evidence.length - 8} more`));
      }
    }
  }

  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  console.log("");
  console.log(
    bold(
      `Summary: ${high > 0 ? red(`${high} high`) : "0 high"}, ${
        medium > 0 ? yellow(`${medium} medium`) : "0 medium"
      }, ${findings.length - high - medium} low`,
    ),
  );
}
