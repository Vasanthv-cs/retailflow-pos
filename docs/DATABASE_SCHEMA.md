# RetailFlow POS — Database Schema & Data Modeling

## 1. Relational Design Principles

- **Database Engine:** MySQL 8.0 (InnoDB)
- **Character Set:** `utf8mb4` with `utf8mb4_unicode_ci` collation
- **Naming Conventions:**
  - Table names: plural, lowercase snake_case (`products`, `sales`, `sale_items`)
  - Primary keys: `id` (VARCHAR(36) UUID or deterministic formatted strings e.g. `prod-1`, `INV-2026-1001`)
  - Foreign keys: `<singular_table>_id` (`category_id`, `supplier_id`, `sale_id`)
  - Monetary fields: `DECIMAL(12, 2)` (never float or double to prevent rounding errors in Indian Rupees)
  - Percentages / Rates: `DECIMAL(5, 2)` (e.g. `5.00`, `18.00` for GST)
  - Timestamps: `DATETIME(3)` / `TIMESTAMP` in UTC

---

## 2. Table Specifications

### 2.1 Store & Auth
- **`stores`**: `id`, `name`, `legal_name`, `gstin`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `currency_symbol`, `receipt_footer`, `default_low_stock_threshold`, `tax_inclusive_pricing`, `created_at`, `updated_at`
- **`roles`**: `id`, `name` (`STORE_MANAGER`, `HEAD_CASHIER`, `CASHIER`, `INVENTORY_CLERK`, `ACCOUNTANT`), `description`
- **`users`**: `id`, `store_id`, `name`, `employee_code`, `email`, `password_hash`, `phone`, `role_id`, `shift`, `status`, `joined_date`, `created_at`, `updated_at`

### 2.2 Catalog & Inventory
- **`categories`**: `id`, `name`, `description`, `default_gst_rate`, `created_at`, `updated_at`
- **`suppliers`**: `id`, `name`, `contact_person`, `phone`, `email`, `gstin`, `city`, `address`, `payment_terms`, `created_at`, `updated_at`
- **`products`**: `id`, `store_id`, `category_id`, `supplier_id`, `name`, `brand`, `sku` (UNIQUE), `barcode` (INDEX), `hsn_code`, `unit`, `purchase_price`, `selling_price`, `gst_rate`, `stock_on_hand`, `low_stock_threshold`, `location`, `status`, `description`, `image_url`, `created_at`, `updated_at`
- **`stock_movements`**: `id`, `product_id`, `store_id`, `movement_type` (`SALE`, `PURCHASE`, `ADJUSTMENT`, `TRANSFER`, `RETURN`), `quantity_change`, `previous_stock`, `new_stock`, `reference_id`, `performed_by`, `location`, `note`, `created_at`

### 2.3 Purchases
- **`purchase_orders`**: `id`, `store_id`, `supplier_id`, `po_number` (UNIQUE), `order_date`, `expected_date`, `received_date`, `status` (`PENDING`, `ORDERED`, `RECEIVED`), `total_amount`, `notes`, `created_at`, `updated_at`
- **`purchase_order_items`**: `id`, `purchase_order_id`, `product_id`, `quantity`, `unit_cost`, `gst_rate`, `tax_amount`, `line_total`

### 2.4 Sales & Invoicing
- **`sales`**: `id`, `store_id`, `cashier_id`, `invoice_number` (UNIQUE), `date`, `customer_name`, `customer_phone`, `subtotal`, `discount_type`, `discount_value`, `discount_amount`, `cgst_amount`, `sgst_amount`, `tax_amount`, `total_amount`, `estimated_profit`, `payment_method`, `payment_reference`, `amount_tendered`, `change_due`, `status` (`COMPLETED`, `PARTIAL_RETURN`, `RETURNED`), `created_at`
- **`sale_items`**: `id`, `sale_id`, `product_id`, `quantity`, `returned_quantity`, `unit_price`, `purchase_price`, `gst_rate`, `cgst_amount`, `sgst_amount`, `tax_amount`, `line_total`

### 2.5 Payments & Tender Reconciliation
- **`payments`**: `id`, `store_id`, `payment_type` (`SALE`, `REFUND`), `linked_document_id`, `linked_document_number`, `method` (`CASH`, `UPI`, `CARD`), `amount`, `date`, `amount_tendered`, `change_due`, `reference_number`, `created_at`

### 2.6 Returns & Refunds
- **`returns`**: `id`, `store_id`, `sale_id`, `return_number` (UNIQUE), `invoice_number`, `date`, `customer_name`, `processed_by`, `reason`, `notes`, `refund_method`, `refund_reference`, `restock_items`, `total_refund`, `created_at`
- **`return_items`**: `id`, `return_id`, `product_id`, `quantity`, `unit_refund`, `refund_amount`, `condition` (`SELLABLE`, `DAMAGED`)

### 2.7 Audit Logs
- **`audit_logs`**: `id`, `store_id`, `user_id`, `action`, `entity_name`, `entity_id`, `details`, `ip_address`, `created_at`

---

## 3. Database Indexes Strategy

```sql
-- Fast SKU and Barcode lookup for POS scanner
CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_store_category ON products(store_id, category_id);

-- Invoice & PO number lookups
CREATE UNIQUE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_date ON sales(date);
CREATE UNIQUE INDEX idx_po_number ON purchase_orders(po_number);
CREATE UNIQUE INDEX idx_returns_number ON returns(return_number);

-- Stock movements audit
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at);
```
