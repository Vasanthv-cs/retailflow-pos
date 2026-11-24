# RetailFlow POS — API Conventions & Standards

## 1. Base URL & Protocol

- **Base URL:** `/api/v1`
- **Protocol:** HTTPS in production; HTTP for local development (`http://localhost:8080/api/v1`).
- **Data Format:** All request and response payloads use `application/json;charset=UTF-8`.
- **Date/Time Standard:** ISO-8601 strings in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 2. Standard Response Envelopes

### 2.1 Single Resource / Mutation Response
Every successful API response wraps its data in a consistent JSON envelope:

```json
{
  "success": true,
  "timestamp": "2026-11-23T10:30:00Z",
  "data": {
    "id": "prod-1",
    "name": "Deccan Aged Basmati Rice 5kg",
    "sku": "GRN-1001",
    "barcode": "890100100101",
    "sellingPrice": 560.00
  },
  "message": "Product retrieved successfully"
}
```

### 2.2 Paginated Collection Response
List endpoints accept `page` (0-indexed, default `0`), `size` (default `25`, max `100`), `sortBy` (default `createdAt`), and `direction` (`ASC` | `DESC`):

```json
{
  "success": true,
  "timestamp": "2026-11-23T10:30:00Z",
  "data": [ ... ],
  "pagination": {
    "page": 0,
    "size": 25,
    "totalElements": 24,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```

---

## 3. Standard Error Envelope

When an error occurs, the server returns an HTTP status code alongside a structured error object:

```json
{
  "success": false,
  "timestamp": "2026-11-23T10:30:00Z",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for product Deccan Aged Basmati Rice 5kg (GRN-1001). Requested: 5, Available: 2.",
    "status": 409,
    "path": "/api/v1/sales/checkout",
    "details": [
      {
        "field": "items[0].quantity",
        "rejectedValue": 5,
        "constraint": "Requested quantity exceeds available stock of 2"
      }
    ]
  }
}
```

### Standard Error Codes:
| Error Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Request body failed `@Valid` constraints |
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `ACCESS_DENIED` | 403 | User lacks required role permission |
| `RESOURCE_NOT_FOUND` | 404 | Entity ID not found in database |
| `DUPLICATE_SKU` | 409 | SKU already exists |
| `DUPLICATE_BARCODE` | 409 | Barcode assigned to another product |
| `INSUFFICIENT_STOCK` | 409 | Cannot decrement stock below zero |
| `EXCEEDS_RETURN_LIMIT` | 409 | Cannot return more quantity than purchased |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## 4. Authentication & Security

- **Mechanism:** JWT (JSON Web Tokens) with HMAC-SHA256 signing (`HS256`).
- **Header:** `Authorization: Bearer <token>`
- **Token Claims:** `sub` (user email), `userId`, `role` (`STORE_MANAGER`, `HEAD_CASHIER`, `CASHIER`, `INVENTORY_CLERK`, `ACCOUNTANT`), `storeId`.
- **Public Endpoints:**
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `GET /api/v1/actuator/health`

---

## 5. REST Resource Mapping

