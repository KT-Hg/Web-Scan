import { exec } from "child_process";
import fs from "fs";
import path from "path";
import moment from "moment";
import dotenv from "dotenv";
dotenv.config();

const sonarPassword = process.env.SONAR_PASSWORD;
const reportPathOG = process.env.REPORT_PATH;

async function checkSonarQubeStatus(projectKey) {
  const sonarUrl = `http://localhost:9000/api/ce/component?component=${projectKey}`;
  const auth = { username: "admin", password: sonarPassword };

  try {
    const response = await axios.get(sonarUrl, { auth });
    const tasks = response.data?.queue || [];

    if (tasks.length === 0) {
      return "SUCCESS"; // Không có task nào chờ -> đã xong
    }

    return tasks[0]?.status; // Trả về trạng thái thực tế của SonarQube
  } catch (error) {
    console.error("Error checking SonarQube status:", error.response?.data);
    return "ERROR";
  }
}

async function waitForSonarQubeCompletion(projectKey, maxRetries = 20, interval = 5000) {
  let retries = 0;

  while (retries < maxRetries) {
    const status = await checkSonarQubeStatus(projectKey);

    if (status === "SUCCESS") {
      console.log("SonarQube analysis completed.");
      return true;
    }

    if (status === "ERROR") {
      throw new Error("SonarQube analysis failed!");
    }

    console.log(`SonarQube analysis in progress... (${retries + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, interval));
    retries++;
  }

  throw new Error("SonarQube analysis timed out.");
}

async function downloadSonarQubeReport(projectKey, reportPath) {
  return new Promise((resolve, reject) => {

    // Lệnh curl để tải báo cáo từ SonarQube
    const curlCommand = `curl -u admin:${sonarPassword} "http://localhost:9000/api/issues/search?componentKeys=${projectKey}&resolved=false" -o "${reportPath}"`;
    console.log(`📡 Running command: ${curlCommand}`);

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }

      console.log(`Report saved at: ${reportPath}`);
      resolve(reportPath);
    });
  });
}

// Xuất hàm để sử dụng ở file khác
export default downloadSonarQubeReport;
