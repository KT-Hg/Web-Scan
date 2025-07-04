import { exec } from "child_process";
import fs from "fs";
import path from "path";
import moment from "moment";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const sonarPassword = process.env.SONAR_PASSWORD;
const reportPathOG = process.env.REPORT_PATH;

function buildSonarApiUrl(projectKey) {
  return `http://localhost:9000/api/ce/component?component=${projectKey}`;
}

function buildCurlCommand(projectKey, reportPath) {
  return `curl -u admin:${sonarPassword} "http://localhost:9000/api/issues/search?componentKeys=${projectKey}&resolved=false" -o "${reportPath}"`;
}

async function checkSonarQubeStatus(projectKey) {
  const url = buildSonarApiUrl(projectKey);
  const auth = { username: "admin", password: sonarPassword };

  try {
    const response = await axios.get(url, { auth });
    const tasks = response.data?.queue || [];

    return tasks.length === 0 ? "SUCCESS" : tasks[0]?.status;
  } catch (error) {
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

async function downloadSonarQubeReport(projectKey, reportPath) {
  return new Promise((resolve, reject) => {
    const curlCommand = buildCurlCommand(projectKey, reportPath);

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) console.warn(`Warning: ${stderr}`);

      resolve(reportPath);
    });
  });
}

export default downloadSonarQubeReport;
