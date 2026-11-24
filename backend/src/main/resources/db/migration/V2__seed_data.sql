-- ==============================================================================
-- RetailFlow POS — V2 Seed Data (Indian Retail Domain)
-- Seeded from seedData.ts: 24 SKUs, 8 Categories, 5 Suppliers, 5 Staff Members
-- ==============================================================================

-- 1. Store
INSERT INTO stores (id, name, legal_name, gstin, phone, email, address, city, state, pincode, currency_symbol, receipt_footer, default_low_stock_threshold, tax_inclusive_pricing)
VALUES ('store-1', 'Annapurna Fresh Mart', 'Annapurna Retail Ventures Pvt. Ltd.', '29AABCA4821K1Z5', '+91 80 4128 7390', 'billing@annapurnamart.in', '42, 12th Main Road, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '₹', 'Thank you for shopping with us. Goods once sold can be exchanged within 7 days with original bill.', 12, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. System Roles (ADMIN, MANAGER, CASHIER, INVENTORY_STAFF, ACCOUNTANT)
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Super administrator with full system permissions and user management'),
('role-manager', 'MANAGER', 'Store manager with shift control, stock authorization, and reports'),
('role-cashier', 'CASHIER', 'Front-counter billing terminal checkout and customer return processing'),
('role-inventory', 'INVENTORY_STAFF', 'Stock adjustments, store transfers, and purchase order inward receiving'),
('role-accountant', 'ACCOUNTANT', 'Financial accounting, payment audits, and GSTR-1 tax ledger reports')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 3. Initial Admin & Staff Users (Default demo passwords: Admin@1234 / demo1234)
INSERT INTO users (id, store_id, name, employee_code, email, password_hash, phone, role_id, shift, status, joined_date) VALUES
('emp-admin', 'store-1', 'Store Administrator', 'ADMIN-001', 'admin@retailflow.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 80 4128 7390', 'role-admin', 'Full Day (9 AM - 6 PM)', 'ACTIVE', '2024-01-01'),
('emp-1', 'store-1', 'Arvind Subramanian', 'RF-101', 'arvind@annapurnamart.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 98450 11223', 'role-manager', 'Full Day (9 AM - 6 PM)', 'ACTIVE', '2024-01-15'),
('emp-2', 'store-1', 'Priya Nair', 'RF-102', 'priya@annapurnamart.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 98450 44332', 'role-cashier', 'Morning (7 AM - 3 PM)', 'ACTIVE', '2024-03-01'),
('emp-3', 'store-1', 'Suresh Kumar', 'RF-103', 'suresh@annapurnamart.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 98450 77889', 'role-cashier', 'Evening (2 PM - 10 PM)', 'ACTIVE', '2024-04-10'),
('emp-4', 'store-1', 'Ananya Rao', 'RF-104', 'ananya@annapurnamart.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 98450 99001', 'role-inventory', 'Full Day (9 AM - 6 PM)', 'ACTIVE', '2024-02-18'),
('emp-5', 'store-1', 'Rajesh Varma', 'RF-105', 'rajesh@annapurnamart.in', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '+91 98450 33445', 'role-manager', 'Morning (7 AM - 3 PM)', 'ACTIVE', '2024-01-20')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. Categories
INSERT INTO categories (id, name, description, default_gst_rate) VALUES
('cat-1', 'Grains & Staples', 'Rice, wheat flour, pulses, and dry staples', 5.00),
('cat-2', 'Cooking Oils & Spices', 'Edible oils, whole spices, and masala blends', 5.00),
('cat-3', 'Dairy & Bakery', 'Milk, curd, ghee, paneer, and fresh breads', 5.00),
('cat-4', 'Beverages', 'Filter coffee, tea blends, fruit juices, and health drinks', 12.00),
('cat-5', 'Snacks & Biscuits', 'Namkeen, savory mixtures, and baked biscuits', 12.00),
('cat-6', 'Personal Care', 'Bath soaps, herbal shampoo, oral care, and skincare', 18.00),
('cat-7', 'Household Supplies', 'Detergents, dishwash liquids, and floor cleaners', 18.00),
('cat-8', 'Fresh Produce', 'Daily farm vegetables and seasonal fruits', 0.00)
ON DUPLICATE KEY UPDATE default_gst_rate=VALUES(default_gst_rate);

-- 5. Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, gstin, city, address, payment_terms) VALUES
('sup-1', 'Deccan Agro Distributors', 'Rajeshwari Kulkarni', '+91 98451 22014', 'orders@deccanagro.in', '29AABCD1928L1Z2', 'Bengaluru', 'APMC Yard, Yeshwanthpur, Bengaluru 560022', 'Net 15 Days'),
('sup-2', 'South Valley Dairy Co-op', 'Suresh Gowda', '+91 97400 81920', 'supply@southvalleydairy.in', '29AABCS7741P1Z8', 'Mandya', 'Industrial Estate Phase 2, Mandya 571401', 'Net 7 Days'),
('sup-3', 'Kaveri FMCG Wholesalers', 'Prakash Nair', '+91 99002 44198', 'dispatch@kaverifmcg.in', '29AAACK5530M1Z1', 'Bengaluru', 'Peenya 3rd Stage, Bengaluru 560058', 'Net 30 Days'),
('sup-4', 'Malabar Spice & Oil Traders', 'Anitha Menon', '+91 98440 61732', 'sales@malabarspices.in', '29AADCM3012E1Z4', 'Mysuru', 'Santhepet Wholesale Market, Mysuru 570001', 'Net 15 Days'),
('sup-5', 'Chamundi Farm Fresh Logistics', 'Manjunath Swamy', '+91 94480 55120', 'procure@chamundifresh.in', '29AAGCC4910N1ZY', 'Hassan', 'B.M. Road, Hassan 573201', 'Immediate / COD')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 6. Products (24 Indian Retail SKUs)
INSERT INTO products (id, store_id, category_id, supplier_id, name, brand, sku, barcode, hsn_code, unit, purchase_price, selling_price, gst_rate, stock_on_hand, low_stock_threshold, location, status, description, image_url) VALUES
('prod-1', 'store-1', 'cat-1', 'sup-1', 'Deccan Aged Basmati Rice 5kg', 'Deccan Harvest', 'GRN-1001', '890100100101', '1006', 'Bag', 465.00, 560.00, 5.00, 42, 12, 'Aisle 1 - Staples', 'Active', 'Extra long grain aged basmati rice for biryani and daily meals', '/src/assets/images/prod_basmati_rice_1795361448882.jpg'),
('prod-2', 'store-1', 'cat-1', 'sup-1', 'Sharbati Whole Wheat Atta 10kg', 'Vindhya Farms', 'GRN-1002', '890100100202', '1101', 'Bag', 380.00, 455.00, 5.00, 28, 10, 'Aisle 1 - Staples', 'Active', 'Stone ground chakki fresh whole wheat flour with natural bran', '/src/assets/images/prod_wheat_atta_1795361448398.jpg'),
('prod-3', 'store-1', 'cat-1', 'sup-1', 'Unpolished Toor Dal 1kg', 'Deccan Harvest', 'GRN-1003', '890100100303', '0713', 'Pack', 132.00, 168.00, 5.00, 55, 15, 'Aisle 1 - Staples', 'Active', 'Nutrient-rich unpolished pigeon pea pulses for traditional dal', '/src/assets/images/prod_toor_dal_1795360958114.jpg'),
('prod-4', 'store-1', 'cat-2', 'sup-4', 'Cold Pressed Groundnut Oil 1L', 'Malabar Gold', 'OIL-2001', '890200200101', '1508', 'Bottle', 190.00, 245.00, 5.00, 18, 10, 'Aisle 2 - Oils & Masala', 'Active', 'Wood pressed filtered peanut oil suitable for deep frying', '/src/assets/images/prod_cooking_oil_1795361448274.jpg'),
('prod-5', 'store-1', 'cat-2', 'sup-4', 'Kashmiri Chilli Powder 250g', 'Malabar Gold', 'SPC-2002', '890200200202', '0904', 'Pouch', 95.00, 130.00, 5.00, 36, 12, 'Aisle 2 - Oils & Masala', 'Active', 'Rich red mild chili powder delivering vibrant natural color', '/src/assets/images/prod_red_spices_1795360973743.jpg'),
('prod-6', 'store-1', 'cat-3', 'sup-2', 'Pure Cow Ghee Tin 500ml', 'South Valley', 'DRY-3001', '890300300101', '0405', 'Tin', 315.00, 395.00, 5.00, 22, 8, 'Aisle 3 - Dairy Refrigerator', 'Active', 'Aromatic golden cow ghee prepared from cultured butter', '/src/assets/images/prod_cow_ghee_1795360967300.jpg'),
('prod-7', 'store-1', 'cat-3', 'sup-2', 'Fresh Malai Paneer 200g', 'South Valley', 'DRY-3002', '890300300202', '0406', 'Pack', 82.00, 110.00, 5.00, 8, 12, 'Aisle 3 - Dairy Refrigerator', 'Active', 'Vacuum packed soft cottage cheese paneer block', '/src/assets/images/prod_fresh_dairy_1795360957593.jpg'),
('prod-8', 'store-1', 'cat-3', 'sup-2', 'Multigrain Brown Bread 400g', 'Bengaluru Bakery', 'BAK-3003', '890300300303', '1905', 'Loaf', 40.00, 55.00, 5.00, 14, 10, 'Aisle 3 - Dairy Refrigerator', 'Active', 'Daily baked multigrain loaf with oats, flax seeds, and sesame', '/src/assets/images/prod_multigrain_bread_1795360966457.jpg'),
('prod-9', 'store-1', 'cat-4', 'sup-3', 'South Indian Filter Coffee 500g', 'Mysuru Blend', 'BEV-4001', '890400400101', '0901', 'Pouch', 210.00, 275.00, 12.00, 30, 10, 'Aisle 4 - Beverages', 'Active', '80:20 roasted coffee chicory blend for decoction lovers', '/src/assets/images/prod_coffee_tea_1795360956188.jpg'),
('prod-10', 'store-1', 'cat-4', 'sup-3', 'Alphonso Mango Pulp Nectar 1L', 'SunTropics', 'BEV-4002', '890400400202', '2202', 'Tetra Pak', 88.00, 125.00, 12.00, 25, 8, 'Aisle 4 - Beverages', 'Active', 'Refreshing natural Alphonso mango fruit beverage', '/src/assets/images/prod_mango_juice_1795360963213.jpg'),
('prod-11', 'store-1', 'cat-5', 'sup-3', 'Spicy Madras Mixture 400g', 'Annapoorna Snacks', 'SNK-5001', '890500500101', '2106', 'Pack', 92.00, 135.00, 12.00, 48, 15, 'Aisle 5 - Snacks', 'Active', 'Traditional savory namkeen mixture with fried curry leaves and peanuts', '/src/assets/images/prod_snacks_biscuits_1795360957439.jpg'),
('prod-12', 'store-1', 'cat-5', 'sup-3', 'Bakery Butter Cookies 300g', 'Bengaluru Bakery', 'SNK-5002', '890500500202', '1905', 'Box', 70.00, 105.00, 12.00, 19, 10, 'Aisle 5 - Snacks', 'Active', 'Melt-in-mouth cashew butter biscuits', '/src/assets/images/prod_butter_cookies_1795360957168.jpg'),
('prod-13', 'store-1', 'cat-6', 'sup-3', 'Herbal Neem & Aloe Bath Soap 125g', 'Prakriti Herbs', 'PC-6001', '890600600101', '3401', 'Bar', 34.00, 48.00, 18.00, 60, 20, 'Aisle 6 - Personal Care', 'Active', 'Ayurvedic grade moisturizing soap with pure neem oil', '/src/assets/images/prod_bath_soap_1795361448359.jpg'),
('prod-14', 'store-1', 'cat-6', 'sup-3', 'Herbal Hair Oil 200ml', 'Prakriti Herbs', 'PC-6002', '890600600202', '3305', 'Bottle', 120.00, 175.00, 18.00, 15, 8, 'Aisle 6 - Personal Care', 'Active', 'Bhrinraj and amla infused scalp nourishment oil', '/src/assets/images/prod_personal_care_1795360959255.jpg'),
('prod-15', 'store-1', 'cat-7', 'sup-3', 'Bio-Enzyme Detergent Powder 2kg', 'CleanGlow', 'HH-7001', '890700700101', '3402', 'Bag', 185.00, 260.00, 18.00, 24, 10, 'Aisle 7 - Household', 'Active', 'Front and top load washing machine safe stain remover powder', '/src/assets/images/prod_household_detergent_1795360965392.jpg'),
('prod-16', 'store-1', 'cat-7', 'sup-3', 'Lemon Floor Cleaner 1L', 'CleanGlow', 'HH-7002', '890700700202', '3808', 'Bottle', 82.00, 120.00, 18.00, 17, 8, 'Aisle 7 - Household', 'Active', '99.9% germ kill citrus scented surface cleaner', '/src/assets/images/prod_surface_cleaners_1795394274615.jpg'),
('prod-17', 'store-1', 'cat-8', 'sup-5', 'Farm Fresh Red Onions 2kg', 'Chamundi Direct', 'VEG-8001', '890800800101', '0703', 'Net Bag', 52.00, 75.00, 0.00, 40, 15, 'Produce Bay 1', 'Active', 'Graded medium dry red onions from Lasalgaon harvest', '/src/assets/images/prod_fresh_produce_1795360959450.jpg'),
('prod-18', 'store-1', 'cat-8', 'sup-5', 'Local Hybrid Tomatoes 1kg', 'Chamundi Direct', 'VEG-8002', '890800800202', '0702', 'Crate Pack', 26.00, 42.00, 0.00, 32, 12, 'Produce Bay 1', 'Active', 'Firm ripe salad and cooking tomatoes sourced daily', '/src/assets/images/prod_fresh_produce_1795393273389.jpg'),
('prod-19', 'store-1', 'cat-2', 'sup-4', 'Erode Turmeric Powder 200g', 'Malabar Gold', 'SPC-2003', '890200200303', '0910', 'Pouch', 48.00, 70.00, 5.00, 26, 8, 'Aisle 2 - Oils & Masala', 'Active', 'High-curcumin aromatic ground turmeric from Erode farms', '/src/assets/images/prod_turmeric_masala_1795361449203.jpg'),
('prod-20', 'store-1', 'cat-4', 'sup-3', 'Darjeeling Green Tea 100g', 'Himalayan Leaf', 'BEV-4003', '890400400303', '0902', 'Tin', 145.00, 210.00, 12.00, 18, 6, 'Aisle 4 - Beverages', 'Active', 'Single-origin antioxidant rich whole leaf loose green tea', '/src/assets/images/prod_green_tea_1795361448516.jpg'),
('prod-21', 'store-1', 'cat-7', 'sup-3', 'Lemon Fresh Dishwash Gel 750ml', 'CleanGlow', 'HH-7003', '890700700303', '3402', 'Bottle', 76.00, 115.00, 18.00, 22, 8, 'Aisle 7 - Household', 'Active', 'Tough grease cutting active gel with real lemon extract', '/src/assets/images/prod_dishwash_gel_1795361450087.jpg'),
('prod-22', 'store-1', 'cat-8', 'sup-5', 'Farm Basket Golden Potatoes 2kg', 'Chamundi Direct', 'VEG-8003', '890800800303', '0701', 'Net Bag', 44.00, 65.00, 0.00, 35, 12, 'Produce Bay 1', 'Active', 'Sun-cured golden skin table potatoes for curries and baking', '/src/assets/images/prod_potatoes_veg_1795361447958.jpg'),
('prod-23', 'store-1', 'cat-1', 'sup-1', 'Vindhya Organic Chana Dal 1kg', 'Vindhya Farms', 'GRN-1004', '890100100404', '0713', 'Pack', 85.00, 118.00, 5.00, 38, 10, 'Aisle 1 - Staples', 'Active', 'Clean unpolished split Bengal gram dal with high protein content', '/src/assets/images/prod_grains_dal_1795393274470.jpg'),
('prod-24', 'store-1', 'cat-3', 'sup-2', 'South Valley Full Cream Milk 1L', 'South Valley', 'DRY-3004', '890300300404', '0401', 'Pouch', 52.00, 68.00, 5.00, 16, 12, 'Aisle 3 - Dairy Refrigerator', 'Active', 'Pasteurized homogenized 6.0% fat pure cow milk', '/src/assets/images/prod_milk_dairy_1795394267339.jpg')
ON DUPLICATE KEY UPDATE name=VALUES(name), selling_price=VALUES(selling_price);
