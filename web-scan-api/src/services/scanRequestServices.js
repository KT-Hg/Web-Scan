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
import { type } from "os";
require("dotenv").config();

const parseToolName = (tool) => {
  switch (tool) {
    case "bothDAST":
      return "ZAP, Wapiti";
    case "bothSAST":
      return "SonarQube, Trivy";
    default:
      return tool;
  }
};

const buildScanRequestPayload = (req) => ({
  scanType: req.body.scanType,
  tool: parseToolName(req.body.tool),
  url: req.body.url,
  accessLevel: req.body.accessLevel || null,
  token: req.body.accessLevel === "private" ? req.body.token : null,
});

const saveScanRequest = async (req) => {
  const payload = buildScanRequestPayload(req);
  return await crudServices.createNewScanRequest(payload);
};

const saveScanRequestHistory = async (req) => {
  const payload = buildScanRequestPayload(req);
  return await crudServices.createNewScanRequestHistory(payload);
};

export { saveScanRequest, saveScanRequestHistory };
