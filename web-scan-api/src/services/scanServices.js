import db from "../models/index";
import net from "net";
import axios from "axios";
import moment from "moment";
import Docker from "dockerode";
import downloadSonarQubeReport from "./downloadrp.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import TrivyServices from "./TrivyServices.js";
import crudServices from "../services/crudServices";
import { readFile } from "fs/promises";
//import { console } from "inspector";
import { type } from "os";
require("dotenv").config();

let containerId = process.env.CONTAINER_ID;
let containerIdZap = process.env.CONTAINER_ID_ZAP;
let containerIdServer = process.env.CONTAINER_ID_SERVER;
let reportPathOG = process.env.REPORT_PATH;
let sonarToken = process.env.SONAR_TOKEN;
let sonarPassword = process.env.SONAR_PASSWORD;

const docker = new Docker(); // Sử dụng cấu hình mặc định (socket Docker)

async function execCommandInContainer(containerId, command) {
  try {
    const container = docker.getContainer(containerId);

    // Tạo exec instance
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    // Khởi chạy lệnh, lấy stream output
    const stream = await exec.start({ Detach: false });

    // Gắn stream để đọc dữ liệu stdout và stderr
    // Dockerode trả về stream dạng multiplexed, cần tách từng phần (stdout, stderr)
    const stdoutChunks = [];
    const stderrChunks = [];

    await new Promise((resolve, reject) => {
      container.modem.demuxStream(
        stream,
        {
          write: (chunk) => stdoutChunks.push(chunk),
        },
        {
          write: (chunk) => stderrChunks.push(chunk),
        }
      );

      stream.on("end", resolve);
      stream.on("error", reject);
    });

    // Lấy kết quả exec (statusCode)
    const inspectData = await exec.inspect();

    if (inspectData.ExitCode !== 0) {
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      throw new Error(`Command failed with exit code ${inspectData.ExitCode}: ${stderr}`);
    }

    const stdout = Buffer.concat(stdoutChunks).toString("utf8");

    return stdout; // hoặc trả về object tùy ý
  } catch (err) {
    console.error("Error executing command:", err);
    throw err; // đẩy lỗi lên trên để caller có thể xử lý
  }
}

// Hàm kiểm tra cổng có khả dụng hay không
async function isPortAvailable(port, containerId) {
  return new Promise((resolve, reject) => {
    // Lệnh netstat để kiểm tra các cổng đang lắng nghe trong container
    const command = `docker exec -u root ${containerId} netstat -tulnp`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Lỗi khi thực thi lệnh: ${error.message}`);
        return;
      }

      if (stderr) {
        reject(`Lỗi: ${stderr}`);
        return;
      }

      // Kiểm tra nếu cổng có trong kết quả netstat
      const regex = new RegExp(`\\s*tcp.*:${port}\\s+.*`);
      if (regex.test(stdout)) {
        resolve(false); // Cổng không khả dụng vì đã được sử dụng
      } else {
        resolve(true); // Cổng khả dụng
      }
    });
  });
}

function combineTokenWithGitUrl(token, gitUrl) {
  // Nếu token rỗng, trả về URL gốc
  if (!token) return gitUrl;

  // Kiểm tra định dạng URL GitHub
  const regex = /^https:\/\/github\.com\/(.+?)(\.git)?$/;
  const match = gitUrl.match(regex);

  if (!match) {
    throw new Error(
      "GitHub URL không hợp lệ. Phải có định dạng https://github.com/username/repo.git"
    );
  }

  const path = match[1];
  return `https://${token}@github.com/${path}.git`;
}

async function createContainerSonarQube(projectKey) {
  return new Promise((resolve, reject) => {
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

    exec(command.join(" "), (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${error.message}`);
        return;
      }

      if (stderr) {
        reject(`Error: ${stderr}`);
        return;
      }

      resolve(stdout);
    });
  });
}

async function createSonarQubeProject(projectKey) {
  return new Promise((resolve, reject) => {
    let projectName = projectKey;
    let command = [
      "curl",
      "-u",
      `admin:${sonarPassword}`,
      "-X",
      "POST",
      "http://localhost:9000/api/projects/create",
      "-d",
      `name=${projectName}`,
      "-d",
      `project=${projectKey}`,
    ];

    exec(command.join(" "), (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${error.message}`);
        return;
      }

      // Kiểm tra xem stderr có phải là lỗi thực sự hay không
      if (stderr && stderr.trim()) {
        console.warn(`Warning: ${stderr}`);
      }

      try {
        let response = JSON.parse(stdout); // Kiểm tra JSON response từ API
        if (response.errors) {
          reject(`SonarQube API Error: ${JSON.stringify(response.errors)}`);
        } else {
          resolve(response);
        }
      } catch (err) {
        reject(`Invalid response: ${stdout}`);
      }
    });
  });
}

