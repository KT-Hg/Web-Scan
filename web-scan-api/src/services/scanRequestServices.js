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
import crudServices from "./crudServices.js";
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

const saveScanRequest = async (req) => {
  let toolName =
    req.body.tool === "bothDAST"
      ? "ZAP, Wapiti"
      : req.body.tool === "bothSAST"
      ? "SonarQube, Trivy"
      : req.body.tool;
  return await crudServices.createNewScanRequest({
    scanType: req.body.scanType,
    tool: toolName,
    url: req.body.url,
    accessLevel: req.body.accessLevel || null,
    token: req.body.accessLevel === "private" ? req.body.token : null,
  });
};

const saveTempScanRequest = async (req) => {
  let toolName =
    req.body.tool === "bothDAST"
      ? "ZAP, Wapiti"
      : req.body.tool === "bothSAST"
      ? "SonarQube, Trivy"
      : req.body.tool;
  return await crudServices.createNewTempScanRequest({
    scanType: req.body.scanType,
    tool: toolName,
    url: req.body.url,
    accessLevel: req.body.accessLevel || null,
    token: req.body.accessLevel === "private" ? req.body.token : null,
  });
};

module.exports = {
  saveScanRequest: saveScanRequest,
  saveTempScanRequest: saveTempScanRequest,
};
