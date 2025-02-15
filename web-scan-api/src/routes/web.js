import express from "express";
import homeController from "../controllers/homeController";

let router = express.Router();

let initWebRoutes = (app) => {
  router.get("/", homeController.getHomePage);

  router.get("/homeUser", homeController.getHomeUser);
  router.get("/addUser", homeController.getAddUser);
  router.get("/editUser", homeController.getEditUser);

  router.post("/addUser", homeController.addUser);
  router.post("/editUser", homeController.editUser);
  router.get("/deleteUser", homeController.deleteUser);

  router.get("/scan", homeController.getScanPage);

  router.post("/scan", homeController.scan);
  router.post("/viewReport", homeController.viewReport);

  return app.use("/", router);
};

module.exports = initWebRoutes;
