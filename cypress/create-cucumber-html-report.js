const reportTitle = "Ocelot webapp end-to-end test report"

// multiple-cucumber-html-reporter@4 is ESM-only (package.json "exports" has
// no "require" condition) — a dynamic import (wrapped here since this script
// itself is plain CommonJS, where top-level await isn't available) is what
// lets it still be consumed.
;(async () => {
  const { generate } = await import("multiple-cucumber-html-reporter");

  await generate({
    jsonDir: "reports/json_logs",
    reportPath: "./reports/cucumber_html_report",
    pageTitle: reportTitle,
    reportName: reportTitle,
    pageFooter: "<div></div>",
    hideMetadata: true
  });
})().catch((error) => {
  console.error("Failed to generate the cucumber HTML report:", error);
  process.exitCode = 1;
});