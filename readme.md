docker network create my_network
docker run -d --name mysql-container --network my_network -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=mydb -p 3306:3306 mysql:latest
docker run -d --name phpmyadmin-container --network my_network -e PMA_HOST=mysql-container -p 8080:80 phpmyadmin/phpmyadmin:latest
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

docker run -it -d --name zap -v D:\KLTN\RP:/tmp ghcr.io/zaproxy/zaproxy:weekly zap.sh -daemon

docker build -t security-tools .
docker run -it --name security-container -d security-tools

Chinh sua file .env CONTAINER_ID
#--------------------------------------------------------------------------
Tao Images
docker build -t security-tools .

Tao Container
docker run -it --name security-container -d security-tools

Chinh sua file .env CONTAINER_ID

SQL Injection
nmap -p80,443 --script http-sql-injection testphp.vulnweb.com
nmap -p80,443 --script http-sql-injection u.gg
sqlmap -u "http://testphp.vulnweb.com/" --batch --forms --crawl=2
sqlmap -u "http://testphp.vulnweb.com/" --forms --crawl=2
sqlmap -u "http://testphp.vulnweb.com/search.php?test=query" --batch --dbs
sqlmap -u "http://testphp.vulnweb.com/search.php?test=query" --batch -D acuart -T products --dump

sqlmap -u "http://testphp.vulnweb.com/search.php?test=query" --passwords

docker run -it -d --name zap -v D:\KLTN\RP:/tmp ghcr.io/zaproxy/zaproxy:weekly zap.sh -daemon

git clone https://github.com/RedSecurity/swit-scanner.git

docker run -d --name postgres_container --network sonar-network -e POSTGRES_USER=sonar -e POSTGRES_PASSWORD=sonar -e POSTGRES_DB=sonarqube -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:latest

docker run -d --name sonarqube_container --network sonar-network --link postgres_container -e SONAR_JDBC_URL="jdbc:postgresql://postgres_container:5432/sonarqube" -e SONAR_JDBC_USERNAME=sonar -e SONAR_JDBC_PASSWORD=sonar -p 9000:9000 -p 9092:9092 -v sonarqube_data:/opt/sonarqube/data -v sonarqube_logs:/opt/sonarqube/logs -v sonarqube_extensions:/opt/sonarqube/extensions sonarqube:latest

curl -u admin:admin -X POST "http://localhost:9000/web_api/api/user_tokens/generate?name=my-new-token"
curl -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate?name=my-new-token"
{"login":"admin","name":"my-new-token","token":"squ_beb27354502a4f077090089147df9eec6bcde5f5","createdAt":"2025-02-09T05:10:43+0000","type":"USER_TOKEN"}

docker run --rm -it --name sonar-cli --network sonar-network -v D:\KLTN\app:/app alpine/git clone https://github.com/Snehaa2444/Java-Projects-Beginner-.git /app

docker run -it --name sonar-scanner --network sonar-network -v D:\KLTN\app:/src sonarsource/sonar-scanner-cli -Dsonar.projectKey=my_project -Dsonar.sources=/src -Dsonar.host.url=http://sonarqube:9000 -Dsonar.login=squ_beb27354502a4f077090089147df9eec6bcde5f5

sqp_7255fb32f3b825637b3857b36513fbf875b7f515

docker run --rm --network=host -e SONAR_HOST_URL="http://localhost:9000" -v "D:\KLTN\app\Java-Projects-Beginner--main\Java-Projects-Beginner--main:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=myProject -Dsonar.sonar.projectVersion=1.0 -Dsonar.sonar.language=java -Dsonar.sonar.sourceEncoding=UTF-8 -Dsonar.login=sqp_7255fb32f3b825637b3857b36513fbf875b7f515 -Dsonar.sonar.projectBaseDir=/root/src -Dsonar.sources=. -Dsonar.exclusions="**/*.java"


docker run --rm --network=host -e SONAR_HOST_URL="http://localhost:9000" -v "D:\KLTN\app\Java-Projects-Beginner--main\Java-Projects-Beginner--main:/usr/src" sonarsource/sonar-scanner-cli sonar-scanner -Dsonar.projectKey=myProject -Dsonar.sources=/usr/src -Dsonar.host.url=http://localhost:9000 -Dsonar.token=sqp_7255fb32f3b825637b3857b36513fbf875b7f515

docker run --rm --network=host -e SONAR_HOST_URL="http://localhost:9000" -v "/d/KLTN/app/Java-Projects-Beginner--main/Java-Projects-Beginner--main:/usr/src" sonarsource/sonar-scanner-cli sonar-scanner -Dsonar.projectKey=myProject -Dsonar.sources=/usr/src -Dsonar.host.url=http://localhost:9000 -Dsonar.token=sqp_7255fb32f3b825637b3857b36513fbf875b7f515

