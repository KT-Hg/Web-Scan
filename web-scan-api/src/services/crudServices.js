import db from "../models/index";
import bcrypt from "bcryptjs";

const salt = bcrypt.genSaltSync(10);

let hashUserPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let hashPassword = await bcrypt.hashSync(password, salt);
      resolve(hashPassword);
    } catch (error) {
      reject(error);
    }
  });
};

let createNewUser = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let hashPasswordFromBcrypt = await hashUserPassword(data.password);
      await db.User.create({
        email: data.email,
        password: hashPasswordFromBcrypt,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender === "1" ? true : false,
        role: data.role,
      });
      resolve("Create new user successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let getAllUsers = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findAll();
      resolve(users);
    } catch (error) {
      reject(error);
    }
  });
};

let getOneUser = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.User.findOne({
        where: { id: userId },
      });
      if (user) {
        resolve(user);
      } else {
        resolve({});
      }
    } catch (error) {
      reject(error);
    }
  });
};

let updateUserData = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.User.findOne({
        where: { id: data.id },
      });

      if (user) {
        user.email = data.email;
        user.firstName = data.firstName;
        user.lastName = data.lastName;
        user.gender = data;
        user.role = data.role === "0" ? "User" : "Admin";
        await user.save();
        resolve("Update user successfully");
      } else {
        resolve("The user not found");
      }
    } catch (error) {
      reject(error);
    }
  });
};

let deleteUserData = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.User.findOne({
        where: { id: userId },
      });
      console.log(user);
      if (user) {
        await user.destroy();
        resolve("Delete user successfully");
      } else {
        resolve("The user not found");
      }
    } catch (error) {
      reject(error);
    }
  });
};

let createNewReport = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      await db.Report.create({
        name: data.name,
        type: data.type,
        tool: data.tool,
        isProcessing: data.isProcessing === "1" ? true : false,
      });
      resolve("Create new report successfully");
    } catch (error) {
      reject(error);
    }
  });
};

let getAllReports = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let reports = await db.Report.findAll();
      resolve(reports);
    } catch (error) {
      reject(error);
    }
  });
};

let getOneReport = (reportId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let report = await db.Report.findOne({
        where: { id: reportId },
      });
      if (report) {
        resolve(report);
      } else {
        resolve({});
      }
    } catch (error) {
      reject(error);
    }
  });
};

let getReportByName = (name) => {
  return new Promise(async (resolve, reject) => {
    try {
      let report = await db.Report.findOne({
        where: { name: name },
      });
      if (report) {
        resolve(report);
      } else {
        resolve({});
      }
    } catch (error) {
      reject(error);
    }
  });
};

let updateReportData = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let report = await db.Report.findOne({
        where: { id: data.id },
      });

      if (report) {
        report.name = data.name;
        report.type = data.type;
        report.tool = data.tool;
        report.isProcessing = data.isProcessing === "1" ? true : false;
        await report.save();
        resolve("Update report successfully");
      } else {
        resolve("The report not found");
      }
    } catch (error) {
      reject(error);
    }
  });
};

let deleteReportData = (reportId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let report = await db.Report.findOne({
        where: { id: reportId },
      });

      if (report) {
        await report.destroy();
        resolve("Delete report successfully");
      } else {
        resolve("The report not found");
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  createNewUser: createNewUser,
  getAllUsers: getAllUsers,
  getOneUser: getOneUser,
  updateUserData: updateUserData,
  deleteUserData: deleteUserData,

  createNewReport: createNewReport,
  getAllReports: getAllReports,
  getOneReport: getOneReport,
  getReportByName: getReportByName,
  updateReportData: updateReportData,
  deleteReportData: deleteReportData,
};
