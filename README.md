## 🔍 Giới thiệu tổng quan

Dự án **"Tích hợp công cụ bảo mật với Docker, ZAP, Wapiti, SonarQube và Trivy"** cung cấp một giải pháp DevSecOps toàn diện, tích hợp nhiều công cụ bảo mật mã nguồn và ứng dụng web. Mục tiêu chính của hệ thống là:

- **Tự động hóa việc phân tích mã nguồn** (SAST) bằng **SonarQube**, **Trivy**.
- **Phát hiện các lỗ hổng bảo mật** trên ứng dụng web đang chạy bằng **OWASP ZAP**, **Wapiti** (DAST).
- **Quản lý và trình bày kết quả quét bảo mật** qua một ứng dụng Node.js có giao diện người dùng.
- **Tạo môi trường ảo hóa an toàn** sử dụng **Docker** và các **container riêng biệt** để giảm thiểu rủi ro.
- **Hỗ trợ triển khai nhanh và dễ dàng** cho cả môi trường local và cloud.

---

## ⚙️ **Các thành phần chính của hệ thống**

| Thành phần      | Mục đích                                                            |
| --------------- | ------------------------------------------------------------------- |
| **Node.js App** | Giao diện web cho phép gửi yêu cầu quét và hiển thị báo cáo kết quả |
| **MySQL**       | Lưu trữ thông tin người dùng, lịch sử quét và dữ liệu báo cáo       |
| **phpMyAdmin**  | Giao diện trực quan để quản lý cơ sở dữ liệu MySQL                  |
| **SonarQube**   | Phân tích mã nguồn tĩnh (SAST) và đánh giá chất lượng mã            |
| **OWASP ZAP**   | Phân tích bảo mật động (DAST) của ứng dụng trong runtime            |
| **Docker**      | Cung cấp môi trường triển khai độc lập, dễ tái sử dụng và mở rộng   |

---

## 🛡️ **Tích hợp công cụ bảo mật với Docker, ZAP, Wapiti và SonarQube**

Dự án xây dựng một môi trường kiểm thử bảo mật ứng dụng toàn diện dựa trên Docker, bao gồm:

- Ứng dụng Node.js sử dụng Sequelize làm ORM để tương tác với MySQL.
- **SonarQube** được tích hợp để thực hiện phân tích mã nguồn và đánh giá chất lượng mã.
- **OWASP ZAP** và **Wapiti** dùng để quét và phát hiện các lỗ hổng bảo mật runtime của ứng dụng.
- **MySQL** kết hợp với **phpMyAdmin** để dễ dàng quản lý cơ sở dữ liệu.
- **Sonar Scanner CLI** dùng để gửi mã lên SonarQube để phân tích.
- Tất cả các container hoạt động trong cùng một **mạng Docker** để đảm bảo khả năng kết nối và an toàn.

---

## 🎯 **Mục tiêu sử dụng**

Dự án hướng đến các đối tượng:

- 👨‍💻 **Nhà phát triển phần mềm** muốn tích hợp kiểm thử bảo mật ngay trong quy trình CI/CD.
- 🎓 **Sinh viên và học viên ngành An ninh mạng** muốn thực hành DevSecOps trong môi trường thực tế.
- 🏢 **Doanh nghiệp vừa và nhỏ** đang tìm kiếm giải pháp kiểm thử bảo mật mã nguồn mở, triển khai nhanh và tiết kiệm chi phí.

---

## 🧱 Yêu cầu cài đặt

Trước khi bắt đầu, hãy đảm bảo rằng bạn đã cài:

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) + `npx`
- Có kết nối Internet để tải các image Docker.

---

## 🚀 Hướng dẫn thiết lập

### 1. **Build và chạy container ứng dụng**

> 🎯 **Mục đích**: Tạo một container chứa mã nguồn và các công cụ bảo mật đã cài sẵn (ZAP CLI, Sonar Scanner, v.v.).

```bash
docker build -t security-tools .
docker run -it --name security-container -v REPORT_PATH:/tmp -d security-tools
```

- `-t security-tools`: Gán tên cho image.
- `-v REPORT_PATH:/tmp`: Gắn thư mục lưu báo cáo từ host vào container.
- `-d`: Chạy container ở chế độ nền (detached).

> 📝 Lưu lại container ID để cấu hình biến môi trường.
>
> ⚠️ Thay `REPORT_PATH` bằng đường dẫn thực tế (ví dụ: `D:/KLTN/RP/` nếu dùng Windows).

---

### 2. **Tạo mạng Docker**

> 🎯 **Mục đích**: Tạo một “mạng riêng” để các container có thể giao tiếp nội bộ mà không phơi bày port ra ngoài trừ khi cần thiết.

```bash
docker network create my_network
```

