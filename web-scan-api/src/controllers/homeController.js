import db from "../models/index";
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
    return res.render("./Admin/adminHomepage.ejs");
  }
  if (username === "user" && password === "user") {
    req.session.user = { role: "user" };
    return res.render("./User/userHomepage.ejs");
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
    return res.redirect("./Admin/adminHomepage.ejs");
  } catch (error) {
    console.error("Error in editUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let deleteUser = async (req, res) => {
  try {
    const message = await crudServices.deleteUserData(req.query.id);
    console.log("User deleted:", message);
    return res.redirect("./Admin/adminHomepage.ejs");
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).send("Internal Server Error");
  }
};

let getUserHomepage = async (req, res) => {
  try {
    return res.render("./User/userHomepage.ejs", { user: req.session.user });
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
    await scanServices.scanZAP(req.body.url);
    return res.redirect("./User/userHomepage.ejs");
  } catch (error) {
    console.error("Error in scanURL:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanWapiti = async (req, res) => {
  try {
    await scanServices.scanWapiti(req.body.url);
    return res.redirect("./User/userHomepage.ejs");
  } catch (error) {
    console.error("Error in scanURL:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanSonarQube = async (req, res) => {
  try {
    await scanServices.scanSonarQube(req.body.url);
    return res.redirect("./User/userHomepage.ejs");
  } catch (error) {
    console.error("Error in scanSourceCode:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const scanTrivy = async (req, res) => {
  try {
    await scanServices.scanTrivy(req.body.url);
    return res.redirect("./User/userHomepage");
  } catch (error) {
    console.error("Error in scanTrivy:", error);
    return res.status(500).send("Internal Server Error");
  }
};

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
    const data = await scanServices.getReport(reportName);
    console.log(utils.detectReportTool(reportName));
    switch (utils.detectReportTool(reportName)) {
      case "ZAP":
        return res.render("./RP/reportZAP.ejs", { data });
      case "Wapiti":
        return res.render("./RP/reportWapiti.ejs", { data });
      case "SonarQube":
        return res.render("./RP/reportSonar.ejs", { data });
      case "Trivy":
        return res.render("./RP/reportTrivy.ejs", { data });
      default:
        return res.status(400).send("Invalid report name");
    }
  } catch (error) {
    console.error("Error in viewReport:", error);
    return res.status(500).send(`Error fetching report: ${error.message}`);
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
};
