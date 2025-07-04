import db from "../models/index.js";
import bcrypt from "bcryptjs";

const salt = bcrypt.genSaltSync(10);

const hashUserPassword = (password) => bcrypt.hash(password, salt);

const createNewUser = async (data) => {
  const hashedPassword = await hashUserPassword(data.password);
  await db.User.create({
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender === "1",
    role: data.role,
  });
  return "Create new user successfully";
};

const getAllUsers = () => db.User.findAll();

const getOneUser = async (userId) => {
  const user = await db.User.findByPk(userId);
  return user || {};
};

const updateUserData = async (data) => {
  const user = await db.User.findByPk(data.id);
  if (!user) return "The user not found";

  Object.assign(user, {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender === "1",
    role: data.role === "0" ? "User" : "Admin",
  });

  await user.save();
  return "Update user successfully";
};

const deleteUserData = async (userId) => {
  const user = await db.User.findByPk(userId);
  if (!user) return "The user not found";

  await user.destroy();
  return "Delete user successfully";
};

module.exports = {
  createNewUser,
  getAllUsers,
  getOneUser,
  updateUserData,
  deleteUserData,
};
