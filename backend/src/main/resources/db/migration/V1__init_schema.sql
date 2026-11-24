-- ==============================================================================
-- RetailFlow POS — V1 Database Schema Initialization
-- Engine: MySQL 8.0 (InnoDB, utf8mb4)
-- ==============================================================================

-- 1. Store Profile & Branches
CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(5) DEFAULT '₹',
    receipt_footer TEXT,
    default_low_stock_threshold INT DEFAULT 10,
    tax_inclusive_pricing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Staff Roles & Permissions
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users / Employees
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    shift VARCHAR(50) DEFAULT 'Morning (7 AM - 3 PM)',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    failed_login_attempts INT DEFAULT 0,
    last_login_at DATETIME(3),
    joined_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_gst_rate DECIMAL(5, 2) DEFAULT 5.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Wholesale Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    gstin VARCHAR(15) NOT NULL,
    city VARCHAR(80) NOT NULL,
    address VARCHAR(255) NOT NULL,
    payment_terms VARCHAR(50) DEFAULT 'Net 15 Days',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Products & Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    supplier_id VARCHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(80),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50),
    hsn_code VARCHAR(20) NOT NULL,
    unit VARCHAR(30) DEFAULT 'Piece',
    purchase_price DECIMAL(12, 2) NOT NULL,
    selling_price DECIMAL(12, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL,
    stock_on_hand INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    location VARCHAR(100) DEFAULT 'Main Store Floor',
    status VARCHAR(20) DEFAULT 'Active',
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_store_cat ON products(store_id, category_id);

-- 7. Stock Movements & Audit
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    store_id VARCHAR(36) NOT NULL,
    movement_type VARCHAR(30) NOT NULL, -- SALE, PURCHASE, ADJUSTMENT, TRANSFER, RETURN
    quantity_change INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference VARCHAR(100),
    performed_by VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_movements_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_movements_prod_time ON stock_movements(product_id, created_at);

-- 8. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    supplier_id VARCHAR(36) NOT NULL,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    order_date DATE NOT NULL,
    expected_date DATE NOT NULL,
    received_date DATE,
    received_by VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ORDERED', -- DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id VARCHAR(36) PRIMARY KEY,
    purchase_order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    received_quantity INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_poi_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sales Invoices
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    cashier_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    date DATETIME(3) NOT NULL,
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(20),
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'percent',
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    cgst_amount DECIMAL(12, 2) DEFAULT 0.00,
    sgst_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    estimated_profit DECIMAL(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL, -- Cash, UPI, Card
    payment_reference VARCHAR(100),
    amount_tendered DECIMAL(12, 2),
    change_due DECIMAL(12, 2),
    status VARCHAR(30) DEFAULT 'Completed', -- Completed, Partial Return, Returned
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);

CREATE TABLE IF NOT EXISTS sale_items (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    returned_quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(12, 2) NOT NULL,
    purchase_price DECIMAL(12, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_si_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_si_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payments Ledger
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    payment_type VARCHAR(30) NOT NULL, -- Sale, Refund
    linked_document_id VARCHAR(36) NOT NULL,
    linked_document_number VARCHAR(50) NOT NULL,
    method VARCHAR(30) NOT NULL, -- Cash, UPI, Card
    amount DECIMAL(12, 2) NOT NULL,
    date DATETIME(3) NOT NULL,
    amount_tendered DECIMAL(12, 2),
    change_due DECIMAL(12, 2),
    reference_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_date ON payments(date);

-- 11. Customer Returns & Refunds
CREATE TABLE IF NOT EXISTS returns (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    sale_id VARCHAR(36) NOT NULL,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_number VARCHAR(50) NOT NULL,
    date DATETIME(3) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    processed_by VARCHAR(100) NOT NULL,
    reason VARCHAR(200) NOT NULL,
    notes TEXT,
    refund_method VARCHAR(30) NOT NULL,
    refund_reference VARCHAR(100) NOT NULL,
    restock_items BOOLEAN DEFAULT TRUE,
    total_refund DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_returns_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_sale FOREIGN KEY (sale_id) REFERENCES sales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS return_items (
    id VARCHAR(36) PRIMARY KEY,
    return_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_refund DECIMAL(12, 2) NOT NULL,
    refund_amount DECIMAL(12, 2) NOT NULL,
    item_condition VARCHAR(30) NOT NULL, -- Sellable, Damaged
    CONSTRAINT fk_ri_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) DEFAULT 'info', -- info, warning, success
    target_route VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
