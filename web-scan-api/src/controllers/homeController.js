import db from "../models/index";
import crudServices from "../services/crudServices";
import scanServices from "../services/scanServices";

require("dotenv").config();

let containerId = process.env.CONTAINER_ID;

let getHomePage = async (req, res) => {
  try {
    let data = await crudServices.getAllUsers();
    return res.render("homepage.ejs", {
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

let getAddUser = async (req, res) => {
  try {
    return res.render("./User/addUser.ejs");
  } catch (error) {
    console.log(error);
  }
};

let getEditUser = async (req, res) => {
  try {
    let data = await crudServices.getOneUser(req.query.id);
    return res.render("./User/editUser.ejs", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

let addUser = async (req, res) => {
  try {
    let message = await crudServices.createNewUser(req.body);
    console.log(message);
    return res.redirect("/homeUser");
  } catch (error) {
    console.log(error);
  }
};

let editUser = async (req, res) => {
  try {
    let message = await crudServices.updateUserData(req.body);
    console.log(message);
    return res.redirect("/homeUser");
  } catch (error) {
    console.log(error);
  }
};

let deleteUser = async (req, res) => {
  console.log(req.query.id);
  try {
    let message = await crudServices.deleteUserData(req.query.id);
    console.log(message);
    return res.redirect("/homeUser");
  } catch (error) {
    console.log(error);
  }
};

let getScanPage = async (req, res) => {
  try {
    return res.render("scan.ejs");
  } catch (error) {
    console.log(error);
  }
};

let scan = async (req, res) => {
  try {
    scanServices.scanZap(req.body.url);
    return res.redirect("/homeUser");
  } catch (error) {
    console.log(error);
  }
};

let viewReport = async (req, res) => {
  try {
    let data = await scanServices.getReport(req.body.reportName);
    return res.render("./RP/report.ejs", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getHomePage: getHomePage,

  getHomeUser: getHomeUser,
  getAddUser: getAddUser,
  getEditUser: getEditUser,

  addUser: addUser,
  editUser: editUser,
  deleteUser: deleteUser,

  getScanPage: getScanPage,

  scan: scan,
  viewReport: viewReport,
};
