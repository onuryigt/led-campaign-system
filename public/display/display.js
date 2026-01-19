/**
 * LED Campaign Display - Client JavaScript
 * Handles WebSocket communication and display state rendering
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const WS_RECONNECT_INTERVAL = 3000;
    const STATES = {
        IDLE: 'idle',
        COUNTDOWN: 'countdown',
        ACTIVE: 'active',
        WINNER: 'winner'
    };

    // ============================================
    // STATE
    // ============================================
    let ws = null;
    let currentState = null;
    let previousDisplayState = null;
    let products = {}; // Keyed by ID
    let productsList = []; // Array for reel strips
    let reconnectTimer = null;
    let slotTransitionTimers = [null, null, null];

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const elements = {
        container: document.querySelector('.display-container'),
        topBanner: document.getElementById('topBanner'),
        bannerText: document.getElementById('bannerText'),
        slots: [
            {
                window: document.getElementById('slotA'),
                reel: document.getElementById('reelA'),
                icon: document.getElementById('iconA'),
                name: document.getElementById('nameA'),
                prices: document.getElementById('pricesA'),
                oldPrice: document.getElementById('oldPriceA'),
                newPrice: document.getElementById('newPriceA')
            },
            {
                window: document.getElementById('slotB'),
                reel: document.getElementById('reelB'),
                icon: document.getElementById('iconB'),
                name: document.getElementById('nameB'),
                prices: document.getElementById('pricesB'),
                oldPrice: document.getElementById('oldPriceB'),
                newPrice: document.getElementById('newPriceB')
            },
            {
                window: document.getElementById('slotC'),
                reel: document.getElementById('reelC'),
                icon: document.getElementById('iconC'),
                name: document.getElementById('nameC'),
                prices: document.getElementById('pricesC'),
                oldPrice: document.getElementById('oldPriceC'),
                newPrice: document.getElementById('newPriceC')
            }
        ],
        campaignOverlay: document.getElementById('campaignOverlay'),
        campaignMessage: document.getElementById('campaignMessage'),
        timerSection: document.getElementById('timerSection'),
        timerLabel: document.getElementById('timerLabel'),
        timerValue: document.getElementById('timerValue'),
        marqueeSection: document.getElementById('marqueeSection'),
        marqueeTrack: document.getElementById('marqueeTrack'),
        marqueeText: document.getElementById('marqueeText'),
        curtain: document.getElementById('curtain')
    };

    // ============================================
    // WEBSOCKET CONNECTION
    // ============================================
    function connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            // Fetch products on connect
            fetchProducts();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            scheduleReconnect();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    function scheduleReconnect() {
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect();
            }, WS_RECONNECT_INTERVAL);
        }
    }

    // ============================================
    // MESSAGE HANDLERS
    // ============================================
    function handleMessage(message) {
        switch (message.type) {
            case 'state_update':
                updateState(message.data);
                break;
            case 'timer_tick':
                updateTimer(message.remaining);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // ============================================
    // API CALLS
    // ============================================
    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            const productList = await response.json();
            products = {};
            productList.forEach(p => {
                products[p.id] = p;
            });
            console.log('Products loaded:', Object.keys(products).length);
        } catch (e) {
            console.error('Error fetching products:', e);
        }
    }

    // ============================================
    // STATE RENDERING
    // ============================================
    function updateState(state) {
        if (!state) return;

        currentState = state;
        const displayState = state.state || STATES.IDLE;
        const slotType = state.slot_type || 'triple';
        const slotConfig = state.slot_config || [];
        const activeSlot = state.active_slot || 0;
        const isBigWin = detectBigWin(slotConfig);

        console.log('State update:', displayState, 'Previous:', previousDisplayState, 'Big Win:', isBigWin);

        // Update container classes
        elements.container.className = 'display-container';
        elements.container.classList.add(displayState);
        if (isBigWin && (displayState === STATES.ACTIVE || displayState === STATES.WINNER)) {
            elements.container.classList.add('big-win');
        }

        // Update Curtain
        if (displayState === STATES.IDLE) {
            elements.curtain.classList.remove('open');
            elements.curtain.classList.add('closed');
        } else {
            elements.curtain.classList.add('open');
            elements.curtain.classList.remove('closed');
        }

        // Update banner
        updateBanner(state, displayState, isBigWin);

        // Update slots based on state
        updateSlots(displayState, slotType, slotConfig, activeSlot, isBigWin);

        // Update campaign overlay with product names
        updateCampaignOverlay(displayState, state.campaign_message, slotConfig, isBigWin);

        // Update bottom bar
        updateBottomBar(displayState, state);

        // Update timer
        updateTimer(state.timer_remaining || 0);

        // Store previous state for transition detection
        previousDisplayState = displayState;
    }

    /**
     * Trigger slot slowdown animation with staggered timing
     * Each slot stops at a different time (like real slot machines)
     */
    function triggerSlotSlowdown(slotWindow, slotIndex) {
        // Clear any existing timer
        if (slotTransitionTimers[slotIndex]) {
            clearTimeout(slotTransitionTimers[slotIndex]);
        }

        // Stagger the slowdown: slot 0 stops first, then 1, then 2
        const baseDelay = 200; // ms between each slot
        const slowdownDuration = 800; // matches CSS animation duration
        const delay = slotIndex * baseDelay;

        // Start slowing after delay
        slotTransitionTimers[slotIndex] = setTimeout(() => {
            slotWindow.classList.remove('spinning');
            slotWindow.classList.add('slowing');

            // After slowdown animation, show final stopped state
            setTimeout(() => {
                slotWindow.classList.remove('slowing');
                slotWindow.classList.add('stopped', 'active');
            }, slowdownDuration);
        }, delay);
    }

    function detectBigWin(slotConfig) {
        if (!slotConfig || slotConfig.length !== 3) {
            console.log('Big Win Check: Invalid slot config', slotConfig);
            return false;
        }

        // Extract product IDs
        const productIds = slotConfig.map(s => s.productId);
        console.log('Big Win Check: Product IDs:', productIds);

        // Check if all three are defined and the same
        const allDefined = productIds[0] && productIds[1] && productIds[2];
        const allSame = productIds[0] === productIds[1] && productIds[1] === productIds[2];
        const isBigWin = allDefined && allSame;

        console.log('Big Win Check: All Defined?', allDefined, 'All Same?', allSame, 'Result:', isBigWin);

        return isBigWin;
    }

    function updateBanner(state, displayState, isBigWin) {
        let bannerText = state.banner_text || '#RueNights';

        if (displayState === STATES.WINNER && isBigWin) {
            bannerText = '#RueNights';
            elements.topBanner.classList.add('big-win');
        } else if (displayState === STATES.WINNER) {
            bannerText = '#RueNights';
            elements.topBanner.classList.remove('big-win');
        } else {
            elements.topBanner.classList.remove('big-win');
        }

        elements.bannerText.textContent = bannerText;
    }

    function updateSlots(displayState, slotType, slotConfig, activeSlot, isBigWin) {
        elements.slots.forEach((slot, index) => {
            const config = slotConfig[index] || {};
            const product = products[config.productId] || null;

            // Reset classes
            slot.window.className = 'slot-window';

            // Set product content
            if (product) {
                slot.icon.innerHTML = getProductIconHtml(product);
                slot.name.textContent = product.name || 'Ürün';

                const basePrice = product.base_price || 0;
                const discountType = config.discountType || 'none';
                const discountValue = config.discountValue || 0;

                let newPrice = basePrice;
                if (discountType === 'percentage') {
                    newPrice = basePrice * (1 - discountValue / 100);
                } else if (discountType === 'fixed') {
                    newPrice = basePrice - discountValue;
                } else if (discountType === 'manual') {
                    newPrice = discountValue;
                }

                slot.oldPrice.textContent = `${Math.round(basePrice)}₺`;
                slot.newPrice.textContent = `${Math.round(newPrice)}₺`;
            } else {
                // Clear content if no product configured
                slot.icon.innerHTML = '';
                slot.name.textContent = '';
                slot.oldPrice.textContent = '';
                slot.newPrice.textContent = '';
            }

            // Apply state-specific styling
            switch (displayState) {
                case STATES.IDLE:
                    // All slots dimmed in idle
                    slot.window.classList.add('dimmed');
                    break;

                case STATES.COUNTDOWN:
                    // Spinning animation
                    slot.window.classList.add('spinning');
                    if (slotType === 'single' && index !== activeSlot) {
                        slot.window.classList.add('hidden-slot');
                    }
                    break;

                case STATES.ACTIVE:
                    // Check if transitioning from COUNTDOWN - do slowdown animation
                    if (previousDisplayState === STATES.COUNTDOWN) {
                        triggerSlotSlowdown(slot.window, index);
                    } else {
                        slot.window.classList.add('stopped');
                    }

                    if (slotType === 'single') {
                        if (index !== activeSlot) {
                            slot.window.classList.add('hidden-slot');
                        }
                    }
                    break;

                case STATES.WINNER:
                    slot.window.classList.add('winner-mode');
                    if (slotType === 'single') {
                        // In single mode, only active slot wins
                        if (index === activeSlot) {
                            slot.window.classList.add('winner');
                        } else {
                            slot.window.classList.add('dimmed');
                        }
                    } else {
                        // Triple mode - ALL slots win together!
                        slot.window.classList.add('winner');
                    }
                    break;
            }
        });
    }

    function updateCampaignOverlay(displayState, campaignMessage, slotConfig, isBigWin) {
        // Show overlay in WINNER state
        // If campaignMessage is empty, use default "KAZANDINIZ" or hide? 
        // Let's create a default if empty to prevent empty box
        const msg = campaignMessage || (isBigWin ? 'BÜYÜK\nKAZANÇ!' : 'TEBRİKLER');

        if (displayState === STATES.WINNER) {
            elements.campaignOverlay.classList.add('visible');
            elements.campaignMessage.innerHTML = msg.replace(/\n/g, '<br>');

            // Add specific class for big win styling if needed
            if (isBigWin) {
                elements.campaignMessage.classList.add('big-win-msg');
            } else {
                elements.campaignMessage.classList.remove('big-win-msg');
            }
        } else {
            elements.campaignOverlay.classList.remove('visible');
        }
    }

    function updateBottomBar(displayState, state) {
        // Timer visibility
        if (displayState === STATES.IDLE) {
            elements.timerSection.classList.add('hidden');
        } else {
            elements.timerSection.classList.remove('hidden');
        }

        // Timer label - Always "KALAN"
        elements.timerLabel.textContent = 'KALAN';

        // (Switch case removed)

        // Marquee
        const marqueeText = state.marquee_text || '🎰 Kampanyaları kaçırmayın! 🎰';
        const marqueeSpeed = state.marquee_speed || 'medium';

        // Duplicate text for seamless scrolling - REMOVED for simple scroll
        elements.marqueeText.textContent = marqueeText;

        elements.marqueeTrack.className = 'marquee-track ' + marqueeSpeed;
    }

    function updateTimer(remaining) {
        if (remaining === undefined || remaining === null) return;

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        elements.timerValue.textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // ============================================
    // PRODUCT MANAGEMENT & REEL RENDERING
    // ============================================

    async function fetchProducts() {
        try {
            console.log('Fetching products...');
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch products');

            const data = await response.json();
            productsList = data;

            // Map array to object for easy lookup
            products = {};
            data.forEach(p => {
                products[p.id] = p;
            });

            console.log('Products fetched:', productsList.length);
            renderReelStrips();

            // Re-render current state if we have one, so products show up
            if (currentState) {
                updateState(currentState);
            }

        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    function renderReelStrips() {
        if (!productsList || productsList.length === 0) return;

        // Render strips for all 3 slots
        elements.slots.forEach((slot, index) => {
            const reelStrip = slot.reel.querySelector('.reel-strip');
            if (!reelStrip) return; // Should exist if HTML is correct

            // Generate enough items for the animation loop
            // Repeat the products list a few times to ensure smooth scrolling
            let itemsHtml = '';
            // Ensure at least 15-20 items for a good spin
            const loopCount = Math.ceil(20 / Math.max(1, productsList.length));

            // Shuffle slightly for each reel to look organic? Or keep consistent?
            // Consistent is better for "reel strip" logic usually, but offset makes it look random
            // Let's just repeat the list
            for (let i = 0; i < loopCount; i++) {
                productsList.forEach(product => {
                    itemsHtml += `<div class="reel-item">${getProductIconHtml(product)}</div>`;
                });
            }

            reelStrip.innerHTML = itemsHtml;
        });
    }

    function getProductIconHtml(product) {
        if (!product) return '📦';

        // Logic: if icon_url contains "/" or ".", treat as image URL. Otherwise text/emoji.
        const icon = product.icon_url || '📦';
        const isUrl = icon.indexOf('/') > -1 || icon.indexOf('.') > -1; // Simple heuristic

        if (isUrl) {
            return `<img src="${icon}" class="product-img-icon" alt="${product.name}" onerror="this.replaceWith('📦')">`;
        } else {
            return icon;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        console.log('LED Campaign Display initialized');
        connect();

        // Handle visibility change (pause/resume when tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    connect();
                }
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
