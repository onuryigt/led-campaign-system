# LED Campaign System 🎰

A horizontal LED screen campaign system with casino/slot-machine show aesthetics. Built for 840×112 pixel LED displays with real-time WebSocket synchronization.

## Features

- **4 Display States**: IDLE → COUNTDOWN → ACTIVE → WINNER
- **2 Slot Types**: Single (1 active) and Triple (3 active with auto BIG WIN detection)
- **Real-time Sync**: WebSocket communication between admin and displays
- **Server-controlled Timers**: All timing managed server-side
- **Premium Casino Theme**: Red velvet curtain, gold accents, stage lighting effects

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Then open:
- **Display**: http://localhost:3000/display (840×112 kiosk view)
- **Admin**: http://localhost:3000/admin (control panel)

## Routes

| Route | Description |
|-------|-------------|
| `/display` | LED display view (840×112) |
| `/admin` | Admin control panel |
| `/api/*` | REST API endpoints |
| `ws://host/ws` | WebSocket endpoint |

## Display States

1. **IDLE**: Marquee ticker, slots dimmed
2. **COUNTDOWN**: Spinning animation, timer countdown
3. **ACTIVE**: Products displayed with prices
4. **WINNER**: Campaign message, winner glow effect

## Slot Types

### Single Slot
- All 3 windows visible, only 1 active
- Other slots dimmed + blurred (locked look)
- Winner shows campaign message only

### Triple Slot
- **Normal**: 3 different products, all discounted
- **BIG WIN** (auto-detected): Same product in all 3 slots

## Admin Controls

- Select slot type (single/triple)
- Drag & drop products into A/B/C slots
- Configure discounts (%, ₺, or manual price)
- Set countdown, active, and winner durations
- Set banner text and campaign message
- Choose winner slot
- Configure marquee text and speed

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **Frontend**: HTML + CSS + Vanilla JavaScript

## Project Structure

```
led-campaign-system/
├── server.js              # Express + WebSocket server
├── package.json           # Dependencies
├── database/
│   ├── schema.sql         # SQLite schema
│   └── campaign.db        # Database (auto-created)
└── public/
    ├── display/
    │   ├── display.html   # LED display (840×112)
    │   ├── display.css    # Casino theme
    │   └── display.js     # WebSocket client
    └── admin/
        ├── admin.html     # Control panel
        ├── admin.css      # Admin styles
        └── admin.js       # Admin logic
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `DELETE /api/templates/:id` - Delete template

### State Control
- `GET /api/state` - Get current state
- `PUT /api/state/config` - Update configuration
- `POST /api/state/start-countdown` - Start countdown
- `POST /api/state/start-now` - Skip to active
- `POST /api/state/show-winner` - Show winner
- `POST /api/state/stop` - Stop to idle
- `POST /api/state/load-template/:id` - Load template

## License

MIT
