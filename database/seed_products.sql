-- Product Database Seed File
-- This script removes all existing products and inserts new ones from the menu

-- Delete all existing products
DELETE FROM products;

-- Reset auto-increment counter
DELETE FROM sqlite_sequence WHERE name='products';

-- Insert new products
-- Category: Fıçı (Draft Beers)
INSERT INTO products (name, icon_url, base_price, category) VALUES
('Fıçı Bud', NULL, 215.00, 'Fıçı'),
('Fıçı Bomonti', NULL, 210.00, 'Fıçı'),
('Fıçı Efes', NULL, 215.00, 'Fıçı');

-- Category: Shot
INSERT INTO products (name, icon_url, base_price, category) VALUES
('Olmeca Silver Shot', NULL, 200.00, 'Shot'),
('Olmeca Gold Shot', NULL, 200.00, 'Shot'),
('Jagermeister Shot', NULL, 200.00, 'Shot'),
('Baileys Shot', NULL, 200.00, 'Shot'),
('B52 Shot', NULL, 300.00, 'Shot');

-- Category: Bira (Bottled/Canned Beers)
INSERT INTO products (name, icon_url, base_price, category) VALUES
('Efes Pilsen 50cl', NULL, 245.00, 'Bira'),
('Efes Malt 50cl', NULL, 245.00, 'Bira'),
('Efes Özel Seri 50cl', NULL, 255.00, 'Bira'),
('Miller 50cl', NULL, 275.00, 'Bira'),
('Corona 33cl', NULL, 275.00, 'Bira'),
('Becks 50cl', NULL, 275.00, 'Bira'),
('Bomonti Filtresiz 50cl', NULL, 275.00, 'Bira'),
('Bud 50cl', NULL, 275.00, 'Bira'),
('Amsterdam 50cl', NULL, 330.00, 'Bira'),
('Belfast 50cl', NULL, 265.00, 'Bira'),
('Erdinger 33cl', NULL, 330.00, 'Bira');

-- Category: Kokteyl (Cocktails)
INSERT INTO products (name, icon_url, base_price, category) VALUES
('Velora', NULL, 499.00, 'Kokteyl'),
('Vioris', NULL, 499.00, 'Kokteyl'),
('Laster', NULL, 499.00, 'Kokteyl'),
('Savana', NULL, 499.00, 'Kokteyl'),
('Vesper', NULL, 499.00, 'Kokteyl'),
('Otto''s Margarita', NULL, 499.00, 'Kokteyl'),
('Scorpion', NULL, 499.00, 'Kokteyl'),
('Moonlight', NULL, 499.00, 'Kokteyl'),
('Moss', NULL, 499.00, 'Kokteyl'),
('Pomona', NULL, 499.00, 'Kokteyl'),
('Amalfi', NULL, 499.00, 'Kokteyl'),
('Whisky Sour', NULL, 499.00, 'Kokteyl'),
('Aperol Spritz', NULL, 499.00, 'Kokteyl'),
('Hugo Spritz', NULL, 499.00, 'Kokteyl'),
('Espresso Martini', NULL, 499.00, 'Kokteyl'),
('Dry Martini', NULL, 499.00, 'Kokteyl'),
('Mojito', NULL, 499.00, 'Kokteyl'),
('Bellini', NULL, 499.00, 'Kokteyl'),
('Negroni', NULL, 499.00, 'Kokteyl'),
('Manhattan', NULL, 499.00, 'Kokteyl'),
('Old Fashioned', NULL, 499.00, 'Kokteyl'),
('Cosmopolitan', NULL, 499.00, 'Kokteyl'),
('Margarita', NULL, 499.00, 'Kokteyl');

-- Verification query
SELECT 'Total products:' AS info, COUNT(*) AS count FROM products
UNION ALL
SELECT 'Products by category:', NULL;

SELECT category, COUNT(*) as count 
FROM products 
GROUP BY category 
ORDER BY category;