// Hàm tìm cổng khả dụng trong một khoảng
async function getAvailablePort(startPort, containerId, range = 100) {
  for (let port = startPort; port < startPort + range; port++) {
    const available = await isPortAvailable(port, containerId);
    if (available) {
      return port; // Trả về cổng khả dụng đầu tiên tìm được
    }
  }
  throw new Error("No available ports found");
}

let checkAndMergeDASTReports = async (timestamp) => {
  const zapReportName = `DAST_ZAP_Report_${timestamp}`;
  const wapitiReportName = `DAST_Wapiti_Report_${timestamp}`;

  // Lấy dữ liệu từ database
  const zapReport = await crudServices.getReportByName(zapReportName);
  const wapitiReport = await crudServices.getReportByName(wapitiReportName);

  if (!zapReport || !wapitiReport) {
    throw new Error("Một trong hai báo cáo không tồn tại.");
  }

  const isZapDone = !zapReport.isProcessing;
  const isWapitiDone = !wapitiReport.isProcessing;

  // Nếu cả hai đã xử lý xong, tạo báo cáo tổng hợp
  if (isZapDone && isWapitiDone) {
    const mergedName = `DAST_Report_${timestamp}`;
    const mergedData = {
      name: mergedName,
      type: "DAST",
      tool: "ZAP, Wapiti",
      isProcessing: "0",
    };

    await crudServices.createNewReport(mergedData);
    return "Đã tạo báo cáo tổng hợp thành công.";
  }

  return "Một trong hai báo cáo vẫn đang xử lý.";
};

let scanWapiti = async (target, tool = Wapiti) => {
  const timestamp = moment().format("HHmmssDDMMYY");
  let fileName = `DAST_Wapiti_Report_${timestamp}`;
  let data = { name: fileName, type: "DAST", tool: "Wapiti", isProcessing: "1" };
  crudServices.createNewReport(data);
  const reportPath = `/tmp/DAST_Wapiti_Report_${timestamp}.json`;
  let command = [
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
  await execCommandInContainer(containerId, command);
  let newData = await crudServices.getReportByName(fileName);
  if (!newData) {
    throw new Error("Report not found after scan.");
  }
  newData.isProcessing = "0";
  await crudServices.updateReportData(newData);
  if (tool === "bothDAST") {
    await checkAndMergeDASTReports(timestamp)
      .then((message) => {
        console.log(message);
      })
      .catch((error) => {
        console.error("Error merging DAST reports:", error);
      });
  }
  return "Scan Wapiti successfully";
};

let scanZAP = async (target, tool = ZAP) => {
  const timestamp = moment().format("HHmmssDDMMYY");
  let fileName = `DAST_ZAP_Report_${timestamp}`;
  let data = { name: fileName, type: "DAST", tool: "ZAP", isProcessing: "1" };
  crudServices.createNewReport(data);

  const reportPath = `/tmp/${fileName}.json`;

  // Dọn thư mục dữ liệu cũ của ZAP
  let command = ["rm", "-rf", "/home/zap/.ZAP_D/"];
  await execCommandInContainer(containerIdZap, command);

  // Tìm cổng trống
  const freePort = await getAvailablePort(8080, containerIdZap);

  // Thực thi lệnh quét ZAP
  command = [
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

  // Cập nhật lại thông tin báo cáo
  let newData = await crudServices.getReportByName(fileName);
  if (!newData) {
    throw new Error("Report not found after scan.");
  }
  newData.isProcessing = "0";
  await crudServices.updateReportData(newData);

  // Nếu quét cả hai công cụ
  if (tool === "bothDAST") {
    await checkAndMergeDASTReports(timestamp)
      .then((message) => {
        console.log(message);
      })
      .catch((error) => {
        console.error("Error merging DAST reports:", error);
      });
  }
  return "Scan ZAP successfully";
};

let checkAndMergeSASTReports = async (timestamp) => {
  const trivyReportName = `SAST_Trivy_Report_${timestamp}`;
  const sonarReportName = `SAST_SonarQube_Report_${timestamp}`;

  // Lấy dữ liệu từ database
  const trivyReport = await crudServices.getReportByName(trivyReportName);
  const sonarReport = await crudServices.getReportByName(sonarReportName);

  if (!trivyReport || !sonarReport) {
    throw new Error("Một trong hai báo cáo không tồn tại.");
  }

  const isTrivyDone = !trivyReport.isProcessing;
  const isSonarDone = !sonarReport.isProcessing;

  // Nếu cả hai đã xử lý xong, tạo báo cáo tổng hợp
  if (isTrivyDone && isSonarDone) {
    const mergedName = `SAST_Report_${timestamp}`;
    const mergedData = {
      name: mergedName,
      type: "SAST",
      tool: "Trivy, SonarQube",
      isProcessing: "0",
    };

    await crudServices.createNewReport(mergedData);
    return "Đã tạo báo cáo tổng hợp SAST thành công.";
  }

  return "Một trong hai báo cáo SAST vẫn đang xử lý.";
};

let scanTrivy = async (target, tool = Trivy, token = "") => {
  const { volumeName, uploadDir } = TrivyServices.getPaths();
  const timestamp = moment().format("HHmmssDDMMYY");
  let fileName = `SAST_Trivy_Report_${timestamp}`;
  let data = { name: fileName, type: "SAST", tool: "Trivy", isProcessing: "1" };
  crudServices.createNewReport(data);
  //const reportPath = path.join(uploadDir, `SAST_Trivy_Report_${timestamp}.json`);
  const reportPath = path.join(uploadDir, `${fileName}.json`);
  //const reportPath = path.join(uploadDir, `trivy-security-report-${Date.now()}.json`);
  target = combineTokenWithGitUrl(token, target);
  try {
    await TrivyServices.checkOrCreateVolume(volumeName);
    await TrivyServices.cloneRepoIntoVolume(target, volumeName);
    await TrivyServices.runTrivyScan(volumeName, uploadDir, reportPath);
    let newData = await crudServices.getReportByName(fileName);
    if (!newData) {
      throw new Error("Report not found after scan.");
    }
    newData.isProcessing = "0";
    await crudServices.updateReportData(newData);
    if (tool === "bothSAST") {
      checkAndMergeSASTReports(timestamp)
        .then((message) => {
          console.log(message);
        })
        .catch((error) => {
          console.error("Error merging SAST reports:", error);
        });
    }
    return reportPath;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await TrivyServices.cleanupVolume(volumeName);
  }
};

let getSourceCodeGithub = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["sh", "-c", `cd sonarqube && git clone ${target}`];
      execCommandInContainer(containerIdServer, command);
      console.log("Get Source Code Github successfully");
      resolve("Get Source Code Github successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let deleteSourceCodeOnServer = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["sh", "-c", `cd sonarqube && rm -r ${target}`];
      execCommandInContainer(containerIdServer, command);
      console.log("Delete Source Code Github successfully");
      resolve("Delete Source Code Github successfully");
    } catch (error) {
      reject(error);
    }
  });
};

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

