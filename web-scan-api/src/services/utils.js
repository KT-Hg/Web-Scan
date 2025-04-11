function detectReportTool(reportName) {
  const patterns = [
    { regex: /^DAST_ZAP_Report_/, tool: "ZAP" },
    { regex: /^DAST_Wapiti_Report_/, tool: "Wapiti" },
    { regex: /^SAST_SonarQube_Report_/, tool: "SonarQube" },
    { regex: /^SAST_Trivy_Report_/, tool: "Trivy" },
  ];

  for (let { regex, tool } of patterns) {
    if (regex.test(reportName)) {
      return tool;
    }
  }
  return "Unknown tool";
}
module.exports = {
  detectReportTool: detectReportTool,
};
