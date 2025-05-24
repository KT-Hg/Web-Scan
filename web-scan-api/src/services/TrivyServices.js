import { exec } from "child_process";
import path from "path";
// import dotenv from "dotenv";
// dotenv.config();

require("dotenv").config();

let reportPathOG = process.env.REPORT_PATH;

const getPaths = () => {
  return {
    volumeName: "trivy_volume",
    // uploadDir: path.resolve("./src/uploads"),
    uploadDir: reportPathOG,
  };
};

const checkOrCreateVolume = (volumeName) => {
  return new Promise((resolve, reject) => {
    exec(`docker volume inspect ${volumeName}`, (error) => {
      if (error) {
        console.log(`Volume '${volumeName}' not found. Creating...`);
        exec(`docker volume create ${volumeName}`, (err) => {
          if (err) return reject(`Failed to create volume: ${err.message}`);
          console.log("Docker volume created:", volumeName);
          resolve();
        });
      } else {
        console.log(`Using existing volume: ${volumeName}`);
        resolve();
      }
    });
  });
};

const cloneRepoIntoVolume = (target, volumeName) => {
  return new Promise((resolve, reject) => {
    // if (!target.startsWith("https://github.com/")) {
    //   return reject("Invalid GitHub repo URL.");
    // }

    const command = [
      "docker",
      "run",
      "--rm",
      "-v",
      `${volumeName}:/app`,
      "alpine/git",
      "clone",
      target,
      "/app",
    ].join(" ");

    exec(command, (error) => {
      if (error) return reject(`Failed to clone repo: ${error.message}`);
      console.log("Repository cloned into volume.");
      resolve();
    });
  });
};

const runTrivyScan = (volumeName, uploadDir, reportPath) => {
  return new Promise((resolve, reject) => {
    const command = [
      "docker",
      "run",
      "--rm",
      "-v",
      `${volumeName}:/app`,
      "-v",
      `${uploadDir}:/output`,
      "aquasec/trivy:latest",
      "fs",
      "--format",
      "json",
      "-o",
      `/output/${path.basename(reportPath)}`,
      "--severity",
      "CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN",
      "--scanners",
      "vuln,secret",
      "--detection-priority",
      "comprehensive",
      "--parallel",
      "10",
      "/app",
    ].join(" ");

    exec(command, (error, stdout, stderr) => {
      if (error) return reject(`Trivy scan failed: ${error.message}`);
      if (stderr) console.warn("Trivy warnings:", stderr);
      console.log("Trivy scan completed.");
      resolve();
    });
  });
};

const cleanupVolume = (volumeName) => {
  return new Promise((resolve) => {
    exec(`docker volume rm ${volumeName}`, (err) => {
      if (err) console.error("Failed to remove volume:", err.message);
      else console.log(`Removed volume: ${volumeName}`);
      resolve();
    });
  });
};

module.exports = {
  getPaths: getPaths,
  checkOrCreateVolume: checkOrCreateVolume,
  cloneRepoIntoVolume: cloneRepoIntoVolume,
  runTrivyScan: runTrivyScan,
  cleanupVolume: cleanupVolume,
};
