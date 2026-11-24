# RetailFlow POS — Stage 12: Scaling and Performance Architecture

## 1. Architectural Philosophy: The Modular Monolith

RetailFlow POS is intentionally designed as a **high-throughput, modular monolith** running on Java 21, Spring Boot 3, and MySQL 8.0 InnoDB. 

### Why Modular Monolith Over Microservices?
1. **ACID Checkout Correctness**: A point-of-sale checkout must atomically decrement inventory, persist line items, record payments, and write immutable audit ledger entries. In a distributed microservices setup, this requires two-phase commits (2PC) or the Saga pattern with eventual consistency, introducing phantom stock windows and potential overselling.
2. **Sub-50ms Transaction Latency**: Cashiers cannot tolerate cross-service network latency or distributed consensus overhead when scanning items during peak rush hours.
3. **Single Process Operational Simplicity**: Minimal operational footprint, easy zero-downtime blue/green deployment, and straightforward local development.

---

## 2. Implemented Scaling Improvements

### 2.1 Database Indexing Strategy (Flyway V3)
Database queries are optimized via composite and targeted indexes:
- `products(barcode)` & `products(sku)`: Sub-millisecond barcode scanner queries.
- `products(store_id, category_id)`: Instant catalog filtering by department.
- `products(store_id, stock_on_hand, low_stock_threshold)`: High-speed low stock alerting.
- `sales(idempotency_key)`: Unique index preventing duplicate billing.
- `sales(store_id, date)`: Indexed daily/date-range sales aggregation.
- `sale_items(sale_id, product_id)`: Fast relational joins between invoices and products.
- `stock_movements(product_id, created_at DESC)`: Instant chronological inventory ledger views.
- `purchase_orders(supplier_id, order_date DESC)`: Rapid supplier history retrieval.

### 2.2 N+1 Query Elimination
- Configured Hibernate `default_batch_fetch_size: 50` in `application.yml`.
- Batch-fetches `SaleItem` and `PurchaseOrderItem` collections in single SQL statements using `IN (?, ?, ...)` clauses rather than individual round-trips.

### 2.3 Concurrency Control & Inventory Safety
- Implemented **Pessimistic Write Locking** (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) on `productRepository.findByIdForUpdate(id)`.
- Prevents overselling when two cashiers simultaneously scan the last remaining unit of a product.
- Strict database transactions (`@Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)`) ensure immediate rollback if any validation fails.

### 2.4 HikariCP High-Throughput Connection Pooling
- Configured maximum pool size of 20 with 5 minimum idle connections.
- Set connection timeout to 20,000ms and max lifetime to 1,800,000ms (30 minutes) to eliminate stale MySQL connection drops.

### 2.5 Stateless Multi-Instance Deployment Readiness
- Stateless JWT Bearer tokens signed with HMAC-SHA256 (`HS256`).
- Server instances hold **zero** user session state in local memory.
- Any number of Spring Boot instances can sit behind an Application Load Balancer (ALB) or NGINX with round-robin routing without sticky sessions.

---

## 3. Technology Evaluation: When and Why to Introduce Additional Infrastructure

| Technology | Bottleneck It Solves | Current Status | When to Introduce |
|---|---|---|---|
| **Redis** | 1. In-memory distributed caching for high-read catalog items.<br>2. Distributed rate-limiting on login/scanning.<br>3. Pub/Sub broker for multi-instance Server-Sent Events (SSE). | **Evaluated — Not needed yet.** MySQL InnoDB buffer pool caches 24–500 products in RAM directly. Single node SSE uses in-memory `SseEmitter`. | When deploying **3+ Spring Boot instances** behind a load balancer that require shared SSE broadcasting across instances, or when catalog reads exceed 5,000 requests/sec. |
| **MySQL Read Replicas** | Contention between long-running analytical queries (GSTR-1, monthly trends) and high-priority write transactions (cashier checkouts). | **Evaluated — Not needed yet.** Indexed queries execute in under 10ms for current dataset. | When the store scales to **10+ active checkout counters** generating >100,000 sales/month, route `GET /api/v1/reports/**` to a read replica (`@Transactional(readOnly = true)`). |
| **Background Queues (RabbitMQ / Kafka)** | Asynchronous non-blocking execution of heavy, non-critical background jobs (PDF receipt rendering, email/SMS dispatch, bulk CSV imports, ERP sync). | **Evaluated — Not needed yet.** Spring `@Async` or synchronous responses are currently immediate (<50ms). | When integrating third-party messaging (WhatsApp/SMS receipt dispatch via Twilio/Gupshup) or third-party accounting webhooks (Tally/Zoho) that shouldn't delay cashier checkout. |
| **CQRS / Separate Reporting Read Models** | Heavy aggregate queries that scan millions of historic transaction lines. | **Evaluated — Not needed yet.** Normalized tables with V3 composite indexes handle current reporting load with zero checkout degradation. | When data warehouse analytics or cross-store multi-chain reporting is required across 50+ stores. |

---

## 4. Production Runbook & Environment Variables

```bash
# Externalized Configuration Variables
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=retailflow_db
DB_USERNAME=retailflow_user
DB_PASSWORD=SecurePassword@2026
DB_POOL_MAX=20
DB_POOL_MIN=5
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION_MS=86400000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```
