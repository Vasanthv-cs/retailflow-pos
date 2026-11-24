# RetailFlow POS — Full-Stack Development Workflow

## 1. Prerequisites

- **Node.js:** v18+ or v20+ (current system: Node.js v24.20.0, npm 11.19.0)
- **Java Development Kit (JDK):** OpenJDK 17 or 21 (Eclipse Temurin or Amazon Corretto)
- **Database:** MySQL Server 8.0 (installed on host at `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`)
- **Maven:** Bundled via Maven Wrapper (`mvnw` / `mvnw.cmd` in backend directory)

---

## 2. Setting Up the Database

1. Open PowerShell or MySQL Shell:
```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -u root -p
```

2. Create the RetailFlow database and dedicated user:
```sql
CREATE DATABASE retailflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'retailflow_user'@'localhost' IDENTIFIED BY 'retailflow_pass';
GRANT ALL PRIVILEGES ON retailflow_db.* TO 'retailflow_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Running the Backend (Spring Boot)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Run Flyway migrations and start the server:
```bash
./mvnw spring-boot:run
```
*(On Windows: `mvnw.cmd spring-boot:run`)*

The Spring Boot backend will start on `http://localhost:8080`, automatically execute Flyway migrations (`V1__init_schema.sql` and `V2__seed_data.sql`), and expose the API under `/api/v1/*`.

To verify health:
```bash
curl http://localhost:8080/api/v1/actuator/health
```

---

## 4. Running the Frontend (React + Vite)

1. In a separate terminal, install packages and start Vite:
```bash
npm.cmd install
npm.cmd run dev
```

2. The frontend runs at `http://localhost:3000`.
Vite proxies `/api/v1` to `http://localhost:8080` or connects directly via `VITE_API_BASE_URL`.

---

## 5. Development Quality Checks

- **Frontend Type Check:**
```bash
node node_modules/typescript/bin/tsc --noEmit
```

- **Frontend Unit Tests (Barcode Engine):**
```bash
node --import tsx src/utils/__tests__/barcode.test.ts
```

- **Backend Integration Tests:**
```bash
cd backend && mvnw.cmd test
```
