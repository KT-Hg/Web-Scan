// Refactored and cleaned controller code
import db from "../models/index";
import moment from "moment";
import utils from "../services/utils";
import crudServices from "../services/crudServices";
import scanServices from "../services/scanServices";
import scanRequestServices from "../services/scanRequestServices";

require("dotenv").config();

// Helper for rendering error
const handleError = (res, error, message) => {
  console.error(`${message}:`, error);
  return res.status(500).send("Internal Server Error");
};

// --- Auth ---
const getLogin = (req, res) => res.render("./loginPage.ejs");

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
    if (err) return handleError(res, err, "Logout Error");
    res.redirect("/login");
  });
};

// --- Admin ---
const getAdminHomepage = async (req, res) => {
  try {
    const data = await crudServices.getAllUsers();
    res.render("./Admin/adminHomepage.ejs", { data, user: req.session.user });
  } catch (error) {
    handleError(res, error, "getAdminHomepage");
  }
};

const getAddUserPage = (req, res) => res.render("./Admin/addUserPage.ejs");

const getEditUserPage = async (req, res) => {
  try {
    const data = await crudServices.getOneUser(req.query.id);
    res.render("./Admin/editUserPage.ejs", { data });
  } catch (error) {
    handleError(res, error, "getEditUserPage");
  }
};

const addUser = async (req, res) => {
  try {
    await crudServices.createNewUser(req.body);
    res.redirect("/adminHomepage");
  } catch (error) {
    handleError(res, error, "addUser");
  }
};

const editUser = async (req, res) => {
  try {
    await crudServices.updateUserData(req.body);
    res.redirect("/adminHomepage");
  } catch (error) {
    handleError(res, error, "editUser");
  }
};

const deleteUser = async (req, res) => {
  try {
    await crudServices.deleteUserData(req.query.id);
    res.redirect("/adminHomepage");
  } catch (error) {
    handleError(res, error, "deleteUser");
  }
};

// --- User ---
const getUserHomepage = async (req, res) => {
  try {
    await utils.delay(100);
    const [reports, requestsHistory, requests] = await Promise.all([
      crudServices.getAllReports(),
      crudServices.getAllScanRequestHistories(),
      crudServices.getAllScanRequests(),
    ]);
    res.render("./User/userHomepage.ejs", {
      user: req.session.user,
      reports,
      requestsHistory,
      requests,
    });
  } catch (error) {
    handleError(res, error, "getUserHomepage");
  }
};

const getScanPage = (req, res) => res.render("./scan.ejs");

const scanWithTool = async (req, res, tool, scanFn) => {
  try {
    const modifiedReq = { ...req, body: { ...req.body, tool } };
    await scanRequestServices.saveScanRequestHistory(modifiedReq);
    await scanFn(req.body.url, req.body.tool, req.body.token);
    if (res) res.redirect("/userHomepage");
  } catch (error) {
    if (res) handleError(res, error, `scan${tool}`);
    else throw error;
  }
};

const getSaveRequestPage = (req, res) => res.render("./saveRepuestPage.ejs");

const saveRequest = async (req, res) => {
  try {
    await scanRequestServices.saveScanRequest(req);
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "saveRequest");
  }
};

const saveRequestFromHistory = async (req, res) => {
  try {
    const requestHistory = await crudServices.getOneScanRequestHistory(req.query.id);
    const payload = {
      scanType: requestHistory.scanType,
      tool: requestHistory.tool,
      url: requestHistory.url,
      accessLevel: requestHistory.accessLevel || null,
      token: requestHistory.accessLevel === "private" ? requestHistory.token : null,
    };
    await scanRequestServices.saveScanRequest({ body: payload });
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "saveRequestFromHistory");
  }
};

const deleteRequest = async (req, res) => {
  try {
    await crudServices.deleteScanRequestData(req.query.id);
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "deleteRequest");
  }
};

const deleteRequestHistory = async (req, res) => {
  try {
    await crudServices.deleteScanRequestHistoryData(req.query.id);
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "deleteRequestHistory");
  }
};

const scanZAP = (req, res) => scanWithTool(req, res, "ZAP", scanServices.scanZAP);
const scanWapiti = (req, res) => scanWithTool(req, res, "Wapiti", scanServices.scanWapiti);
const scanSonarQube = (req, res) => scanWithTool(req, res, "SonarQube", scanServices.scanSonarQube);
const scanTrivy = (req, res) => scanWithTool(req, res, "Trivy", scanServices.scanTrivy);

const scanZAPOnly = async (req) => scanWithTool(req, null, "ZAP", scanServices.scanZAP);
const scanWapitiOnly = async (req) => scanWithTool(req, null, "Wapiti", scanServices.scanWapiti);
const scanSonarQubeOnly = async (req) =>
  scanWithTool(req, null, "SonarQube", scanServices.scanSonarQube);
const scanTrivyOnly = async (req) => scanWithTool(req, null, "Trivy", scanServices.scanTrivy);

const scanDAST = async (req, res) => {
  try {
    await Promise.all([scanZAPOnly(req), scanWapitiOnly(req)]);
    await scanRequestServices.saveScanRequestHistory({
      ...req,
      body: { ...req.body, tool: "bothDAST" },
    });
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "scanDAST");
  }
};

const scanSAST = async (req, res) => {
  try {
    await Promise.all([scanSonarQubeOnly(req), scanTrivyOnly(req)]);
    await scanRequestServices.saveScanRequestHistory({
      ...req,
      body: { ...req.body, tool: "bothSAST" },
    });
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "scanSAST");
  }
};

const getHomeUser = async (req, res) => {
  try {
    const data = await crudServices.getAllUsers();
    res.render("./User/homeUser.ejs", { data });
  } catch (error) {
    console.log(error);
  }
};

const viewReport = async (req, res) => {
  try {
    const reportName = req.query.reportName;
    const tool = utils.detectReportTool(reportName);
    let data;

    switch (tool) {
      case "ZAP":
      case "Wapiti":
      case "SonarQube":
      case "Trivy":
        data = await scanServices.getReport(reportName);
        return res.render(`./RP/report${tool}.ejs`, { data });

      case "DAST":
        data = await utils.mergeDASTReports(reportName);
        return res.render("./RP/reportDAST.ejs", data);

      case "SAST":
        data = await utils.mergeSASTReports(reportName);
        return res.render("./RP/reportSAST.ejs", data);

      default:
        return res.status(400).send("Invalid report name");
    }
  } catch (error) {
    handleError(res, error, "viewReport");
  }
};

const deleteReport = async (req, res) => {
  try {
    await crudServices.deleteReportData(req.query.id);
    res.redirect("/userHomepage");
  } catch (error) {
    handleError(res, error, "deleteReport");
  }
};

module.exports = {
  getLogin,
  postLogin,
  logout,

  getAdminHomepage,
  getAddUserPage,
  getEditUserPage,
  addUser,
  editUser,
  deleteUser,

  getUserHomepage,
  getScanPage,
  getSaveRequestPage,
  saveRequest,
  saveRequestFromHistory,
  deleteRequest,
  deleteRequestHistory,

  scanZAP,
  scanWapiti,
  scanDAST,
  scanSonarQube,
  scanTrivy,
  scanSAST,

  getHomeUser,
  viewReport,
  deleteReport,
};
