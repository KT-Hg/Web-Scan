import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./routes/web";
import connectDB from "./config/connectDB";

require("dotenv").config();

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo session đơn giản, không có secret key
app.use(
  session({
    secret: "defaultSecretKey", // Dùng tạm, hoặc bỏ qua nếu bạn thực sự không muốn
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // secure: false để chạy trên HTTP (localhost)
  })
);

viewEngine(app);
initWebRoutes(app);
connectDB();

let port = process.env.PORT || 6666;

app.listen(port, () => {
  console.log("Backend Nodejs is running on the port : " + port);
});
