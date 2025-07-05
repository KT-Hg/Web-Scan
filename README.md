# 🛡️ Tích hợp công cụ bảo mật với Docker, ZAP và SonarQube

Dự án này thiết lập môi trường bảo mật sử dụng Docker, bao gồm:

- Dự án Node.js sử dụng Sequelize.
- SonarQube để phân tích chất lượng mã nguồn.
- OWASP ZAP để quét bảo mật ứng dụng.
- MySQL + phpMyAdmin để quản lý cơ sở dữ liệu.
- Sonar Scanner CLI để phân tích mã.
- Mạng Docker để các container giao tiếp an toàn với nhau.

---

## 🧱 Yêu cầu cài đặt

Trước khi bắt đầu, hãy đảm bảo rằng bạn đã cài:

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) + `npx`
- Có kết nối Internet để tải các image Docker.

---

## 🚀 Hướng dẫn thiết lập

### 1. Build và chạy container ứng dụng

🔹 **Chạy trong thư mục `Docker/`**:

```bash
docker build -t security-tools .
docker run -it --name security-container -v REPORT_PATH:/tmp -d security-tools
```

> 📝 Lưu lại container ID để cấu hình biến môi trường.
> ⚠️ Thay `REPORT_PATH` bằng đường dẫn thực tế (ví dụ: `D:/KLTN/RP/` nếu dùng Windows).

---

### 2. Tạo mạng Docker

```bash
docker network create my_network
```

---

### 3. Khởi chạy MySQL và phpMyAdmin

##### Container MySQL

```bash
docker run -d --name mysql-container --network my_network -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=mydb -p 3306:3306 mysql:latest
```

###### Container phpMyAdmin

```bash
docker run -d --name phpmyadmin-container --network my_network -e PMA_HOST=mysql-container -p 8080:80 phpmyadmin/phpmyadmin:latest
```

> 🧭 Truy cập phpMyAdmin tại: [http://localhost:8080](http://localhost:8080)

---

### 3.1. Tạo cơ sở dữ liệu `WebScan-development`

#### 🧑‍💻 Cách 1: Tạo qua dòng lệnh (CLI)

Truy cập vào container MySQL bằng lệnh:

```bash
docker exec -it mysql-container mysql -u root
```

Sau đó chạy lệnh SQL sau trong giao diện MySQL:

```sql
CREATE DATABASE `WebScan-development`;
```

> ⚠️ **Lưu ý:** Tên CSDL `WebScan-development` có dấu `-`, vì vậy cần đặt trong dấu backtick `` ` `` để tránh lỗi cú pháp.

#### 🖱️ Cách 2: Dùng phpMyAdmin (Giao diện web)

1. Truy cập: [http://localhost:8080](http://localhost:8080)
2. Đăng nhập:

   - **Username:** `root`
   - **Password:** _(để trống)_

3. Chọn **"New"**, nhập tên: `WebScan-development`, sau đó nhấn **Create**.

---

### 4. Tạo volumes và chạy container server

```bash
docker volume create zap_volume
docker volume create sonarqube_volume

docker run -it -d --name server --network my_network -v "zap_volume:/zap" -v "sonarqube_volume:/sonarqube" security-tools
```

> 📝 Lưu lại container ID để cấu hình biến môi trường.

---

### 5. Chạy OWASP ZAP ở chế độ daemon

```bash
docker run -it -d   --name zap   -v REPORT_PATH:/tmp   ghcr.io/zaproxy/zaproxy:weekly   zap.sh -daemon
```

> 📝 Lưu lại container ID để cấu hình biến môi trường.

> ⚠️ Thay `REPORT_PATH` bằng đường dẫn thực tế (ví dụ: `D:/KLTN/RP/` nếu dùng Windows).

---

### 6. Chạy SonarQube Server

```bash
docker run -d   --name sonarqube_container   --network my_network   -p 9000:9000 -p 9091:9091   sonarqube:latest
```

> 🌐 Truy cập SonarQube tại: [http://localhost:9000](http://localhost:9000)

---

### 7. Tạo token trên SonarQube

```bash
curl -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate?name=my-token"
```

> 📝 Lưu lại Token để cấu hình biến môi trường.

---

## ⚙️ Biến môi trường

```env
PORT=8888
NODE_ENV=development

CONTAINER_ID =                # ID container security-tools
CONTAINER_ID_ZAP =            # ID container ZAP
CONTAINER_ID_SERVER =         # ID container server
SONAR_TOKEN =                 # Token từ SonarQube
SONAR_PASSWORD = "admin"      # Mặc định, thay nếu bạn đã đổi
REPORT_PATH =                 # Đường dẫn chứa báo cáo (trên máy host)
```

---

### 8. Cài đặt thư viện Node.js

🔹 **Chạy trong thư mục `web-scan/`**:

```bash
npm install
```

---

### 9. Chạy migrate cơ sở dữ liệu

🔹 **Chạy trong thư mục `web-scan/`**:

```bash
npx sequelize-cli db:migrate
```

---

## 📄 Cấu trúc thư mục (ví dụ)

```
.
│   README.md
│
├───Docker
│       Dockerfile
│
└───web-scan
    │   .babelrc
    │   .env
    │   .gitignore
    │   .sequelizerc
    │   nodemon.json
    │   package-lock.json
    │   package.json
    │
    └───src
        │   server.js
        │
        ├───config
        │       config.json
        │       connectDB.js
        │       viewEngine.js
        │
        ├───controllers
        │       homeController.js
        │
        ├───migrations
        │       migrations-create-report.js
        │       migrations-create-scanRequest.js
        │       migrations-create-scanRequestHistory.js
        │       migrations-create-user.js
        │
        ├───models
        │       index.js
        │       report.js
        │       scanRequest.js
        │       scanRequestHistory.js
        │       user.js
        │
        ├───routes
        │       web.js
        │
        ├───seeders
        │       seeders-demo-user.js
        │
        ├───services
        │       crudServices.js
        │       downloadrp.js
        │       scanRequestServices.js
        │       scanServices.js
        │       TrivyServices.js
        │       userServices.js
        │       utils.js
        │
        └───views
            │   homepage.ejs
            │   loginPage.ejs
            │   saveRepuestPage.ejs
            │   scan.ejs
            │
            ├───Admin
            │       addUser.ejs
            │       adminHomepage.ejs
            │       editUser.ejs
            │
            ├───RP
            │       reportDAST.ejs
            │       reportSAST.ejs
            │       reportSonarQube.ejs
            │       reportTrivy.ejs
            │       reportWapiti.ejs
            │       reportZAP.ejs
            │
            └───User
                    addUserPage.ejs
                    editUserPage.ejs
                    homeUser.ejs
                    userHomepage.ejs
```

---

## 📌 Ghi chú

- Kiểm tra các container đang chạy:

```bash
docker ps
```

- Dừng hoặc khởi động lại container nếu cần:

```bash
docker stop <tên-container>
docker start <tên-container>
```

- Dọn dẹp toàn bộ container và mạng Docker:

```bash
docker rm -f $(docker ps -aq)
docker network rm my_network
```

---

## 📬 Liên hệ

Nếu gặp lỗi hoặc cần hỗ trợ, hãy mở issue hoặc liên hệ người phát triển.
