import { exec } from "child_process";
import path from "path";
require("dotenv").config();

const reportPathOG = process.env.REPORT_PATH;

const getPaths = () => ({
  volumeName: "trivy_volume",
  uploadDir: reportPathOG,
});

const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error.message);
      if (stderr) console.warn("Warning:", stderr);
      resolve(stdout);
    });
  });
};

const checkOrCreateVolume = async (volumeName) => {
  try {
    await runCommand(`docker volume inspect ${volumeName}`);
    console.log(`Using existing volume: ${volumeName}`);
  } catch {
    console.log(`Volume '${volumeName}' not found. Creating...`);
    try {
      await runCommand(`docker volume create ${volumeName}`);
      console.log("Docker volume created:", volumeName);
    } catch (err) {
      throw new Error(`Failed to create volume: ${err}`);
    }
  }
};

const cleanupVolume = async (volumeName) => {
  try {
    await runCommand(`docker volume rm ${volumeName}`);
    console.log(`Removed volume: ${volumeName}`);
  } catch (err) {
    console.error("Failed to remove volume:", err);
  }
};

const cloneRepoIntoVolume = async (targetRepo, volumeName) => {
  const command = [
    "docker run --rm",
    `-v ${volumeName}:/app`,
    "alpine/git",
    `clone ${targetRepo} /app`,
  ].join(" ");

  try {
    await runCommand(command);
    console.log("Repository cloned into volume.");
  } catch (err) {
    throw new Error(`Failed to clone repo: ${err}`);
  }
};

const runTrivyScan = async (volumeName, uploadDir, reportPath) => {
  const outputFileName = path.basename(reportPath);

  const command = [
    "docker run --rm",
    `-v ${volumeName}:/app`,
    `-v ${uploadDir}:/output`,
    "aquasec/trivy:latest fs",
    "--format json",
    `-o /output/${outputFileName}`,
    "--severity CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN",
    "--scanners vuln,secret",
    "--detection-priority comprehensive",
    "--parallel 10",
    "/app",
  ].join(" ");

  try {
    await runCommand(command);
    console.log("Trivy scan completed.");
  } catch (err) {
    throw new Error(`Trivy scan failed: ${err}`);
  }
};

module.exports = {
  getPaths,
  checkOrCreateVolume,
  cloneRepoIntoVolume,
  runTrivyScan,
  cleanupVolume,
};
