import crudServices from "./crudServices.js";

function parseToolName(tool) {
  switch (tool) {
    case "bothDAST":
      return "ZAP, Wapiti";
    case "bothSAST":
      return "SonarQube, Trivy";
    default:
      return tool;
  }
}

function buildScanRequestPayload(req) {
  return {
    scanType: req.body.scanType,
    tool: parseToolName(req.body.tool),
    url: req.body.url,
    accessLevel: req.body.accessLevel || null,
    token: req.body.accessLevel === "private" ? req.body.token : null,
  };
}

async function saveScanRequest(req) {
  const payload = buildScanRequestPayload(req);
  return crudServices.createNewScanRequest(payload);
}

async function saveScanRequestHistory(req) {
  const payload = buildScanRequestPayload(req);
  return crudServices.createNewScanRequestHistory(payload);
}

export default {
  saveScanRequest,
  saveScanRequestHistory,
};
