-- RetailFlow POS — Stage 16.3 Migration: Unique Idempotency Key & Request Hash
ALTER TABLE sales ADD COLUMN request_hash VARCHAR(64) AFTER idempotency_key;
ALTER TABLE sales ADD CONSTRAINT uq_sales_idempotency_key UNIQUE (idempotency_key);