- Giúp ZAP, SonarQube, Node.js app, MySQL... kết nối an toàn với nhau.
- Tên `my_network` sẽ dùng xuyên suốt cho các container sau.

---

### 3. **Khởi chạy MySQL và phpMyAdmin**

#### 🧱 Container MySQL

```bash
docker run -d --name mysql-container --network my_network -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=mydb -p 3306:3306 mysql:latest
```

- Tạo cơ sở dữ liệu `mydb` mặc định.
- Cho phép root đăng nhập mà không cần mật khẩu (chỉ nên dùng trong môi trường phát triển).
- Gắn vào `my_network`.

#### 🖥 Container phpMyAdmin

```bash
docker run -d --name phpmyadmin-container --network my_network -e PMA_HOST=mysql-container -p 8080:80 phpmyadmin/phpmyadmin:latest
```

- Cấu hình để phpMyAdmin kết nối tới container MySQL bằng tên host `mysql-container`.
- Mở cổng `8080` để truy cập qua trình duyệt: [http://localhost:8080](http://localhost:8080)

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

### 4. **Tạo volumes và chạy container server**

> 🎯 **Mục đích**: Tạo môi trường server chính có sẵn các công cụ bảo mật và lưu trữ báo cáo quét (ZAP, SonarQube...).

```bash
docker volume create zap_volume
docker volume create sonarqube_volume

docker run -it -d --name server --network my_network -v "zap_volume:/zap" -v "sonarqube_volume:/sonarqube" security-tools
```

- Giúp lưu dữ liệu báo cáo quét ZAP và SonarQube ở chế độ **persisted** (không mất khi container bị xóa).

> 📝 Lưu lại container ID để cấu hình biến môi trường.

---

### 5. **Chạy OWASP ZAP ở chế độ daemon**

> 🎯 **Mục đích**: Khởi chạy công cụ DAST ZAP ở chế độ nền để nhận yêu cầu quét từ ứng dụng Node.js.

```bash
docker run -it -d --name zap -v REPORT_PATH:/tmp ghcr.io/zaproxy/zaproxy:weekly zap.sh -daemon
```

- Chạy ZAP không giao diện, chỉ lắng nghe qua API.
- Báo cáo sẽ được xuất ra thư mục `/tmp` (đã mount từ host).

> 📝 Lưu lại container ID để cấu hình biến môi trường.

---

### 6. **Chạy SonarQube Server**

> 🎯 **Mục đích**: Phân tích chất lượng và bảo mật mã nguồn (SAST) bằng SonarQube.

```bash
docker run -d   --name sonarqube_container   --network my_network   -p 9000:9000 -p 9091:9091   sonarqube:latest
```

- Truy cập SonarQube: [http://localhost:9000](http://localhost:9000)
- Mặc định tài khoản: `admin` / `admin`

---

### 7. **Tạo token trên SonarQube**

> 🎯 **Mục đích**: Tạo token xác thực để Sonar Scanner CLI có thể gửi dữ liệu phân tích về SonarQube.

```bash
curl -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate?name=my-token"
```

> 📝 Lưu lại Token để cấu hình biến môi trường.
>
> 📌 **Gợi ý**: Bạn cũng có thể tạo token qua giao diện Web ở phần `My Account > Security`.

---

## ⚙️ Biến môi trường

> 🎯 **Mục đích**: Cấu hình server Node.js sử dụng đúng thông tin kết nối, container, báo cáo, token,...

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

> 📌 Dùng `docker ps` để lấy ID container.

---

### 8. **Cài đặt thư viện Node.js**

> 🎯 **Mục đích**: Tải các dependency được định nghĩa trong `package.json`.

```bash
npm install
```

- Chạy trong thư mục `web-scan/`
- Bao gồm các thư viện như `express`, `sequelize`, `axios`, `ejs`,...

---

### 9. **Chạy migrate cơ sở dữ liệu**

> 🎯 **Mục đích**: Tạo bảng trong cơ sở dữ liệu `WebScan-development` theo file `migrations`.

```bash
npx sequelize-cli db:migrate
```

- Tự động tạo các bảng: `Users`, `Reports`, `ScanRequests`, `ScanRequestHistories`...

---

### 10. **Khởi động ứng dụng**

> 🎯 **Mục đích**: Chạy server Node.js, kết nối cơ sở dữ liệu, lắng nghe port 8888.

```bash
npm start
```

- Ứng dụng sẵn sàng nhận yêu cầu quét, đăng nhập, xuất báo cáo...

> 📌 Truy cập tại: [http://localhost:8888](http://localhost:8888)

---

## 📄 Cấu trúc thư mục

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

Nếu gặp lỗi hoặc cần hỗ trợ hãy liên hệ người phát triển.
