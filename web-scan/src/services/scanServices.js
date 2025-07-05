import fs from "fs/promises";
import path from "path";
import net from "net";
import { exec } from "child_process";
import axios from "axios";
import moment from "moment";
import Docker from "dockerode";
require("dotenv").config();

import db from "../models/index";
import downloadSonarQubeReport from "./downloadrp.js";
import TrivyServices from "./TrivyServices.js";
import crudServices from "../services/crudServices";
import { readFile } from "fs/promises";

const containerId = process.env.CONTAINER_ID;
const containerIdZap = process.env.CONTAINER_ID_ZAP;
const containerIdServer = process.env.CONTAINER_ID_SERVER;
const reportPathOG = process.env.REPORT_PATH;
const sonarToken = process.env.SONAR_TOKEN;
const sonarPassword = process.env.SONAR_PASSWORD;

const docker = new Docker();

function execShellCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

async function execCommandInContainer(containerId, command) {
  try {
    const container = docker.getContainer(containerId);
    const execInstance = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await execInstance.start({ Detach: false });
    const stdoutChunks = [];
    const stderrChunks = [];
    await new Promise((resolve, reject) => {
      container.modem.demuxStream(
        stream,
        { write: (chunk) => stdoutChunks.push(chunk) },
        { write: (chunk) => stderrChunks.push(chunk) }
      );
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    const inspectData = await execInstance.inspect();
    if (inspectData.ExitCode !== 0) {
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      throw new Error(`Command failed with exit code ${inspectData.ExitCode}: ${stderr}`);
    }
    return Buffer.concat(stdoutChunks).toString("utf8");
  } catch (err) {
    throw err;
  }
}

async function isPortAvailable(port, containerId) {
  const command = `docker exec -u root ${containerId} netstat -tulnp`;
  try {
    const stdout = await execShellCommand(command);
    const regex = new RegExp(`\\s*tcp.*:${port}\\s+.*`);
    return !regex.test(stdout);
  } catch {
    return false;
  }
}

async function getAvailablePort(startPort, containerId, range = 100) {
  for (let port = startPort; port < startPort + range; port++) {
    if (await isPortAvailable(port, containerId)) return port;
  }
  throw new Error("No available ports found");
}

function combineTokenWithGitUrl(token, gitUrl) {
  if (!token) return gitUrl;
  const regex = /^https:\/\/github\.com\/(.+?)(\.git)?$/;
  const match = gitUrl.match(regex);
  if (!match)
    throw new Error(
      "GitHub URL không hợp lệ. Phải có định dạng https://github.com/username/repo.git"
    );
  const path = match[1];
  return `https://${token}@github.com/${path}.git`;
}

async function createContainerSonarQube(projectKey) {
  const command = [
    "docker",
    "run",
    "--rm",
    "--network=host",
    "-e",
    "SONAR_HOST_URL=http://localhost:9000",
    "-v",
    "zap_volume:/zap",
    "-v",
    "sonarqube_volume:/usr/src",
    "sonarsource/sonar-scanner-cli",
    "sonar-scanner",
    `-Dsonar.projectKey=${projectKey}`,
    `-Dsonar.sources=/usr/src/${projectKey}`,
    "-Dsonar.host.url=http://localhost:9000",
    `-Dsonar.token=${sonarToken}`,
  ];
  await execShellCommand(command.join(" "));
}

async function createSonarQubeProject(projectKey) {
  const command = [
    "curl",
    "-u",
    `admin:${sonarPassword}`,
    "-X",
    "POST",
    "http://localhost:9000/api/projects/create",
    "-d",
    `name=${projectKey}`,
    "-d",
    `project=${projectKey}`,
  ].join(" ");
  const stdout = await execShellCommand(command);
  let response;
  try {
    response = JSON.parse(stdout);
  } catch {
    throw new Error(`Invalid response: ${stdout}`);
  }
  if (response.errors) throw new Error(`SonarQube API Error: ${JSON.stringify(response.errors)}`);
  return response;
}

async function deleteSonarQubeProject(projectKey) {
  const command = `curl -u admin:${sonarPassword} -X POST "http://localhost:9000/api/projects/delete?project=${projectKey}"`;
  await execShellCommand(command);
}

async function checkSonarQubeStatus(projectKey) {
  const sonarUrl = `http://localhost:9000/api/ce/component?component=${projectKey}`;
  const auth = { username: "admin", password: sonarPassword };
  try {
    const response = await axios.get(sonarUrl, { auth });
    const tasks = response.data?.queue || [];
    if (tasks.length === 0) return "SUCCESS";
    return tasks[0]?.status;
  } catch {
    return "ERROR";
  }
}

async function waitForSonarQubeCompletion(projectKey, maxRetries = 20, interval = 5000) {
  let retries = 0;
  while (retries < maxRetries) {
    const status = await checkSonarQubeStatus(projectKey);
    if (status === "SUCCESS") return true;
    if (status === "ERROR") throw new Error("SonarQube analysis failed!");
    await new Promise((resolve) => setTimeout(resolve, interval));
    retries++;
  }
  throw new Error("SonarQube analysis timed out.");
}

async function getSourceCodeGithub(target) {
  const command = ["sh", "-c", `cd sonarqube && git clone ${target}`];
  await execCommandInContainer(containerIdServer, command);
}

async function deleteSourceCodeOnServer(target) {
  const command = ["sh", "-c", `cd sonarqube && rm -r ${target}`];
  await execCommandInContainer(containerIdServer, command);
}

async function scanWapiti(target, tool = "Wapiti") {
  const timestamp = moment().format("HHmmssDDMMYY");
  const fileName = `DAST_Wapiti_Report_${timestamp}`;
  const reportPath = `/tmp/DAST_Wapiti_Report_${timestamp}.json`;
  await crudServices.createNewReport({
    name: fileName,
    type: "DAST",
    tool: "Wapiti",
    isProcessing: "1",
  });
  const command = [
    "wapiti",
    "--url",
    target,
    "-m",
    "htaccess,methods,cookieflags,http_headers,sql,csp,wapp,brute_login_form,csrf,ssrf",
    "-f",
    "json",
    "-o",
    reportPath,
    "--flush-session",
  ];
  console.log(`Executing command in container ${containerId}:`, command.join(" "));
  await execCommandInContainer(containerId, command);
  const newData = await crudServices.getReportByName(fileName);
  if (!newData) throw new Error("Report not found after scan.");
  newData.isProcessing = "0";
  await crudServices.updateReportData(newData);
  if (tool === "bothDAST") await checkAndMergeDASTReports(timestamp);
  return "Scan Wapiti successfully";
}

async function scanZAP(target, tool = "ZAP") {
  const timestamp = moment().format("HHmmssDDMMYY");
  const fileName = `DAST_ZAP_Report_${timestamp}`;
  const reportPath = `/tmp/${fileName}.json`;
  await crudServices.createNewReport({
    name: fileName,
    type: "DAST",
    tool: "ZAP",
    isProcessing: "1",
  });
  await execCommandInContainer(containerIdZap, ["rm", "-rf", "/home/zap/.ZAP_D/"]);
  const freePort = await getAvailablePort(8080, containerIdZap);
  const command = [
    "zap.sh",
    "-cmd",
    "-quickurl",
    target,
    "-port",
    freePort.toString(),
    "-quickprogress",
    "-quickout",
    reportPath,
  ];
  await execCommandInContainer(containerIdZap, command);
  const newData = await crudServices.getReportByName(fileName);
  if (!newData) throw new Error("Report not found after scan.");
  newData.isProcessing = "0";
  await crudServices.updateReportData(newData);
  if (tool === "bothDAST") await checkAndMergeDASTReports(timestamp);
  return "Scan ZAP successfully";
}

async function scanTrivy(target, tool = "Trivy", token = "") {
  const { volumeName, uploadDir } = TrivyServices.getPaths();
  const timestamp = moment().format("HHmmssDDMMYY");
  const fileName = `SAST_Trivy_Report_${timestamp}`;
  const reportPath = path.join(uploadDir, `${fileName}.json`);
  await crudServices.createNewReport({
    name: fileName,
    type: "SAST",
    tool: "Trivy",
    isProcessing: "1",
  });
  target = combineTokenWithGitUrl(token, target);
  try {
    await TrivyServices.checkOrCreateVolume(volumeName);
    await TrivyServices.cloneRepoIntoVolume(target, volumeName);
    await TrivyServices.runTrivyScan(volumeName, uploadDir, reportPath);
    const newData = await crudServices.getReportByName(fileName);
    if (!newData) throw new Error("Report not found after scan.");
    newData.isProcessing = "0";
    await crudServices.updateReportData(newData);
    if (tool === "bothSAST") await checkAndMergeSASTReports(timestamp);
    return reportPath;
  } finally {
    await TrivyServices.cleanupVolume(volumeName);
  }
}

async function scanSonarQube(target, tool = "SonarQube", token = "") {
  const timestamp = moment().format("HHmmssDDMMYY");
  const fileName = `SAST_SonarQube_Report_${timestamp}`;
  const reportPath = path.join(reportPathOG, `${fileName}.json`);
  const projectKey = target.split("/").pop().replace(".git", "");
  await crudServices.createNewReport({
    name: fileName,
    type: "SAST",
    tool: "SonarQube",
    isProcessing: "1",
  });
  target = combineTokenWithGitUrl(token, target);
  await getSourceCodeGithub(target);
  await deleteSonarQubeProject(projectKey);
  await createSonarQubeProject(projectKey);
  await createContainerSonarQube(projectKey);
  await waitForSonarQubeCompletion(projectKey);
  await downloadSonarQubeReport(projectKey, reportPath);
  await deleteSourceCodeOnServer(projectKey);
  await deleteSonarQubeProject(projectKey);
  const newData = await crudServices.getReportByName(fileName);
  if (!newData) throw new Error("Report not found after scan.");
  newData.isProcessing = "0";
  await crudServices.updateReportData(newData);
  if (tool === "bothSAST") await checkAndMergeSASTReports(timestamp);
  return "Scan SonarQube successfully";
}

async function checkAndMergeDASTReports(timestamp) {
  const zapReportName = `DAST_ZAP_Report_${timestamp}`;
  const wapitiReportName = `DAST_Wapiti_Report_${timestamp}`;
  const zapReport = await crudServices.getReportByName(zapReportName);
  const wapitiReport = await crudServices.getReportByName(wapitiReportName);
  if (!zapReport || !wapitiReport) throw new Error("Một trong hai báo cáo không tồn tại.");
  if (!zapReport.isProcessing && !wapitiReport.isProcessing) {
    const mergedData = {
      name: `DAST_Report_${timestamp}`,
      type: "DAST",
      tool: "ZAP, Wapiti",
      isProcessing: "0",
    };
    await crudServices.createNewReport(mergedData);
    return "Đã tạo báo cáo tổng hợp thành công.";
  }
  return "Một trong hai báo cáo vẫn đang xử lý.";
}

async function checkAndMergeSASTReports(timestamp) {
  const trivyReportName = `SAST_Trivy_Report_${timestamp}`;
  const sonarReportName = `SAST_SonarQube_Report_${timestamp}`;
  const trivyReport = await crudServices.getReportByName(trivyReportName);
  const sonarReport = await crudServices.getReportByName(sonarReportName);
  if (!trivyReport || !sonarReport) throw new Error("Một trong hai báo cáo không tồn tại.");
  if (!trivyReport.isProcessing && !sonarReport.isProcessing) {
    const mergedData = {
      name: `SAST_Report_${timestamp}`,
      type: "SAST",
      tool: "Trivy, SonarQube",
      isProcessing: "0",
    };
    await crudServices.createNewReport(mergedData);
    return "Đã tạo báo cáo tổng hợp SAST thành công.";
  }
  return "Một trong hai báo cáo SAST vẫn đang xử lý.";
}

async function getReport(reportName) {
  const data = await readFile(`${reportPathOG + reportName}.json`, "utf8");
  return JSON.parse(data);
}

export default {
  scanWapiti,
  scanZAP,
  scanSonarQube,
  scanTrivy,
  getReport,
};