async function deleteSonarQubeProject(projectKey) {
  return new Promise((resolve, reject) => {
    const curlCommand = `curl -u admin:${sonarPassword} -X POST "http://localhost:9000/api/projects/delete?project=${projectKey}"`;

    console.log(`Deleting project: ${projectKey}`);

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error deleting project: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr && stderr.includes("error")) {
        console.warn(`Warning: ${stderr}`);
        reject(stderr);
        return;
      }

      console.log(`Project ${projectKey} deleted successfully.`);
      resolve(stdout);
    });
  });
}

let scanSonarQube = async (target, tool = SonarQube, token = "") => {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = moment().format("HHmmssDDMMYY");
      let fileName = `SAST_SonarQube_Report_${timestamp}`;
      let data = { name: fileName, type: "SAST", tool: "SonarQube", isProcessing: "1" };
      crudServices.createNewReport(data);
      const reportPath = path.join(reportPathOG, `${fileName}.json`);
      const projectKey = target.split("/").pop().replace(".git", "");
      target = combineTokenWithGitUrl(token, target);
      await getSourceCodeGithub(target);
      await deleteSonarQubeProject(projectKey);
      await createSonarQubeProject(projectKey);
      await createContainerSonarQube(projectKey);
      await waitForSonarQubeCompletion(projectKey);
      await downloadSonarQubeReport(projectKey, reportPath);
      await deleteSourceCodeOnServer(projectKey);
      await deleteSonarQubeProject(projectKey);
      let newData = await crudServices.getReportByName(fileName);
      if (!newData) {
        throw new Error("Report not found after scan.");
      }
      newData.isProcessing = "0";
      await crudServices.updateReportData(newData);
      if (tool === "bothSAST") {
        checkAndMergeSASTReports(timestamp)
          .then((message) => {
            console.log(message);
          })
          .catch((error) => {
            console.error("Error merging SAST reports:", error);
          });
      }
      resolve("Scan SonarQube successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let getReport = async (reportName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await readFile(`${reportPathOG + reportName}.json`, "utf8");
      const jsonData = JSON.parse(data);
      resolve(jsonData);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  scanWapiti: scanWapiti,
  scanZAP: scanZAP,
  scanSonarQube: scanSonarQube,
  scanTrivy: scanTrivy,
  getReport: getReport,
};
