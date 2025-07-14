import { exec } from "child_process";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const SONAR_PASSWORD = process.env.SONAR_PASSWORD;

const buildSonarApiUrl = (projectKey) => `http://localhost:9000/api/ce/component?component=${projectKey}`;

const buildSonarIssuesUrl = (projectKey) => `http://localhost:9000/api/issues/search?componentKeys=${projectKey}&resolved=false`;

const buildCurlCommand = (projectKey, reportPath) => `curl -u admin:${SONAR_PASSWORD} "${buildSonarIssuesUrl(projectKey)}" -o "${reportPath}"`;

async function checkSonarQubeStatus(projectKey) {
  const url = buildSonarApiUrl(projectKey);
  const auth = { username: "admin", password: SONAR_PASSWORD };
  try {
    const response = await axios.get(url, { auth });
    const tasks = response.data?.queue || [];
    return tasks.length === 0 ? "SUCCESS" : tasks[0]?.status;
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

async function downloadSonarQubeReport(projectKey, reportPath) {
  const curlCommand = buildCurlCommand(projectKey, reportPath);
  return new Promise((resolve, reject) => {
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

export default downloadSonarQubeReport;
