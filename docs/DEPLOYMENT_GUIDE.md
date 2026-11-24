# RetailFlow POS — Cloud Deployment & Operations Guide

This guide provides the complete, production-grade deployment procedure for **RetailFlow POS** using:
- **Frontend:** Vercel (React 19 + TypeScript + Vite)
- **Backend:** Railway (Spring Boot 3 + Java 21 via Docker)
- **Database:** Railway Managed MySQL 8.0 (Isolated Private Network)

---

## 1. Cloud Architecture & Network Security

```mermaid
flowchart TD
    User["Store Cashier / Manager Browser"]
    VercelEdge["Vercel Global Edge Network\n(HTTPS / TLS 1.3)"]
    RailwayBackend["Railway Container Service\n(Spring Boot 3 / OpenJDK 21)\nhttps://<app>.up.railway.app"]
    RailwayMySQL[("Railway MySQL 8.0\nPrivate VPC / Internal Network\nmysql.railway.internal:3306")]

    User -->|1. HTTPS static assets & SPA| VercelEdge
    User -->|2. HTTPS REST & SSE (/api/v1/*)| RailwayBackend
    RailwayBackend -->|3. TCP over private VPC (Zero public exposure)| RailwayMySQL
```

### Security Guardrails:
1. **Zero Public Database Exposure:** The MySQL database communicates with the Spring Boot backend over Railway's internal private network (`mysql.railway.internal`). Do not enable public TCP proxies for the database in production.
2. **Stateless JWT Security:** Authentication uses cryptographically signed HMAC-SHA256 tokens with a 24-hour expiration.
3. **CORS Whitelisting:** The backend only responds to pre-flight and API requests originating from your authenticated Vercel domain.

---

## 2. Database Backup & Recovery Procedures

### 2.1 Automated Nightly Backup via `mysqldump`
Run the backup script via cron or scheduled task:

```bash
#!/bin/bash
# retailflow_backup.sh - Automated compressed database snapshot
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/retailflow"
mkdir -p "$BACKUP_DIR"

mysqldump \
  --host="$MYSQLHOST" \
  --port="$MYSQLPORT" \
  --user="$MYSQLUSER" \
  --password="$MYSQLPASSWORD" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$MYSQLDATABASE" | gzip > "$BACKUP_DIR/retailflow_${TIMESTAMP}.sql.gz"

# Retain snapshots for 30 days
find "$BACKUP_DIR" -type f -name "retailflow_*.sql.gz" -mtime +30 -delete
echo "Backup completed: retailflow_${TIMESTAMP}.sql.gz"
```

### 2.2 Point-In-Time Disaster Recovery Procedure
To restore from a backup snapshot:

```bash
# 1. Decompress snapshot
gunzip -c /var/backups/retailflow/retailflow_20261124_000000.sql.gz > /tmp/restore.sql

# 2. Execute restore against MySQL
mysql \
  --host="$MYSQLHOST" \
  --port="$MYSQLPORT" \
  --user="$MYSQLUSER" \
  --password="$MYSQLPASSWORD" \
  "$MYSQLDATABASE" < /tmp/restore.sql

# 3. Clean up temporary files
rm /tmp/restore.sql
```

---

## 3. Step-by-Step Deployment Instructions

### Phase A: Deploy MySQL on Railway

1. Log in to your account at [Railway.app](https://railway.app).
2. Click **New Project** $\rightarrow$ **Provision MySQL**.
3. Railway will provision a dedicated MySQL 8.0 instance within a private network.
4. Click on the MySQL card, navigate to the **Variables** tab, and take note of the connection variables:
   - `MYSQLHOST` (typically `mysql.railway.internal`)
   - `MYSQLPORT` (`3306`)
   - `MYSQLDATABASE` (`railway`)
   - `MYSQLUSER` (`root`)
   - `MYSQLPASSWORD`

---

### Phase B: Deploy Spring Boot Backend on Railway

1. In the same Railway project, click **New** $\rightarrow$ **GitHub Repo**.
2. Select your `RetailFlow-POS` repository.
3. In the service settings:
   - **Root Directory:** Set to `/backend`
   - **Build:** Railway will automatically detect `backend/Dockerfile`.
4. Navigate to the **Variables** tab of the backend service and configure:

| Variable Name | Recommended Value / Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `MYSQLHOST` | `${{MySQL.MYSQLHOST}}` *(Railway Reference)* |
| `MYSQLPORT` | `${{MySQL.MYSQLPORT}}` *(Railway Reference)* |
| `MYSQLDATABASE` | `${{MySQL.MYSQLDATABASE}}` *(Railway Reference)* |
| `MYSQLUSER` | `${{MySQL.MYSQLUSER}}` *(Railway Reference)* |
| `MYSQLPASSWORD` | `${{MySQL.MYSQLPASSWORD}}` *(Railway Reference)* |
| `JWT_SECRET` | Generate a 32+ character string (e.g. `openssl rand -hex 32`) |
| `CORS_ALLOWED_ORIGINS` | Temporary: `http://localhost:3000` (Update in Phase D with Vercel domain) |
| `INITIAL_ADMIN_EMAIL` | `admin@retailflow.in` |
| `INITIAL_ADMIN_PASSWORD` | Choose a strong initial admin password |

5. Navigate to the **Settings** tab $\rightarrow$ **Networking** $\rightarrow$ Click **Generate Domain**.
6. Railway will assign an HTTPS endpoint (e.g., `https://retailflow-backend-production.up.railway.app`).
7. Test the health check endpoint in your browser or terminal:
   ```bash
   curl https://<your-backend-domain>.up.railway.app/api/v1/health
   # Expected response: {"success":true,"data":{"status":"UP",...}}
   ```
   *Flyway migrations `V1`, `V2`, and `V3` will execute automatically upon container startup.*

---

### Phase C: Deploy Frontend on Vercel

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `RetailFlow-POS` Git repository.
4. In the Project Configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (project root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://<your-backend-domain>.up.railway.app/api/v1`
6. Click **Deploy**.
7. Vercel will build the frontend and provide your production URL (e.g. `https://retailflow-pos.vercel.app`).

---

### Phase D: Bind Production CORS

1. Return to the [Railway.app](https://railway.app) dashboard $\rightarrow$ Backend Service $\rightarrow$ **Variables**.
2. Update `CORS_ALLOWED_ORIGINS` to match your actual Vercel domain(s):
   ```text
   CORS_ALLOWED_ORIGINS=https://retailflow-pos.vercel.app,https://retailflow-pos-*.vercel.app
   ```
3. Railway will automatically redeploy the backend container with the updated CORS policy in under 60 seconds.

---

## 4. Verification & Smoke Testing Checklist

1. **HTTPS Handshake:** Open `https://<your-app>.vercel.app` in your browser. Verify the TLS certificate is valid.
2. **Health Check:** `curl https://<backend>/api/v1/health` returns status `UP`.
3. **Admin Sign-In:** Log in with `admin@retailflow.in` and your configured `INITIAL_ADMIN_PASSWORD`.
4. **Barcode Label Studio:** Open the **Barcode Labels** page, preview a 50mm $\times$ 25mm label, and verify SVG barcode generation.
5. **Cashier Checkout:** Add items to cart in **POS Terminal**, press `F4`, tender payment (Cash/UPI/Card), and confirm the receipt modal renders with invoice number `INV-2026-XXXX`.
6. **Real-Time Synchronization:** Open two browser tabs; perform a stock adjustment or sale in Tab 1 and observe immediate stock decrement in Tab 2 without page reload.
