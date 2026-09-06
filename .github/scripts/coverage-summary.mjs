import { readFileSync } from "node:fs";

const { total } = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));

const row = (label, metric) => `| ${label} | ${metric.covered}/${metric.total} | ${metric.pct}% |`;

const lines = [
  "## Coverage report",
  "",
  "| Metric | Covered/Total | % |",
  "| --- | --- | --- |",
  row("Statements", total.statements),
  row("Branches", total.branches),
  row("Functions", total.functions),
  row("Lines", total.lines),
];

process.stdout.write(lines.join("\n") + "\n");
