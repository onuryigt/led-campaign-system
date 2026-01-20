/**
 * LED Campaign System - Server
 * 
 * A horizontal LED screen campaign system with casino/slot-machine aesthetics
 * Server controls all timers - clients never calculate time
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize Express
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket
const wss = new WebSocket.Server({ server, path: '/ws' });

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'database', 'campaign.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.join(__dirname, 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
}

// Seed products if database is empty
const seedPath = path.join(__dirname, 'database', 'seed_products.sql');
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0 && fs.existsSync(seedPath)) {
    console.log('Database is empty, seeding products...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    db.exec(seedSql);
    console.log('Products seeded successfully!');
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// STATE MACHINE
// ============================================

const STATES = {
    IDLE: 'idle',
    COUNTDOWN: 'countdown',
    ACTIVE: 'active',
    WINNER: 'winner'
};

let timerInterval = null;

/**
 * Get current live state from database
 */
function getLiveState() {
    const row = db.prepare('SELECT * FROM live_state WHERE id = 1').get();
    if (row && row.slot_config) {
        try {
            row.slot_config = JSON.parse(row.slot_config);
        } catch (e) {
            row.slot_config = null;
        }
    }
    return row;
}

/**
 * Update live state in database
 */
function updateLiveState(updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates).map(v => {
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
    });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const sql = `UPDATE live_state SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`;

    db.prepare(sql).run(...values);
}

/**
 * Broadcast state to all connected clients
 */
