import path from "path";
import { readFile } from "fs/promises";
import fs from "fs/promises";
require("dotenv").config();

let reportPath = process.env.REPORT_PATH;

function detectReportTool(reportName) {
  const patterns = [
    { regex: /^DAST_ZAP_Report_/, tool: "ZAP" },
    { regex: /^DAST_Wapiti_Report_/, tool: "Wapiti" },
    { regex: /^SAST_SonarQube_Report_/, tool: "SonarQube" },
    { regex: /^SAST_Trivy_Report_/, tool: "Trivy" },
    { regex: /^DAST_Report_/, tool: "DAST" },
    { regex: /^SAST_Report_/, tool: "SAST" },
  ];

  for (let { regex, tool } of patterns) {
    if (regex.test(reportName)) {
      return tool;
    }
  }
  return "Unknown tool";
}

function generateDASTReportVariants(originalName) {
  if (!originalName.startsWith("DAST_Report_")) {
    throw new Error("Tên không đúng định dạng DAST_Report_####");
  }

  const suffix = originalName.replace("DAST_Report_", "");
  const zap = `DAST_ZAP_Report_${suffix}`;
  const wapiti = `DAST_Wapiti_Report_${suffix}`;

  return [zap, wapiti];
}

function generateSASTReportVariants(originalName) {
  if (!originalName.startsWith("SAST_Report_")) {
    throw new Error("Tên không đúng định dạng SAST_Report_####");
  }

  const suffix = originalName.replace("SAST_Report_", "");
  const sonarQube = `SAST_SonarQube_Report_${suffix}`;
  const trivy = `SAST_Trivy_Report_${suffix}`;

  return [sonarQube, trivy];
}

let getReport = async (reportName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await readFile(`${reportPath + reportName}.json`, "utf8");
      const jsonData = JSON.parse(data);
      resolve(jsonData);
    } catch (error) {
      reject(error);
    }
  });
};

async function mergeDASTReports(reportName) {
  let reportNames = generateDASTReportVariants(reportName);
  let ZAPData = await getReport(reportNames[0]);
  let wapitiData = await getReport(reportNames[1]);

  const commonErrors = [];
  const wapitiErrors = [];
  const zapErrors = [];

  for (const [classification, vulnerabilities] of Object.entries(wapitiData.vulnerabilities)) {
    vulnerabilities.forEach((vul) => {
      const zapAlert = ZAPData.site
        .flatMap((site) => site.alerts)
        .find((alert) => alert.alertRef === vul.info);

      if (zapAlert) {
        commonErrors.push({
          Classification: classification,
          VulnerabilityID: vul.info,
          ZapAlert: zapAlert.alert,
          ZapRiskCode: zapAlert.riskcode,
          ZapConfidence: zapAlert.confidence,
          ZapRiskDesc: zapAlert.riskdesc,
          ZapDescription: zapAlert.desc,
          WapitiLevel: vul.level,
          WapitiMethod: vul.method,
          WapitiPath: vul.path,
          WapitiCurlCommand: vul.curl_command,
        });
      } else {
        wapitiErrors.push({
          Classification: classification,
          VulnerabilityID: vul.info,
          Level: vul.level,
          Method: vul.method,
          Path: vul.path,
          CurlCommand: vul.curl_command,
        });
      }
    });
  }

  ZAPData.site.forEach((site) => {
    site.alerts.forEach((alert) => {
      const match = Object.values(wapitiData.vulnerabilities)
        .flat()
        .find((vul) => vul.info === alert.alertRef);
      if (!match) {
        zapErrors.push({
          alert: alert.alert,
          riskcode: alert.riskcode,
          confidence: alert.confidence,
          riskdesc: alert.riskdesc,
          description: alert.desc,
          solution: alert.solution,
          references: alert.reference,
          cweid: alert.cweid,
          sourceid: alert.sourceid,
        });
      }
    });
  });

  return { commonErrors, wapitiErrors, zapErrors };
}

async function mergeSASTReports(reportName) {
  let reportNames = generateSASTReportVariants(reportName);
  let sonarQubeData = await getReport(reportNames[0]);
  let trivyData = await getReport(reportNames[1]);

  const commonErrors = [];
  const trivyErrors = [];
  const sonarQubeErrors = [];

  if (trivyData && Array.isArray(trivyData.Results)) {
    trivyData.Results.forEach((result) => {
      if (result.Vulnerabilities && Array.isArray(result.Vulnerabilities)) {
        result.Vulnerabilities.forEach((vul) => {
          const match =
            sonarQubeData && Array.isArray(sonarQubeData.issues)
              ? sonarQubeData.issues.find((issue) => issue.key === vul.VulnerabilityID)
              : null;

          if (match) {
            commonErrors.push({
              PkgName: vul.PkgName,
              VulnerabilityID: vul.VulnerabilityID,
              Title: vul.Title,
              Description: vul.Description,
              Severity: vul.Severity,
              PublishedDate: vul.PublishedDate,
              FixedVersion: vul.FixedVersion,
              Status: vul.Status,
              SonarQubeMessage: match.message,
              SonarQubeSeverity: match.severity,
              SonarQubeComponent: match.component,
              SonarQubeLine: match.line,
            });
          } else {
            trivyErrors.push(vul);
          }
        });
      }
    });
  }

  if (sonarQubeData && Array.isArray(sonarQubeData.issues)) {
    sonarQubeData.issues.forEach((issue) => {
      const found =
        trivyData && Array.isArray(trivyData.Results)
          ? trivyData.Results.some(
              (result) =>
                Array.isArray(result.Vulnerabilities) &&
                result.Vulnerabilities.some((vul) => vul.VulnerabilityID === issue.key)
            )
          : false;

      if (!found) sonarQubeErrors.push(issue);
    });
  }

  return { commonErrors, trivyErrors, sonarQubeErrors };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  detectReportTool: detectReportTool,
  generateDASTReportVariants: generateDASTReportVariants,
  generateSASTReportVariants: generateSASTReportVariants,
  getReport: getReport,
  mergeDASTReports: mergeDASTReports,
  mergeSASTReports: mergeSASTReports,
  delay: delay,
};
