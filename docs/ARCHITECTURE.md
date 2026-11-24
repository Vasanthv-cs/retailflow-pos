# RetailFlow POS — Full-Stack Modular Monolith Architecture

## 1. System Overview

RetailFlow POS is an Indian retail Point of Sale system engineered for supermarkets, grocery stores, and general retail establishments. The system couples a responsive, keyboard-optimized React 19 single-page application with a high-performance Spring Boot 3 modular monolith backed by MySQL 8.0.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 19 + TypeScript + Vite + Tailwind CSS v4                                   |
|  - Cashier Billing Terminal (Ctrl+K, F2, F4, Esc shortcuts)                       |
|  - 50mm x 25mm Thermal Barcode Label Studio (Code 128 SVG)                       |
|  - Catalog, Inventory, Purchases, Returns, GSTR-1 Analytics                       |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (/api/v1/*)
                                           | Server-Sent Events (/api/v1/events)
+------------------------------------------v----------------------------------------+
|                         APPLICATION LAYER (Spring Boot 3)                         |
|                                                                                   |
|  [Common & Infrastructure]                                                        |
|  - Security & JWT Auth  - Global Exception Handler  - Auditing & Base Entities     |
|                                                                                   |
|  [Modular Domain Boundaries]                                                      |
|  +--------------------+  +--------------------+  +--------------------+           |
|  |    Auth Module     |  |    Store Module    |  |   Catalog Module   |           |
|  | - Staff / Users    |  | - Stores & Branches|  | - Categories       |           |
|  | - Roles & Shifts   |  | - Registers & GSTIN|  | - Products & SKUs  |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|  +--------------------+  +--------------------+  +--------------------+           |
|  |  Inventory Module  |  |  Purchases Module  |  |    Sales Module    |           |
|  | - Stock on Hand    |  | - Suppliers        |  | - POS Cart Checkout|           |
|  | - Transfers/Adjust |  | - Purchase Orders  |  | - Line Items & GST |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|  +--------------------+  +--------------------+  +--------------------+           |
|  |   Payments Module  |  |   Returns Module   |  |   Reports Module   |           |
|  | - Tender Records   |  | - Return Slips     |  | - GSTR-1 Tax Slabs |           |
|  | - Cash Drawer Log  |  | - Restock vs Scrap |  | - Daily Sales/Prof |           |
|  +--------------------+  +--------------------+  +--------------------+           |
+------------------------------------------+----------------------------------------+
                                           | Spring Data JPA / Hibernate
                                           | Flyway Database Migrations
+------------------------------------------v----------------------------------------+
|                                PERSISTENCE LAYER                                  |
|  MySQL 8.0 (InnoDB, utf8mb4)                                                      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Why a Modular Monolith?

Retail systems demand strict data consistency:
1. **Atomic Checkout (ACID):** When a cashier bills an invoice, the system must atomically decrement stock across multiple SKUs, generate a sequential tax invoice number, compute CGST/SGST splits, and log the tender payment. In a microservices architecture, this requires distributed 2-phase commits or complex Saga choreographies that introduce latency and failure modes at checkout counters.
2. **Sub-second Terminal Latency:** In high-volume checkout lanes (10-20 items per cart), every millisecond counts. In-process service invocations have zero network serialization overhead.
3. **Single Operational Footprint:** Can run either in-store on a local shop back-office machine (essential for reliable offline-tolerant Indian retail) or on a cloud virtual machine.

---

## 3. Package & Module Design

All modules reside under `com.retailflow`:

```
com.retailflow/
├── RetailFlowApplication.java
├── common/
│   ├── api/
│   │   ├── ApiResponse.java             # Uniform JSON response envelope
│   │   ├── PageResponse.java            # Pagination metadata envelope
│   │   └── ErrorResponse.java           # Standardized error details
│   ├── exception/
│   │   ├── BusinessException.java       # Root domain exception
│   │   ├── ResourceNotFoundException.java
│   │   ├── InsufficientStockException.java
│   │   └── GlobalExceptionHandler.java  # @RestControllerAdvice
│   ├── security/
│   │   ├── JwtTokenProvider.java        # JWT creation & validation
│   │   ├── JwtAuthenticationFilter.java # OncePerRequestFilter
│   │   ├── SecurityConfig.java          # SecurityFilterChain & CORS
│   │   └── UserPrincipal.java           # UserDetails implementation
│   └── audit/
│       ├── AuditableEntity.java         # createdAt, updatedAt, createdBy, updatedBy
│       └── AuditLog.java                # Audit trail table entity
│
└── modules/
    ├── auth/                            # Staff Authentication & Access Control
    │   ├── controller/AuthController.java
    │   ├── dto/AuthDtos.java
    │   ├── entity/User.java, Role.java
    │   ├── repository/UserRepository.java
    │   └── service/AuthService.java
    │
    ├── store/                           # Store Profile, Branches, Registers & Tax
    │   ├── controller/StoreController.java
    │   ├── entity/Store.java, Register.java, StoreSettings.java
    │   ├── repository/StoreRepository.java
    │   └── service/StoreService.java
    │
    ├── catalog/                         # Categories, Products & Barcodes
    │   ├── controller/CategoryController.java, ProductController.java
    │   ├── entity/Category.java, Product.java
    │   ├── repository/CategoryRepository.java, ProductRepository.java
    │   └── service/CatalogService.java
    │
    ├── inventory/                       # Stock on Hand, Adjustments & Transfers
    │   ├── controller/InventoryController.java
    │   ├── entity/InventoryLevel.java, StockMovement.java
    │   ├── repository/InventoryLevelRepository.java, StockMovementRepository.java
    │   └── service/InventoryService.java
    │
    ├── purchases/                       # Suppliers & Purchase Orders
    │   ├── controller/SupplierController.java, PurchaseOrderController.java
    │   ├── entity/Supplier.java, PurchaseOrder.java, PurchaseOrderItem.java
    │   ├── repository/SupplierRepository.java, PurchaseOrderRepository.java
    │   └── service/PurchaseService.java
    │
    ├── sales/                           # POS Checkout, Sales Invoices & GST
    │   ├── controller/SalesController.java
    │   ├── entity/Sale.java, SaleItem.java
    │   ├── repository/SaleRepository.java
    │   └── service/SalesService.java
    │
    ├── payments/                        # Tender Processing (Cash, UPI, Card)
    │   ├── controller/PaymentController.java
    │   ├── entity/Payment.java, CashDrawerSession.java
    │   ├── repository/PaymentRepository.java
    │   └── service/PaymentService.java
    │
    ├── returns/                         # Customer Returns & Refund Calculations
    │   ├── controller/ReturnController.java
    │   ├── entity/ReturnRecord.java, ReturnItem.java
    │   ├── repository/ReturnRepository.java
    │   └── service/ReturnService.java
    │
    └── reports/                         # GSTR-1, Margins & Daily Performance
        ├── controller/ReportController.java
        ├── dto/ReportDtos.java
        └── service/ReportService.java
```

---

## 4. Inter-Module Communication Rules

1. **Direct Service Calls within Same Process:** Modules invoke other module services directly through typed interfaces (e.g. `SalesService` calls `InventoryService.decrementStock(...)`).
2. **Single Transaction Boundary:** Calling methods marked with `@Transactional` ensures that cross-module actions (e.g. `completeSale` creating a `Sale`, writing `SaleItem`s, deducting `InventoryLevel`s, and creating a `Payment`) succeed or roll back together.
3. **Domain Event Broadcasting:** For non-critical side effects (e.g. alerting managers of low stock, updating real-time dashboards), modules publish Spring Application Events (`ApplicationEventPublisher`), consumed asynchronously by event listeners.
