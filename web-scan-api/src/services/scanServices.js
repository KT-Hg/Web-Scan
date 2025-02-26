import db from "../models/index";
import net from "net";
import moment from "moment";
import Docker from "dockerode";
import { exec } from "child_process";
import { readFile } from "fs/promises";
require("dotenv").config();

let containerId = process.env.CONTAINER_ID;
let containerIdZap = process.env.CONTAINER_ID_ZAP;
let containerIdServer = process.env.CONTAINER_ID_SERVER;
let reportPath = process.env.REPORT_PATH;
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
      "sonarqube_volume:/usr/src/",
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

let scanNmap = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["nmap", "-oX", "/tmp/nmap-output.xml", target];

      execCommandInContainer(containerId, command);
      resolve("Scan Nmap successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let scanSkipfish = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["skipfish", "-o", "/tmp/skipfish-output", target];

      execCommandInContainer(containerId, command);
      resolve("Scan Skipfish successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let scanNikto = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["nikto", "-h", target];

      execCommandInContainer(containerId, command);
      resolve("Scan Nikto successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let scanWapiti = async (target) => {
  return new Promise((resolve, reject) => {
    try {
      let command = ["wapiti", "--url", target];

      execCommandInContainer(containerId, command);
      resolve("Scan Wapiti successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let scanZap = async (target) => {
  return new Promise(async (resolve, reject) => {
    try {
      let command = ["rm", "-rf", "/home/zap/.ZAP_D/"];
      execCommandInContainer(containerIdZap, command);
      const timestamp = moment().format("HHmmssDDMMYY");
      const reportPath = `/tmp/report${timestamp}.json`;
      const freePort = await getAvailablePort(8080, containerIdZap);
      console.log(freePort.toString());

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
      resolve("Scan ZAP successfully");
    } catch (error) {
      reject(error);
    }
  });
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

// let getInfoGithub = async (target) => {
//   return new Promise((resolve, reject) => {
//     try {
//       let command = ["curl", target];

//       execCommandInContainer(containerId, command)
//         .then((output) => {
//           resolve(output);
//         })
//         .catch((error) => {
//           reject(error);
//         });
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

let scanSonarQube = async (target) => {
  return new Promise(async (resolve, reject) => {
    try {
      await getSourceCodeGithub(target);
      const projectKey = target.split("/").pop().replace(".git", "");
      await createSonarQubeProject(projectKey);
      await createContainerSonarQube(projectKey);
      await deleteSourceCodeOnServer(projectKey);

      // execCommandInContainer(containerId, command);
      resolve("Scan SonarQube successfully");
    } catch (error) {
      reject(error);
    }
  });
};

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

module.exports = {
  scanNmap: scanNmap,
  scanSkipfish: scanSkipfish,
  scanNikto: scanNikto,
  scanWapiti: scanWapiti,
  scanZap: scanZap,
  scanSonarQube: scanSonarQube,
  getReport: getReport,
};
