import db from "../models/index";
import bcrypt from "bcryptjs";

const salt = bcrypt.genSaltSync(10);

const hashUserPassword = (password) => bcrypt.hash(password, salt);

const findById = (Model, id) => Model.findOne({ where: { id } });
const findByField = (Model, field, value) => Model.findOne({ where: { [field]: value } });
const findAll = (Model) => Model.findAll();

const createEntry = (Model, data) => Model.create(data);
const updateEntry = async (instance, data) => {
  Object.assign(instance, data);
  return instance.save();
};
const deleteEntry = (instance) => instance.destroy();

const createNewUser = async (data) => {
  const hashedPassword = await hashUserPassword(data.password);
  await createEntry(db.User, {
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender === "1",
    role: data.role,
  });
  return "Create new user successfully";
};

const getAllUsers = () => findAll(db.User);

const getOneUser = async (userId) => (await findById(db.User, userId)) || {};

const updateUserData = async (data) => {
  const user = await findById(db.User, data.id);
  if (!user) return "The user not found";

  await updateEntry(user, {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender === "1",
    role: data.role === "0" ? "User" : "Admin",
  });
  return "Update user successfully";
};

const deleteUserData = async (userId) => {
  const user = await findById(db.User, userId);
  if (!user) return "The user not found";

  await deleteEntry(user);
  return "Delete user successfully";
};

// ---------- Report ----------
const createNewReport = async (data) => {
  await createEntry(db.Report, {
    name: data.name,
    type: data.type,
    tool: data.tool,
    isProcessing: data.isProcessing === "1",
  });
  return "Create new report successfully";
};

const getAllReports = () => findAll(db.Report);
const getOneReport = async (id) => (await findById(db.Report, id)) || {};
const getReportByName = async (name) => (await findByField(db.Report, "name", name)) || {};

const updateReportData = async (data) => {
  const report = await findById(db.Report, data.id);
  if (!report) return "The report not found";

  await updateEntry(report, {
    name: data.name,
    type: data.type,
    tool: data.tool,
    isProcessing: data.isProcessing === "1",
  });
  return "Update report successfully";
};

const deleteReportData = async (id) => {
  const report = await findById(db.Report, id);
  if (!report) return "The report not found";

  await deleteEntry(report);
  return "Delete report successfully";
};

// ---------- ScanRequest ----------
const createNewScanRequest = async (data) => {
  await createEntry(db.ScanRequest, data);
  return "Create new scan request successfully";
};

const getAllScanRequests = () => findAll(db.ScanRequest);
const getOneScanRequest = async (id) => (await findById(db.ScanRequest, id)) || {};
const getScanRequestByUrl = async (url) => (await findByField(db.ScanRequest, "url", url)) || {};

const updateScanRequestData = async (data) => {
  const request = await findById(db.ScanRequest, data.id);
  if (!request) return "The scan request not found";

  await updateEntry(request, data);
  return "Update scan request successfully";
};

const deleteScanRequestData = async (id) => {
  const request = await findById(db.ScanRequest, id);
  if (!request) return "The scan request not found";

  await deleteEntry(request);
  return "Delete scan request successfully";
};

// ---------- ScanRequestHistory ----------
const createNewScanRequestHistory = async (data) => {
  await createEntry(db.ScanRequestHistory, data);
  return "Create new scan request history successfully";
};

const getAllScanRequestHistories = () => findAll(db.ScanRequestHistory);

const getOneScanRequestHistory = async (id) => (await findById(db.ScanRequestHistory, id)) || {};

const getScanRequestHistoryByUrl = async (url) =>
  (await findByField(db.ScanRequestHistory, "url", url)) || {};

const updateScanRequestHistoryData = async (data) => {
  const request = await findById(db.ScanRequestHistory, data.id);
  if (!request) return "The scan request history not found";

  await updateEntry(request, data);
  return "Update scan request history successfully";
};

const deleteScanRequestHistoryData = async (id) => {
  const request = await findById(db.ScanRequestHistory, id);
  if (!request) return "The scan request history not found";

  await deleteEntry(request);
  return "Delete scan request history successfully";
};

module.exports = {
  createNewUser,
  getAllUsers,
  getOneUser,
  updateUserData,
  deleteUserData,

  createNewReport,
  getAllReports,
  getOneReport,
  getReportByName,
  updateReportData,
  deleteReportData,

  createNewScanRequest,
  getAllScanRequests,
  getOneScanRequest,
  getScanRequestByUrl,
  updateScanRequestData,
  deleteScanRequestData,

  createNewScanRequestHistory,
  getAllScanRequestHistories,
  getOneScanRequestHistory,
  getScanRequestHistoryByUrl,
  updateScanRequestHistoryData,
  deleteScanRequestHistoryData,
};
