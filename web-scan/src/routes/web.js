import express from "express";
import homeController from "../controllers/homeController";

let router = express.Router();

// Middleware kiểm tra đăng nhập
const checkLogin = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Middleware phân quyền admin
const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.status(403).send("Bạn không có quyền truy cập vào trang này!");
  }
};

// Middleware phân quyền user
const checkUser = (req, res, next) => {
  //if (req.session.user && req.session.user.role === "user") {
  if (true) {
    next();
  } else {
    res.status(403).send("Bạn không có quyền truy cập vào trang này!");
  }
};

let initWebRoutes = (app) => {
  // Auth routes
  router.get("/login", homeController.getLogin);
  router.post("/login", homeController.postLogin);

  // Đăng xuất, xóa session, quay về login
  router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session: ", err);
      }
      res.redirect("/login");
    });
  });

  // Điều hướng trang chủ theo role
  router.get("/", checkLogin, (req, res) => {
    if (req.session.user.role === "admin") {
      //homeController.getAdminHomepage;
      res.redirect("/adminHomepage");
    } else {
      //homeController.getUserHomepage;
      res.redirect("/userHomepage");
    }
  });

  router.get("/adminHomepage", checkLogin, checkAdmin, homeController.getAdminHomepage);
  router.get("/addUser", checkLogin, checkAdmin, homeController.getAddUserPage);
  router.get("/editUser", checkLogin, checkAdmin, homeController.getEditUserPage);
  router.post("/addUser", checkLogin, checkAdmin, homeController.addUser);
  router.post("/editUser", checkLogin, checkAdmin, homeController.editUser);
  router.get("/deleteUser", checkLogin, checkAdmin, homeController.deleteUser);

  router.get("/userHomepage", checkLogin, checkUser, homeController.getUserHomepage);
  router.get("/scan", checkLogin, checkUser, homeController.getScanPage);
  router.get("/saveRequest", checkLogin, checkUser, homeController.getSaveRequestPage);
  router.get("/viewReport", checkLogin, checkUser, homeController.viewReport);
  router.get("/deleteReport", checkLogin, checkUser, homeController.deleteReport);
  router.post("/saveRequest", checkLogin, checkUser, homeController.saveRequest);
  router.get("/deleteRequest", checkLogin, checkUser, homeController.deleteRequest);
  router.get("/deleteRequestHistory", checkLogin, checkUser, homeController.deleteRequestHistory);
  router.get("/saveRequestFromHistory", checkLogin, checkUser, homeController.saveRequestFromHistory);

  router.post("/scanZAP", checkLogin, checkUser, homeController.scanZAP);
  router.post("/scanWapiti", checkLogin, checkUser, homeController.scanWapiti);
  router.post("/scanDAST", checkLogin, checkUser, homeController.scanDAST);
  router.post("/scanSonarQube", checkLogin, checkUser, homeController.scanSonarQube);
  router.post("/scanTrivy", checkLogin, checkUser, homeController.scanTrivy);
  router.post("/scanSAST", checkLogin, checkUser, homeController.scanSAST);
  return app.use("/", router);
};

module.exports = initWebRoutes;
