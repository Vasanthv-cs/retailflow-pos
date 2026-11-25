-- RetailFlow POS — Stage 16.4 Migration: Tenant-scope categories and suppliers
-- Safe additive migration with DEFAULT 'store-1' so existing data is preserved without silent mutation.
ALTER TABLE categories ADD COLUMN store_id VARCHAR(36) NOT NULL DEFAULT 'store-1' AFTER id;
ALTER TABLE categories ADD CONSTRAINT fk_categories_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX idx_categories_store ON categories (store_id);

ALTER TABLE suppliers ADD COLUMN store_id VARCHAR(36) NOT NULL DEFAULT 'store-1' AFTER id;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX idx_suppliers_store ON suppliers (store_id);