| Resource / Action | Method | Path | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate staff user & return JWT token |
| | `POST` | `/api/v1/auth/logout` | Invalidate / client discard token |
| | `GET` | `/api/v1/auth/me` | Return currently authenticated user profile |
| | `POST` | `/api/v1/auth/change-password` | Update password for current user |
| **Store** | `GET` | `/api/v1/store/settings` | Get store profile, GSTIN, receipt defaults |
| | `PUT` | `/api/v1/store/settings` | Update store configuration |
| **Categories** | `GET` | `/api/v1/categories` | List all categories with default GST slabs |
| | `POST` | `/api/v1/categories` | Create new category |
| | `PUT` | `/api/v1/categories/{id}` | Update category |
| | `DELETE`| `/api/v1/categories/{id}` | Delete category (blocked if products linked) |
| **Products (Stage 4)** | `GET` | `/api/v1/products` | Search/filter products by name, SKU, category, storeId |
| | `GET` | `/api/v1/products/paginated` | Paginated product search with sorting (`page`, `size`, `sortBy`, `direction`) |
| | `GET` | `/api/v1/products/{id}` | Get product details by ID |
| | `GET` | `/api/v1/products/by-barcode/{code}` | Fast lookup by barcode or SKU for POS scanning |
| | `GET` | `/api/v1/products/low-stock` | List products with `stockOnHand <= lowStockThreshold` |
| | `POST` | `/api/v1/products` | Add SKU with cost, retail price, GST rate, duplicate SKU/barcode validation |
| | `PUT` | `/api/v1/products/{id}` | Update SKU with duplicate check excluding current ID |
| | `DELETE`| `/api/v1/products/{id}` | Delete product by ID |
| **Inventory (Stage 4)** | `GET` | `/api/v1/inventory` | List branch inventory records with stock status and valuations |
| | `GET` | `/api/v1/inventory/valuation` | Aggregate inventory valuation summary (total cost, retail, potential margin, stock health) |
| | `POST` | `/api/v1/inventory/adjust` | Manual quantity adjustment with audit reason & negative stock guard |
| | `POST` | `/api/v1/inventory/transfer`| Inter-location transfer (Main Floor <-> Back Storage) |
| | `GET` | `/api/v1/inventory/movements`| Audit ledger of all stock movements (Adjustment, Transfer, Purchase, Sale, Return) |
| **Suppliers (Stage 5)** | `GET` | `/api/v1/suppliers` | List wholesale suppliers with search query (`name`, `GSTIN`, `contact`, `city`) |
| | `GET` | `/api/v1/suppliers/{id}` | Get supplier details by ID |
| | `GET` | `/api/v1/suppliers/{id}/purchase-history` | View order history for supplier |
| | `POST` | `/api/v1/suppliers` | Add supplier with unique GSTIN validation |
| | `PUT` | `/api/v1/suppliers/{id}` | Update supplier profile |
| **Purchases (Stage 5)** | `GET` | `/api/v1/purchase-orders` | List purchase orders with status filter (`DRAFT`, `ORDERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`) |
| | `GET` | `/api/v1/purchase-orders/{id}` | Get purchase order details and line items |
| | `POST` | `/api/v1/purchase-orders` | Issue purchase order (**DOES NOT increase stock**) |
| | `POST` | `/api/v1/purchase-orders/{id}/receive` | Partial or full goods receipt (**atomically increases stock & logs StockMovement**) |
| | `PATCH`| `/api/v1/purchase-orders/{id}/cancel` | Cancel purchase order (blocked if already received) |
| **Sales** | `POST` | `/api/v1/sales/checkout`| Atomic POS checkout (cart, tax, tender, stock) |
| | `GET` | `/api/v1/sales` | Filter sales invoices by date range, tender |
| | `GET` | `/api/v1/sales/{id}` | Get full invoice details with line items |
| **Returns** | `POST` | `/api/v1/returns` | Process return (sellable restock vs scrap) |
| | `GET` | `/api/v1/returns` | List return slips |
| **Reports** | `GET` | `/api/v1/reports/summary` | Today's revenue, profit, transaction count |
| | `GET` | `/api/v1/reports/gstr1` | GSTR-1 compliant tax breakdown by slab |
| | `GET` | `/api/v1/reports/daily-trends`| 7-day revenue vs profit chart data |

---

## 6. Stage 4 & 5 Request and Response Examples

### 6.1 Create Product Request (`POST /api/v1/products`)
```json
{
  "name": "Fortune Sunlite Refined Sunflower Oil 1L",
  "brand": "Fortune",
  "sku": "OIL-FOR-1L",
  "barcode": "8901234567891",
  "categoryId": "cat-oil",
  "supplierId": "sup-1",
  "storeId": "store-1",
  "hsnCode": "151219",
  "unit": "Pouch",
  "purchasePrice": 125.00,
  "sellingPrice": 155.00,
  "gstRate": 5.00,
  "stockOnHand": 40,
  "lowStockThreshold": 15,
  "location": "Aisle 2 - Cooking Essentials",
  "status": "Active",
  "description": "Refined sunflower oil enriched with vitamins A & D",
  "imageUrl": "/assets/images/prod_cooking_oil_1795361448274.jpg"
}
```

