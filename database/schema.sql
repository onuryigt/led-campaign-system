-- LED Campaign System Database Schema

-- Users table (single admin)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products catalog
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon_url TEXT,
    base_price REAL NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Slot templates (reusable configurations)
CREATE TABLE IF NOT EXISTS slot_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slot_type TEXT CHECK(slot_type IN ('single', 'triple')) NOT NULL,
    config TEXT NOT NULL,  -- JSON: products, discounts, messages
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Live state (current display state - single row)
CREATE TABLE IF NOT EXISTS live_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    state TEXT CHECK(state IN ('idle', 'countdown', 'active', 'winner')) DEFAULT 'idle',
    slot_type TEXT CHECK(slot_type IN ('single', 'triple')) DEFAULT 'triple',
    slot_config TEXT,               -- JSON: current slot configuration
    active_slot INTEGER DEFAULT 0,  -- For single: which slot (0,1,2)
    winner_slot INTEGER DEFAULT 0,  -- Winner selection (0,1,2)
    countdown_seconds INTEGER DEFAULT 10,
    active_duration INTEGER DEFAULT 30,
    winner_duration INTEGER DEFAULT 15,
    timer_remaining INTEGER DEFAULT 0,
    banner_text TEXT DEFAULT 'BÜYÜK KAMPANYA',
    campaign_message TEXT DEFAULT '',
    marquee_text TEXT DEFAULT '🎰 Büyük fırsatları kaçırmayın! 🎰 Her gün yeni kampanyalar! 🎰',
    marquee_speed TEXT CHECK(marquee_speed IN ('slow', 'medium', 'fast')) DEFAULT 'medium',
    state_started_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (optional)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash) 
VALUES (1, 'admin', '$2b$10$defaulthashforadmin123');

-- Insert default live state
INSERT OR IGNORE INTO live_state (id) VALUES (1);

-- Insert sample products
INSERT OR IGNORE INTO products (id, name, icon_url, base_price, category) VALUES
(1, 'Efes Pilsen', '🍺', 120, 'Bira'),
(2, 'Tuborg Gold', '🍺', 130, 'Bira'),
(3, 'Corona Extra', '🍺', 180, 'Bira'),
(4, 'Heineken', '🍺', 160, 'Bira'),
(5, 'Jack Daniels', '🥃', 450, 'Viski'),
(6, 'Jameson', '🥃', 380, 'Viski'),
(7, 'Chivas Regal', '🥃', 520, 'Viski'),
(8, 'Absolut Vodka', '🍸', 350, 'Votka'),
(9, 'Grey Goose', '🍸', 580, 'Votka'),
(10, 'Bombay Sapphire', '🍸', 420, 'Cin'),
(11, 'Mojito', '🍹', 200, 'Kokteyl'),
(12, 'Margarita', '🍹', 220, 'Kokteyl');

-- Insert sample slot templates
INSERT OR IGNORE INTO slot_templates (id, name, slot_type, config) VALUES
(1, 'Triple Bira Kampanyası', 'triple', '{
    "slots": [
        {"productId": 1, "discountType": "percentage", "discountValue": 20},
        {"productId": 2, "discountType": "percentage", "discountValue": 20},
        {"productId": 3, "discountType": "percentage", "discountValue": 25}
    ],
    "bannerText": "BİRA FESTİVALİ",
    "campaignMessage": "3 AL 2 ÖDE!"
}'),
(2, 'BIG WIN - Efes Special', 'triple', '{
    "slots": [
        {"productId": 1, "discountType": "fixed", "discountValue": 40},
        {"productId": 1, "discountType": "fixed", "discountValue": 40},
        {"productId": 1, "discountType": "fixed", "discountValue": 40}
    ],
    "bannerText": "🎰 BIG WIN 🎰",
    "campaignMessage": "3 EFES 200₺!"
}'),
(3, 'Single Viski Kampanyası', 'single', '{
    "slots": [
        {"productId": 5, "discountType": "percentage", "discountValue": 30},
        {"productId": 6, "discountType": "none", "discountValue": 0},
        {"productId": 7, "discountType": "none", "discountValue": 0}
    ],
    "activeSlot": 0,
    "bannerText": "VİSKİ GECESİ",
    "campaignMessage": "JACK %30 İNDİRİM!"
}');
