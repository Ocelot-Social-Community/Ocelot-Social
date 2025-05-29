const report = require("multiple-cucumber-html-reporter");

const reportTitle = "Ocelot webapp end-to-end test report"

report.generate({
  jsonDir: "reports/json_logs",
  reportPath: "./reports/cucumber_html_report",
  pageTitle: reportTitle,
  reportName: reportTitle,
  pageFooter: "<div></div>",
  hideMetadata: true
});