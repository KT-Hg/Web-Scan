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
import { console } from "inspector";
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
    // Lấy container bằng ID
    const container = docker.getContainer(containerId);

    // Tạo một exec instance
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    // Chạy lệnh trong container và thu thập kết quả
    const stream = await exec.start({ Detach: false });

    // Xử lý output
    stream.on("data", (chunk) => {
      console.log(chunk.toString());
    });

    stream.on("end", () => {
      console.log("Command execution finished.");
    });
  } catch (err) {
    console.error("Error executing command:", err);
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

let scanWapiti = async (target, tool = Wapiti) => {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = moment().format("HHmmssDDMMYY");
      let fileName = `DAST_Wapiti_Report_${timestamp}`;
      let data = { name: fileName, type: "DAST", tool: "Wapiti" };
      crudServices.createNewReport(data);
      const reportPath = `/tmp/DAST_Wapiti_Report_${timestamp}.json`;
      console.log(reportPath);
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
      execCommandInContainer(containerId, command);
      resolve("Scan Wapiti successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let scanZAP = async (target, tool = ZAP) => {
  return new Promise(async (resolve, reject) => {
    try {
      let command = ["rm", "-rf", "/home/zap/.ZAP_D/"];
      execCommandInContainer(containerIdZap, command);
      const timestamp = moment().format("HHmmssDDMMYY");
      let fileName = `DAST_ZAP_Report_${timestamp}`;
      let data = { name: fileName, type: "DAST", tool: "ZAP" };
      const reportPath = `/tmp/${fileName}.json`;
      const freePort = await getAvailablePort(8080, containerIdZap);
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
      execCommandInContainer(containerIdZap, command);
      crudServices.createNewReport(data);
      if (tool === "bothDAST") {
        console.log("aa");
        fileName = `DAST_Report_${timestamp}`;
        data.name = fileName;
        data.type = "DAST";
        data.tool = "ZAP, Wapiti";
        crudServices.createNewReport(data);
      }
      resolve("Scan ZAP successfully");
    } catch (error) {
      reject(error);
    }
  });
};

// let scanTrivy = async (target, tool = Trivy) => {
//   return new Promise((resolve, reject) => {
//     // const uploadDir = path.resolve("./src/uploads");
//     const uploadDir = reportPathOG;
//     const timestamp = moment().format("HHmmssDDMMYY");
//     let fileName = `SAST_Trivy_Report_${timestamp}`;
//     let data = { name: fileName, type: 1 };
//     crudServices.createNewReport(data);
//     //const reportPath = path.join(uploadDir, `SAST_Trivy_Report_${timestamp}.json`);
//     const reportPath = path.join(uploadDir, `${fileName}.json`);
//     const volumeName = "trivy_volume";

//     try {
//       // Kiểm tra và tạo volume nếu chưa có
//       exec(`docker volume inspect ${volumeName}`, (error) => {
//         if (error) {
//           console.log(`Volume '${volumeName}' not found. Creating...`);
//           exec(`docker volume create ${volumeName}`, (err) => {
//             if (err) return reject(`Failed to create volume: ${err.message}`);
//             console.log("✅ Docker volume created:", volumeName);
//             cloneAndScan();
//           });
//         } else {
//           console.log(`✅ Using existing volume: ${volumeName}`);
//           cloneAndScan();
//         }
//       });

//       // Clone repo và thực hiện quét
//       const cloneAndScan = () => {
//         if (!target.startsWith("https://github.com/")) {
//           return reject("❌ Invalid GitHub repo URL.");
//         }

//         const cloneCommand = ["docker", "run", "--rm", "-v", `${volumeName}:/app`, "alpine/git", "clone", target, "/app"];

//         exec(cloneCommand.join(" "), (error) => {
//           if (error) return reject(`❌ Failed to clone repo: ${error.message}`);
//           console.log("✅ Repo cloned successfully into volume.");

//           // Chạy Trivy quét bảo mật + secrets
//           const scanCommand = [
//             "docker",
//             "run",
//             "--rm",
//             "-v",
//             `${volumeName}:/app`,
//             "-v",
//             `${uploadDir}:/output`,
//             "aquasec/trivy:latest",
//             "fs",
//             "--format",
//             "json",
//             "-o",
//             `/output/${path.basename(reportPath)}`,
//             "--severity",
//             "CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN",
//             "--scanners",
//             "vuln,secret",
//             "--detection-priority",
//             "comprehensive",
//             "--parallel",
//             "10",
//             "/app",
//           ];

//           exec(scanCommand.join(" "), (error, stdout, stderr) => {
//             if (error) return reject(`❌ Trivy scan failed: ${error.message}`);
//             if (stderr) console.warn("⚠️ Trivy warnings:", stderr);

//             // Dọn dẹp repo đã clone trong volume
//             exec(`docker volume rm ${volumeName}`, (err) => {
//               if (err) console.error(" Failed to remove volume:", err.message);
//               else console.log(` Removed volume: ${volumeName}`);
//               console.log("Report saved at:", reportPath);
//               resolve(reportPath);
//             });
//           });
//         });
//       };
//     } catch (error) {
//       reject(`❌ Unexpected error: ${error.message}`);
//     }
//   });
// };

let scanTrivy = async (target, tool = Trivy, token = "") => {
  const { volumeName, uploadDir } = TrivyServices.getPaths();
  const timestamp = moment().format("HHmmssDDMMYY");
  let fileName = `SAST_Trivy_Report_${timestamp}`;
  let data = { name: fileName, type: "SAST", tool: "Trivy" };
  //const reportPath = path.join(uploadDir, `SAST_Trivy_Report_${timestamp}.json`);
  const reportPath = path.join(uploadDir, `${fileName}.json`);
  //const reportPath = path.join(uploadDir, `trivy-security-report-${Date.now()}.json`);
  target = combineTokenWithGitUrl(token, target);
  try {
    await TrivyServices.checkOrCreateVolume(volumeName);
    await TrivyServices.cloneRepoIntoVolume(target, volumeName);
    await TrivyServices.runTrivyScan(volumeName, uploadDir, reportPath);
    crudServices.createNewReport(data);
    return reportPath;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await TrivyServices.cleanupVolume(volumeName);
  }
};

let getSourceCodeGithub = async (target) => {
  console.log("Target:", target);
  return new Promise((resolve, reject) => {
    try {
      console.log("Target:", target);
      //let command = ["sh", "-c", `cd sonarqube && git clone ${target}`];
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
  console.log("Target:", target);
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Target:", target);
      const timestamp = moment().format("HHmmssDDMMYY");
      let fileName = `SAST_SonarQube_Report_${timestamp}`;
      let data = { name: fileName, type: "SAST", tool: "SonarQube" };
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
      crudServices.createNewReport(data);
      if (tool === "bothSAST") {
        fileName = `SAST_Report_${timestamp}`;
        data.name = fileName;
        data.type = "SAST";
        data.tool = "SonarQube, Trivy";
        crudServices.createNewReport(data);
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