function broadcastState() {
    const state = getLiveState();
    const message = JSON.stringify({
        type: 'state_update',
        data: state,
        timestamp: Date.now()
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Broadcast timer tick
 */
function broadcastTimerTick(remaining) {
    const message = JSON.stringify({
        type: 'timer_tick',
        remaining: remaining,
        timestamp: Date.now()
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Clear any existing timer
 */
function clearTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Start countdown state
 */
function startCountdown() {
    const state = getLiveState();
    const countdownSeconds = state.countdown_seconds || 10;

    clearTimer();

    updateLiveState({
        state: STATES.COUNTDOWN,
        timer_remaining: countdownSeconds,
        state_started_at: new Date().toISOString()
    });

    broadcastState();

    let remaining = countdownSeconds;
    timerInterval = setInterval(() => {
        remaining--;
        updateLiveState({ timer_remaining: remaining });
        broadcastTimerTick(remaining);

        if (remaining <= 0) {
            clearTimer();
            startActive();
        }
    }, 1000);
}

/**
 * Start active state (skip countdown)
 */
function startActive() {
    const state = getLiveState();
    const activeDuration = state.active_duration || 30;

    clearTimer();

    updateLiveState({
        state: STATES.ACTIVE,
        timer_remaining: activeDuration,
        state_started_at: new Date().toISOString()
    });

    broadcastState();

    let remaining = activeDuration;
    timerInterval = setInterval(() => {
        remaining--;
        updateLiveState({ timer_remaining: remaining });
        broadcastTimerTick(remaining);

        if (remaining <= 0) {
            clearTimer();
            startWinner();
        }
    }, 1000);
}

/**
 * Start winner state
 */
function startWinner() {
    const state = getLiveState();

    // Check if campaign message exists
    if (!state.campaign_message || state.campaign_message.trim() === '') {
        console.warn('Cannot show winner: campaign message is required');
        stopToIdle();
        return;
    }

    const winnerDuration = state.winner_duration || 15;

    clearTimer();

    updateLiveState({
        state: STATES.WINNER,
        timer_remaining: winnerDuration,
        state_started_at: new Date().toISOString()
    });

    broadcastState();

    let remaining = winnerDuration;
    timerInterval = setInterval(() => {
        remaining--;
        updateLiveState({ timer_remaining: remaining });
        broadcastTimerTick(remaining);

        if (remaining <= 0) {
            clearTimer();
            stopToIdle();
        }
    }, 1000);
}

/**
 * Stop to idle state
 */
function stopToIdle() {
    clearTimer();

    updateLiveState({
        state: STATES.IDLE,
        timer_remaining: 0,
        state_started_at: new Date().toISOString()
    });

    broadcastState();
}

// ============================================
// REST API ROUTES
// ============================================

// Root route
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>LED Campaign System</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>🎰 LED Campaign System</h1>
            <p>Choose your interface:</p>
            <a href="/display" style="display: inline-block; margin: 10px; padding: 15px 30px; background: #D32F2F; color: white; text-decoration: none; border-radius: 5px;">Display</a>
            <a href="/admin" style="display: inline-block; margin: 10px; padding: 15px 30px; background: #333; color: white; text-decoration: none; border-radius: 5px;">Admin Panel</a>
            <a href="/sounds" style="display: inline-block; margin: 10px; padding: 15px 30px; background: #1976D2; color: white; text-decoration: none; border-radius: 5px;">🔊 Sound Effects</a>
        </body>
        </html>
    `);
});

// Routes for display and admin
app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'display', 'display.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

app.get('/sounds', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sounds', 'sounds.html'));
});

// Get all products
app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
    res.json(products);
});

// Create product
app.post('/api/products', (req, res) => {
    const { name, icon_url, base_price, category } = req.body;
    const result = db.prepare(
        'INSERT INTO products (name, icon_url, base_price, category) VALUES (?, ?, ?, ?)'
    ).run(name, icon_url, base_price, category);
    res.json({ id: result.lastInsertRowid, name, icon_url, base_price, category });
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const { name, icon_url, base_price, category } = req.body;
    db.prepare(
        'UPDATE products SET name = ?, icon_url = ?, base_price = ?, category = ? WHERE id = ?'
    ).run(name, icon_url, base_price, category, req.params.id);
    res.json({ success: true });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Get all templates
app.get('/api/templates', (req, res) => {
    const templates = db.prepare('SELECT * FROM slot_templates ORDER BY created_at DESC').all();
    templates.forEach(t => {
        try { t.config = JSON.parse(t.config); } catch (e) { t.config = {}; }
    });
    res.json(templates);
});

// Create template
app.post('/api/templates', (req, res) => {
    const { name, slot_type, config } = req.body;
    const result = db.prepare(
        'INSERT INTO slot_templates (name, slot_type, config) VALUES (?, ?, ?)'
    ).run(name, slot_type, JSON.stringify(config));
    res.json({ id: result.lastInsertRowid, name, slot_type, config });
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
    db.prepare('DELETE FROM slot_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Get current state
app.get('/api/state', (req, res) => {
    const state = getLiveState();
    res.json(state);
});

// Update configuration (without changing state)
app.put('/api/state/config', (req, res) => {
    const {
        slot_type,
        slot_config,
        active_slot,
        countdown_seconds,
        active_duration,
        winner_duration,
        banner_text,
        campaign_message,
        marquee_text,
        marquee_speed
    } = req.body;

    const updates = {};
    if (slot_type !== undefined) updates.slot_type = slot_type;
    if (slot_config !== undefined) updates.slot_config = slot_config;
    if (active_slot !== undefined) updates.active_slot = active_slot;
    if (countdown_seconds !== undefined) updates.countdown_seconds = countdown_seconds;
    if (active_duration !== undefined) updates.active_duration = active_duration;
    if (winner_duration !== undefined) updates.winner_duration = winner_duration;
    if (banner_text !== undefined) updates.banner_text = banner_text;
    if (campaign_message !== undefined) updates.campaign_message = campaign_message;
    if (marquee_text !== undefined) updates.marquee_text = marquee_text;
    if (marquee_speed !== undefined) updates.marquee_speed = marquee_speed;

    if (Object.keys(updates).length > 0) {
        updateLiveState(updates);
        broadcastState();
    }

    res.json({ success: true, state: getLiveState() });
});

// Control endpoints
app.post('/api/state/start-countdown', (req, res) => {
    startCountdown();
    res.json({ success: true, state: getLiveState() });
});

app.post('/api/state/start-now', (req, res) => {
    startActive();
    res.json({ success: true, state: getLiveState() });
});

app.post('/api/state/show-winner', (req, res) => {
    startWinner();
    res.json({ success: true, state: getLiveState() });
});

app.post('/api/state/stop', (req, res) => {
    stopToIdle();
    res.json({ success: true, state: getLiveState() });
});

// Load template
app.post('/api/state/load-template/:id', (req, res) => {
    const template = db.prepare('SELECT * FROM slot_templates WHERE id = ?').get(req.params.id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    let config;
    try { config = JSON.parse(template.config); } catch (e) { config = {}; }

    updateLiveState({
        slot_type: template.slot_type,
        slot_config: config.slots || [],
        active_slot: config.activeSlot || 0,
        banner_text: config.bannerText || '',
        campaign_message: config.campaignMessage || ''
    });

    broadcastState();
    res.json({ success: true, state: getLiveState() });
});

// ============================================
// WEBSOCKET SERVER
// ============================================

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send current state on connect
    const state = getLiveState();
    ws.send(JSON.stringify({
        type: 'state_update',
        data: state,
        timestamp: Date.now()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'admin_action') {
                switch (data.action) {
                    case 'start_countdown':
                        startCountdown();
                        break;
                    case 'start_now':
                        startActive();
                        break;
                    case 'show_winner':
                        startWinner();
                        break;
                    case 'stop':
                        stopToIdle();
                        break;
                    case 'update_config':
                        updateLiveState(data.config);
                        broadcastState();
                        break;
                }
            }
        } catch (e) {
            console.error('WebSocket message error:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// ============================================
// SERVER STARTUP
// ============================================

// On server restart, check state and recover
function recoverState() {
    const state = getLiveState();

    // If not idle and no active timer, reset to idle
    if (state.state !== STATES.IDLE && !timerInterval) {
        console.log('Recovering from interrupted state, resetting to idle');
        stopToIdle();
    }
}

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║          🎰 LED Campaign System Started! 🎰               ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                 ║
║                                                           ║
║  Routes:                                                  ║
║  • Display: http://localhost:${PORT}/display                 ║
║  • Admin:   http://localhost:${PORT}/admin                   ║
║  • API:     http://localhost:${PORT}/api/*                   ║
║  • WebSocket: ws://localhost:${PORT}/ws                      ║
╚═══════════════════════════════════════════════════════════╝
    `);

    recoverState();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearTimer();
    db.close();
    process.exit(0);
});

module.exports = { app, server, db };