### 6.2 Inventory Valuation Summary Response (`GET /api/v1/inventory/valuation`)
```json
{
  "success": true,
  "timestamp": "2026-11-24T05:30:00Z",
  "data": {
    "totalCostValuation": 184500.00,
    "totalRetailValuation": 236200.00,
    "potentialProfit": 51700.00,
    "totalProducts": 24,
    "totalUnitsInStock": 1420,
    "lowStockCount": 3,
    "outOfStockCount": 0,
    "healthyStockCount": 21
  }
}
```

### 6.3 Stock Adjustment Request (`POST /api/v1/inventory/adjust`)
```json
{
  "productId": "prod-1",
  "delta": -2,
  "reason": "Water damage near shelf edge",
  "performedBy": "Arvind Subramanian"
}
```

### 6.4 Issue Purchase Order (`POST /api/v1/purchase-orders`)
> **Stock Guard:** Note that issuing a PO never modifies `stockOnHand`. Stock increases only when goods are received.
```json
{
  "supplierId": "sup-1",
  "expectedDate": "2026-11-29",
  "notes": "Urgent restock for festive weekend sale",
  "items": [
    {
      "productId": "prod-1",
      "quantity": 50,
      "unitCost": 420.00,
      "gstRate": 5.00
    }
  ]
}
```

### 6.5 Receive Goods (`POST /api/v1/purchase-orders/{id}/receive`)
> **Guaranteed Effect:** Atomically increments `stockOnHand` by received quantity, logs immutable `StockMovement` entry with reference `PO-xxx`, and updates PO status (`PARTIALLY_RECEIVED` or `RECEIVED`).
```json
{
  "receivedBy": "Rajesh Kumar (Inventory Staff)",
  "items": [
    {
      "productId": "prod-1",
      "quantityReceived": 50
    }
  ]
}
```

---

## 7. Stage 6 & 7 Request and Response Examples

### 7.1 POS Checkout Request (`POST /api/v1/sales/checkout`)
> **Guarantees:**
> - Pessimistic row locking on products prevents overselling.
> - Server recalculates all rates, taxable subtotal, CGST, SGST, and discounts with `BigDecimal`.
> - `idempotencyKey` prevents duplicate billing and duplicate inventory decrements.
> - Supports single or split tender (Cash, Card, UPI).
```json
{
  "idempotencyKey": "IDEMP-20261124-78901",
  "storeId": "store-1",
  "cashierId": "emp-2",
  "customerName": "Sunita Devi",
  "customerPhone": "9876543210",
  "paymentMethod": "Split",
  "discountType": "percent",
  "discountValue": 5.0,
  "items": [
    {
      "productId": "prod-1",
      "quantity": 2
    },
    {
      "productId": "prod-2",
      "quantity": 1
    }
  ],
  "splitPayments": [
    {
      "method": "Cash",
      "amount": 500.00,
      "reference": "CASH-REGISTER-1"
    },
    {
      "method": "UPI",
      "amount": 592.50,
      "reference": "UPI-REF-987654321"
    }
  ]
}
```

### 7.2 Process Return & Refund (`POST /api/v1/returns`)
> **Guarantees:**
> - Validates requested return quantity does not exceed original purchased balance.
> - Sellable items are restocked and logged to `StockMovement`.
> - Damaged items are written off (NOT restocked) and logged to `StockMovement`.
> - Creates a separate refund transaction in `payments` ledger.
```json
{
  "saleId": "sale-101",
  "processedBy": "Arvind Subramanian (Manager)",
  "reason": "Customer bought extra packet by mistake",
  "refundMethod": "UPI",
  "items": [
    {
      "productId": "prod-1",
      "quantity": 1,
      "condition": "Sellable"
    }
  ]
}
```

### 7.3 Category Sales Summary (`GET /api/v1/reports/by-category`)
```json
{
  "success": true,
  "timestamp": "2026-11-24T05:45:00Z",
  "data": [
    {
      "categoryId": "cat-staples",
      "categoryName": "Atta, Rice & Dal",
      "totalRevenue": 48500.00,
      "unitsSold": 142,
      "percentageOfTotal": 42.50
    },
    {
      "categoryId": "cat-oil",
      "categoryName": "Edible Oils & Ghee",
      "totalRevenue": 32100.00,
      "unitsSold": 96,
      "percentageOfTotal": 28.10
    }
  ]
}
```


