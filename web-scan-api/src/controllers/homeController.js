import db from "../models/index";
import moment from "moment";
import utils from "../services/utils";
import crudServices from "../services/crudServices";
import scanServices from "../services/scanServices";

require("dotenv").config();

let containerId = process.env.CONTAINER_ID;

const getLogin = (req, res) => {
  res.render("./loginPage.ejs");
};

const postLogin = (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    req.session.user = { role: "admin" };
    return res.redirect("/adminHomepage");
  }
  if (username === "user" && password === "user") {
    req.session.user = { role: "user" };
    return res.redirect("/userHomepage");
  }
  return res.render("./loginPage.ejs", { error: "Sai thông tin đăng nhập!" });
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).send("Internal Server Error");
    }
    res.redirect("/login");
  });
};

// Admin Pages
const getAdminHomepage = async (req, res) => {
  try {
    const data = await crudServices.getAllUsers();
    return res.render("./Admin/adminHomepage.ejs", {
      data,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error in getAdminHomepage:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let getAddUserPage = async (req, res) => {
  try {
    return res.render("./Admin/addUserPage.ejs");
  } catch (error) {
    console.error("Error in getAddUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let getEditUserPage = async (req, res) => {
  try {
    let data = await crudServices.getOneUser(req.query.id);
    return res.render("./Admin/editUserPage.ejs", {
      data: data,
    });
  } catch (error) {
    console.error("Error in getEditUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let addUser = async (req, res) => {
  try {
    const message = await crudServices.createNewUser(req.body);
    console.log("User added:", message);
    return res.redirect("./Admin/adminHomepage.ejs");
  } catch (error) {
    console.error("Error in addUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let editUser = async (req, res) => {
  try {
    const message = await crudServices.updateUserData(req.body);
    console.log("User updated:", message);
    return res.redirect("/adminHomepage");
  } catch (error) {
    console.error("Error in editUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let deleteUser = async (req, res) => {
  try {
    const message = await crudServices.deleteUserData(req.query.id);
    console.log("User deleted:", message);
    return res.redirect("/adminHomepage");
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let getUserHomepage = async (req, res) => {
  try {
    let data = await crudServices.getAllReports();
    return res.render("./User/userHomepage.ejs", { user: req.session.user, data: data });
  } catch (error) {
    console.error("Error in getUserHomepage:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let getScanPage = async (req, res) => {
  try {
    return res.render("./scan.ejs");
  } catch (error) {
    console.error("Error in getScanPage:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanZAP = async (req, res) => {
  try {
    await scanServices.scanZAP(req.body.url, req.body.tool);
    return res.redirect("/userHomepage");
  } catch (error) {
    console.error("Error in scanURL:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanWapiti = async (req, res) => {
  try {
    await scanServices.scanWapiti(req.body.url, req.body.tool);
    return res.redirect("/userHomepage");
  } catch (error) {
    console.error("Error in scanURL:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanSonarQube = async (req, res) => {
  try {
    await scanServices.scanSonarQube(req.body.url, req.body.tool, req.body.token);
    return res.redirect("/userHomepage");
  } catch (error) {
    console.error("Error in scanSourceCode:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanTrivy = async (req, res) => {
  try {
    await scanServices.scanTrivy(req.body.url, req.body.tool, req.body.token);
    return res.redirect("/userHomepage");
  } catch (error) {
    console.error("Error in scanTrivy:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// const viewReportMerge = async (req, res) => {
//   try {
//     const { reportMerge } = req.query; // Ví dụ: DAST_20250409 hoặc SAST_20250409
//     const [type, date] = reportMerge.split("_");

//     if (!type || !date) {
//       return res.status(400).send("Sai định dạng tên báo cáo. Vui lòng dùng DAST_yyyymmdd hoặc SAST_yyyymmdd.");
//     }

//     const reportFolder = path.join(__dirname, "../uploads");
//     const allFiles = await fs.readdir(reportFolder);

//     // Lọc các file hợp lệ
//     const matchedFiles = allFiles.filter((file) => file.startsWith(type) && file.includes(date) && file.endsWith(".json"));

//     if (matchedFiles.length === 0) {
//       return res.status(404).send("Không tìm thấy báo cáo phù hợp.");
//     }

//     // Đọc và phân loại tool name
//     const reports = {};
//     for (const file of matchedFiles) {
//       const parts = file.split("_"); // Ví dụ: ["DAST", "ZAP", "Report", "20250409.json"]
//       if (parts.length < 4) continue; // Đảm bảo đủ phần
//       const toolName = parts[1].toLowerCase(); // => 'zap', 'wapiti', 'trivy', 'sonarqube'

//       const filePath = path.join(reportFolder, file);
//       const jsonData = JSON.parse(await fs.readFile(filePath, "utf8"));
//       reports[toolName] = jsonData;
//     }

//     // DEBUG xem tool nào đã load
//     console.log("Tool reports đã tìm thấy:", Object.keys(reports));

//     // Render cho SAST
//     if (type === "SAST" && reports.trivy && reports.sonarqube) {
//       const trivyData = reports.trivy;
//       const sonarQubeData = reports.sonarqube;

//       const commonErrors = [];
//       const trivyErrors = [];
//       const sonarQubeErrors = [];

//       trivyData.Results.forEach((result) => {
//         if (result.Vulnerabilities) {
//           result.Vulnerabilities.forEach((vul) => {
//             const sonarMatch = sonarQubeData.issues.find((issue) => issue.key === vul.VulnerabilityID);
//             if (sonarMatch) {
//               commonErrors.push({
//                 PkgName: vul.PkgName,
//                 VulnerabilityID: vul.VulnerabilityID,
//                 Title: vul.Title,
//                 Description: vul.Description,
//                 Severity: vul.Severity,
//                 PublishedDate: vul.PublishedDate,
//                 FixedVersion: vul.FixedVersion,
//                 Status: vul.Status,
//                 SonarQubeMessage: sonarMatch.message,
//                 SonarQubeSeverity: sonarMatch.severity,
//                 SonarQubeComponent: sonarMatch.component,
//                 SonarQubeLine: sonarMatch.line,
//               });
//             } else {
//               trivyErrors.push(vul);
//             }
//           });
//         }
//       });

//       sonarQubeData.issues.forEach((issue) => {
//         const trivyMatch = trivyData.Results.find((result) => result.Vulnerabilities?.some((vul) => vul.VulnerabilityID === issue.key));
//         if (!trivyMatch) {
//           sonarQubeErrors.push(issue);
//         }
//       });

//       return res.render("./RP/merged_Trivy_Sonar.ejs", {
//         commonErrors,
//         trivyErrors,
//         sonarQubeErrors,
//       });
//     }

//     // Render cho DAST
//     if (type === "DAST" && reports.zap && reports.wapiti) {
//       const zapJson = reports.zap;
//       const wapitiJson = reports.wapiti;

//       const commonErrors = [];
//       const wapitiErrors = [];
//       const zapErrors = [];

//       for (const [classification, vulnerabilities] of Object.entries(wapitiJson.vulnerabilities)) {
//         vulnerabilities.forEach((vul) => {
//           const zapAlert = zapJson.site.flatMap((site) => site.alerts).find((alert) => alert.alertRef === vul.info);

//           if (zapAlert) {
//             commonErrors.push({
//               Classification: classification,
//               VulnerabilityID: vul.info,
//               ZapAlert: zapAlert.alert,
//               ZapRiskCode: zapAlert.riskcode,
//               ZapConfidence: zapAlert.confidence,
//               ZapRiskDesc: zapAlert.riskdesc,
//               ZapDescription: zapAlert.desc,
//               WapitiLevel: vul.level,
//               WapitiMethod: vul.method,
//               WapitiPath: vul.path,
//               WapitiCurlCommand: vul.curl_command,
//             });
//           } else {
//             wapitiErrors.push({
//               Classification: classification,
//               VulnerabilityID: vul.info,
//               Level: vul.level,
//               Method: vul.method,
//               Path: vul.path,
//               CurlCommand: vul.curl_command,
//             });
//           }
//         });
//       }

//       zapJson.site.forEach((site) => {
//         site.alerts.forEach((alert) => {
//           const wapitiMatch = Object.values(wapitiJson.vulnerabilities)
//             .flat()
//             .find((vul) => vul.info === alert.alertRef);

//           if (!wapitiMatch) {
//             zapErrors.push({
//               alert: alert.alert,
//               riskcode: alert.riskcode,
//               confidence: alert.confidence,
//               riskdesc: alert.riskdesc,
//               description: alert.desc,
//               solution: alert.solution,
//               references: alert.reference,
//               cweid: alert.cweid,
//               sourceid: alert.sourceid,
//             });
//           }
//         });
//       });

//       return res.render("./RP/merged_ZAP_Wapiti.ejs", {
//         commonErrors,
//         wapitiErrors,
//         zapErrors,
//       });
//     }

//     // Nếu không đủ dữ liệu hợp nhất
//     return res.status(400).send("Không đủ dữ liệu để render báo cáo hợp nhất.");
//   } catch (error) {
//     console.error("Lỗi khi xem báo cáo merge:", error);
//     return res.status(500).send("Lỗi máy chủ khi xử lý báo cáo merge.");
//   }
// };

// const viewReportMerge2 = async (req, res) => {
//   try {
//     const { reportMerge } = req.query; // Ví dụ: DAST_20250409 hoặc SAST_20250409
//     const [type, date] = reportMerge.split("_");

//     if (!type || !date) {
//       return res.status(400).send("Sai định dạng tên báo cáo. Vui lòng dùng DAST_yyyymmdd hoặc SAST_yyyymmdd.");
//     }

//     const reportFolder = path.join(__dirname, "../uploads");
//     const allFiles = await fs.readdir(reportFolder);

//     // Lọc các file hợp lệ
//     const matchedFiles = allFiles.filter((file) => file.startsWith(type) && file.includes(date) && file.endsWith(".json"));

//     if (matchedFiles.length === 0) {
//       return res.status(404).send("Không tìm thấy báo cáo phù hợp.");
//     }

//     // Đọc và phân loại tool name
//     const reports = {};
//     for (const file of matchedFiles) {
//       const parts = file.split("_"); // Ví dụ: ["DAST", "ZAP", "Report", "20250409.json"]
//       if (parts.length < 4) continue; // Đảm bảo đủ phần
//       const toolName = parts[1].toLowerCase(); // => 'zap', 'wapiti', 'trivy', 'sonarqube'

//       const filePath = path.join(reportFolder, file);
//       const jsonData = JSON.parse(await fs.readFile(filePath, "utf8"));
//       reports[toolName] = jsonData;
//     }

//     // DEBUG xem tool nào đã load
//     console.log("Tool reports đã tìm thấy:", Object.keys(reports));

//     // Render cho SAST
//     if (type === "SAST" && reports.trivy && reports.sonarqube) {
//       const trivyData = reports.trivy;
//       const sonarQubeData = reports.sonarqube;

//       const commonErrors = [];
//       const trivyErrors = [];
//       const sonarQubeErrors = [];

//       trivyData.Results.forEach((result) => {
//         if (result.Vulnerabilities) {
//           result.Vulnerabilities.forEach((vul) => {
//             const sonarMatch = sonarQubeData.issues.find((issue) => issue.key === vul.VulnerabilityID);
//             if (sonarMatch) {
//               commonErrors.push({
//                 PkgName: vul.PkgName,
//                 VulnerabilityID: vul.VulnerabilityID,
//                 Title: vul.Title,
//                 Description: vul.Description,
//                 Severity: vul.Severity,
//                 PublishedDate: vul.PublishedDate,
//                 FixedVersion: vul.FixedVersion,
//                 Status: vul.Status,
//                 SonarQubeMessage: sonarMatch.message,
//                 SonarQubeSeverity: sonarMatch.severity,
//                 SonarQubeComponent: sonarMatch.component,
//                 SonarQubeLine: sonarMatch.line,
//               });
//             } else {
//               trivyErrors.push(vul);
//             }
//           });
//         }
//       });

//       sonarQubeData.issues.forEach((issue) => {
//         const trivyMatch = trivyData.Results.find((result) => result.Vulnerabilities?.some((vul) => vul.VulnerabilityID === issue.key));
//         if (!trivyMatch) {
//           sonarQubeErrors.push(issue);
//         }
//       });

//       return res.render("./RP/merged_Trivy_Sonar.ejs", {
//         commonErrors,
//         trivyErrors,
//         sonarQubeErrors,
//       });
//     }

//     // Render cho DAST
//     if (type === "DAST" && reports.zap && reports.wapiti) {
//       const zapJson = reports.zap;
//       const wapitiJson = reports.wapiti;

//       return res.render("./RP/merged_ZAP_Wapiti.ejs", {
//         commonErrors,
//         wapitiErrors,
//         zapErrors,
//       });
//     }

//     // Nếu không đủ dữ liệu hợp nhất
//     return res.status(400).send("Không đủ dữ liệu để render báo cáo hợp nhất.");
//   } catch (error) {
//     console.error("Lỗi khi xem báo cáo merge:", error);
//     return res.status(500).send("Lỗi máy chủ khi xử lý báo cáo merge.");
//   }
// };

//=========================================================
//=========================================================
//=========================================================

let getHomePage = async (req, res) => {
  try {
    let data = await crudServices.getAllUsers();
    return res.render("./homepage.ejs", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

let getHomeUser = async (req, res) => {
  try {
    let data = await crudServices.getAllUsers();
    return res.render("./User/homeUser.ejs", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

const viewReport = async (req, res) => {
  try {
    let reportName = req.query.reportName;
    let data;
    let commonErrors;
    switch (utils.detectReportTool(reportName)) {
      case "ZAP":
        data = await scanServices.getReport(reportName);
        return res.render("./RP/reportZAP.ejs", { data });
      case "Wapiti":
        data = await scanServices.getReport(reportName);
        return res.render("./RP/reportWapiti.ejs", { data });
      case "SonarQube":
        data = await scanServices.getReport(reportName);
        return res.render("./RP/reportSonar.ejs", { data });
      case "Trivy":
        data = await scanServices.getReport(reportName);
        return res.render("./RP/reportTrivy.ejs", { data });
      case "DAST":
        data = await utils.mergeDASTReports(reportName);
        commonErrors = data.commonErrors;
        let wapitiErrors = data.wapitiErrors;
        let zapErrors = data.zapErrors;
        return res.render("./RP/reportDAST.ejs", { commonErrors, wapitiErrors, zapErrors });
      case "SAST":
        data = await utils.mergeSASTReports(reportName);
        commonErrors = data.commonErrors;
        let trivyErrors = data.trivyErrors;
        let sonarQubeErrors = data.sonarQubeErrors;
        data = await utils.mergeSASTReports(reportName);
        return res.render("./RP/reportSAST.ejs", { commonErrors, trivyErrors, sonarQubeErrors });
      default:
        return res.status(400).send("Invalid report name");
    }
  } catch (error) {
    console.error("Error in viewReport:", error);
    return res.status(500).send(`Error fetching report: ${error.message}`);
  }
};

const deleteReport = async (req, res) => {
  try {
    await crudServices.deleteReportData(req.query.id);
    return res.redirect("/userHomepage");
  } catch (error) {
    console.error("Error in deleteReport:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getLogin: getLogin,
  postLogin: postLogin,
  logout: logout,

  getAdminHomepage: getAdminHomepage,
  getAddUserPage: getAddUserPage,
  getEditUserPage: getEditUserPage,
  addUser: addUser,
  editUser: editUser,
  deleteUser: deleteUser,

  getUserHomepage: getUserHomepage,
  getScanPage: getScanPage,
  scanZAP: scanZAP,
  scanWapiti: scanWapiti,
  scanSonarQube: scanSonarQube,
  scanTrivy: scanTrivy,

  viewReport: viewReport,
  deleteReport: deleteReport,

  getHomeUser: getHomeUser,
};
