/**
 * LED Campaign Admin Panel - Client JavaScript
 */
(function () {
    'use strict';

    // State
    let ws = null;
    let products = [];
    let templates = [];
    let currentState = null;
    let slotProducts = [null, null, null];
    let draggedProduct = null;

    // DOM Elements
    const el = {
        connectionStatus: document.getElementById('connectionStatus'),
        stateValue: document.getElementById('stateValue'),
        adminTimerValue: document.getElementById('adminTimerValue'),
        bigWinIndicator: document.getElementById('bigWinIndicator'),
        productsList: document.getElementById('productsList'),
        templatesList: document.getElementById('templatesList'),
        productsTableBody: document.getElementById('productsTableBody'),
        previewFrame: document.getElementById('previewFrame'),
        productModal: document.getElementById('productModal'),
        templateModal: document.getElementById('templateModal'),
        slotType: {
            single: document.getElementById('slotTypeSingle'),
            triple: document.getElementById('slotTypeTriple')
        },
        timing: {
            countdown: document.getElementById('countdownSeconds'),
            active: document.getElementById('activeDuration'),
            winner: document.getElementById('winnerDuration')
        },
        text: {
            banner: document.getElementById('bannerText'),
            campaign: document.getElementById('campaignMessage'),
            marquee: document.getElementById('marqueeText'),
            marqueeSpeed: document.getElementById('marqueeSpeed')
        },
        slotSelects: [
            document.getElementById('productSelect0'),
            document.getElementById('productSelect1'),
            document.getElementById('productSelect2')
        ]
    };

    // WebSocket Connection
    function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}/ws`);

        ws.onopen = () => {
            el.connectionStatus.className = 'connection-status connected';
            el.connectionStatus.querySelector('.status-text').textContent = 'Bağlandı';
            loadProducts();
            loadTemplates();
        };

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'state_update') updateStateDisplay(msg.data);
            if (msg.type === 'timer_tick') updateTimer(msg.remaining);
        };

        ws.onclose = () => {
            el.connectionStatus.className = 'connection-status disconnected';
            el.connectionStatus.querySelector('.status-text').textContent = 'Bağlantı Kesildi';
            setTimeout(connect, 3000);
        };
    }

    // State Display
    function updateStateDisplay(state) {
        if (!state) return;
        currentState = state;
        el.stateValue.textContent = state.state?.toUpperCase() || 'IDLE';

        // Update form fields from state
        if (state.slot_type) {
            el.slotType[state.slot_type].checked = true;
            updateSlotTypeUI(state.slot_type);
        }
        if (state.countdown_seconds) el.timing.countdown.value = state.countdown_seconds;
        if (state.active_duration) el.timing.active.value = state.active_duration;
        if (state.winner_duration) el.timing.winner.value = state.winner_duration;
        if (state.banner_text) el.text.banner.value = state.banner_text;
        if (state.campaign_message) el.text.campaign.value = state.campaign_message;
        if (state.marquee_text) el.text.marquee.value = state.marquee_text;
        if (state.marquee_speed) el.text.marqueeSpeed.value = state.marquee_speed;

        // Update active slot for single mode
        if (state.active_slot !== undefined) {
            document.querySelector(`input[name="activeSlot"][value="${state.active_slot}"]`).checked = true;
        }

        // Update slot products from config
        if (state.slot_config && Array.isArray(state.slot_config)) {
            state.slot_config.forEach((cfg, i) => {
                const product = products.find(p => p.id === cfg.productId);
                if (product) {
                    slotProducts[i] = { ...product, discountType: cfg.discountType, discountValue: cfg.discountValue };
                    renderSlotProduct(i);
                    document.getElementById(`discountType${i}`).value = cfg.discountType || 'none';
                    document.getElementById(`discountValue${i}`).value = cfg.discountValue || '';
                }
            });
            checkBigWin();
        }

        updateTimer(state.timer_remaining || 0);
    }

    function updateTimer(remaining) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        el.adminTimerValue.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateSlotTypeUI(type) {
        const container = document.querySelector('.slots-container');
        container.classList.toggle('single-mode', type === 'single');
    }

    // Products
    async function loadProducts() {
        const res = await fetch('/api/products');
        products = await res.json();
        renderProductsList();
        renderProductsTable();
        populateSlotSelects();
    }

    function populateSlotSelects() {
        // For select options, we can't use HTML images inside option text
        // So we use a generic image emoji if it's a URL
        const options = products.map(p => {
            const isUrl = p.icon_url && (p.icon_url.includes('/') || p.icon_url.includes('.'));
            const iconDisplay = isUrl ? '🖼️' : (p.icon_url || '📦');
            return `<option value="${p.id}">${iconDisplay} ${p.name}</option>`;
        }).join('');

        el.slotSelects.forEach(select => {
            const currentVal = select.value;
            select.innerHTML = `<option value="">Ürün Seçin...</option>${options}`;
            select.value = currentVal; // Restore selection if valid
        });
    }

    function renderProductsList() {
        el.productsList.innerHTML = products.map(p => `
            <div class="product-item" draggable="true" data-id="${p.id}">
                <span class="icon">${getIconHtml(p.icon_url)}</span>
                <span class="name">${p.name}</span>
                <span class="price">${p.base_price}₺</span>
            </div>
        `).join('');

        // Add drag events
        el.productsList.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedProduct = products.find(p => p.id === parseInt(e.target.dataset.id));
                e.target.style.opacity = '0.5';
            });
            item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                draggedProduct = null;
            });
        });
    }

    function renderProductsTable() {
        el.productsTableBody.innerHTML = products.map(p => `
            <tr data-id="${p.id}">
                <td class="icon-cell">${getIconHtml(p.icon_url)}</td>
                <td>${p.name}</td>
                <td class="price-cell">${p.base_price}₺</td>
                <td>${p.category || '-'}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-edit-product">✏️</button>
                    <button class="btn btn-danger btn-delete-product">🗑️</button>
                </td>
            </tr>
        `).join('');

        el.productsTableBody.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.id);
                const product = products.find(p => p.id === id);
                openProductModal(product);
            });
        });

        el.productsTableBody.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.closest('tr').dataset.id);
                if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                    await fetch(`/api/products/${id}`, { method: 'DELETE' });
                    loadProducts();
                }
            });
        });
    }

    // Slot Drop Zones
    function setupDropZones() {
        for (let i = 0; i < 3; i++) {
            const dropZone = document.getElementById(`slotDrop${i}`);

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (draggedProduct) {
                    slotProducts[i] = { ...draggedProduct };
                    renderSlotProduct(i);
                    checkBigWin();
                }
            });
        }
    }

    function renderSlotProduct(slotIndex) {
        const dropZone = document.getElementById(`slotDrop${slotIndex}`);
        const product = slotProducts[slotIndex];

        if (product) {
            dropZone.innerHTML = `
                <div class="product-info">
                    <span class="product-icon">${getIconHtml(product.icon_url)}</span>
                    <div class="product-details">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">${product.base_price}₺</div>
                    </div>
                    <button class="remove-product" data-slot="${slotIndex}">✕</button>
                </div>
            `;
            dropZone.classList.add('has-product');
            dropZone.querySelector('.remove-product').addEventListener('click', (e) => {
                e.stopPropagation();
                slotProducts[slotIndex] = null;
                renderSlotProduct(slotIndex);
                checkBigWin();
            });

            // Sync dropdown
            if (el.slotSelects[slotIndex]) {
                el.slotSelects[slotIndex].value = product.id;
            }
        } else {
            dropZone.innerHTML = '<span class="drop-placeholder">Ürün Sürükle</span>';
            dropZone.classList.remove('has-product');

            // Sync dropdown
            if (el.slotSelects[slotIndex]) {
                el.slotSelects[slotIndex].value = "";
            }
        }
    }

    function checkBigWin() {
        const ids = slotProducts.map(p => p?.id);
        const isBigWin = ids[0] && ids[0] === ids[1] && ids[1] === ids[2];
        el.bigWinIndicator.classList.toggle('visible', isBigWin);
    }

    // Templates
    async function loadTemplates() {
        const res = await fetch('/api/templates');
        templates = await res.json();
        renderTemplates();
    }

    function renderTemplates() {
        el.templatesList.innerHTML = templates.map(t => {
            const isBigWin = t.config?.slots && t.config.slots.every(s => s.productId === t.config.slots[0].productId);
            return `
                <div class="template-card" data-id="${t.id}">
                    <div class="template-name">${t.name}</div>
                    <span class="template-type ${isBigWin ? 'big-win' : ''}">${t.slot_type}${isBigWin ? ' - BIG WIN' : ''}</span>
                    <div class="template-actions">
                        <button class="btn btn-primary btn-load-template">📥 Yükle</button>
                        <button class="btn btn-danger btn-delete-template">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        el.templatesList.querySelectorAll('.btn-load-template').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.closest('.template-card').dataset.id);
                await fetch(`/api/state/load-template/${id}`, { method: 'POST' });
            });
        });

        el.templatesList.querySelectorAll('.btn-delete-template').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.closest('.template-card').dataset.id);
                if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
                    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
                    loadTemplates();
                }
            });
        });
    }

    // API Actions
    function getSlotConfig() {
        return slotProducts.map((p, i) => ({
            productId: p?.id || null,
            discountType: document.getElementById(`discountType${i}`).value,
            discountValue: parseFloat(document.getElementById(`discountValue${i}`).value) || 0
        }));
    }

    async function applyConfig() {
        const config = {
            slot_type: document.querySelector('input[name="slotType"]:checked').value,
            slot_config: getSlotConfig(),
            active_slot: parseInt(document.querySelector('input[name="activeSlot"]:checked')?.value || 0),
            countdown_seconds: parseInt(el.timing.countdown.value),
            active_duration: parseInt(el.timing.active.value),
            winner_duration: parseInt(el.timing.winner.value),
            banner_text: el.text.banner.value,
            campaign_message: el.text.campaign.value,
            marquee_text: el.text.marquee.value,
            marquee_speed: el.text.marqueeSpeed.value
        };
        await fetch('/api/state/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
    }

    // Modals
    function openProductModal(product = null) {
        document.getElementById('productModalTitle').textContent = product ? 'Ürün Düzenle' : 'Yeni Ürün';
        document.getElementById('editProductId').value = product?.id || '';
        document.getElementById('productIcon').value = product?.icon_url || '';
        document.getElementById('productName').value = product?.name || '';
        document.getElementById('productPrice').value = product?.base_price || '';
        document.getElementById('productCategory').value = product?.category || '';
        el.productModal.classList.add('visible');
    }

    async function saveProduct() {
        const id = document.getElementById('editProductId').value;
        const data = {
            name: document.getElementById('productName').value,
            icon_url: document.getElementById('productIcon').value,
            base_price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value
        };

        if (id) {
            await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        el.productModal.classList.remove('visible');
        loadProducts();
    }

    async function saveTemplate() {
        const name = document.getElementById('templateName').value;
        if (!name) return alert('Şablon adı gerekli!');

        const config = {
            slots: getSlotConfig(),
            activeSlot: parseInt(document.querySelector('input[name="activeSlot"]:checked')?.value || 0),
            bannerText: el.text.banner.value,
            campaignMessage: el.text.campaign.value
        };

        await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                slot_type: document.querySelector('input[name="slotType"]:checked').value,
                config
            })
        });

        el.templateModal.classList.remove('visible');
        loadTemplates();
    }

    // Event Listeners
    function setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                document.getElementById(`page${item.dataset.page.charAt(0).toUpperCase() + item.dataset.page.slice(1)}`).classList.add('active');
            });
        });

        // Slot type change
        document.querySelectorAll('input[name="slotType"]').forEach(radio => {
            radio.addEventListener('change', (e) => updateSlotTypeUI(e.target.value));
        });

        // Control buttons
        document.getElementById('btnStartCountdown').addEventListener('click', async () => {
            await applyConfig();
            await fetch('/api/state/start-countdown', { method: 'POST' });
        });

        document.getElementById('btnStartNow').addEventListener('click', async () => {
            await applyConfig();
            await fetch('/api/state/start-now', { method: 'POST' });
        });

        document.getElementById('btnShowWinner').addEventListener('click', async () => {
            await applyConfig();
            await fetch('/api/state/show-winner', { method: 'POST' });
        });

        document.getElementById('btnStop').addEventListener('click', async () => {
            await fetch('/api/state/stop', { method: 'POST' });
        });

        document.getElementById('btnApplyConfig').addEventListener('click', applyConfig);

        // Product search
        document.getElementById('productSearch').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            el.productsList.querySelectorAll('.product-item').forEach(item => {
                const name = item.querySelector('.name').textContent.toLowerCase();
                item.style.display = name.includes(query) ? '' : 'none';
            });
        });

        // Modals
        document.getElementById('btnAddProduct').addEventListener('click', () => openProductModal());
        document.getElementById('closeProductModal').addEventListener('click', () => el.productModal.classList.remove('visible'));
        document.getElementById('cancelProductModal').addEventListener('click', () => el.productModal.classList.remove('visible'));
        document.getElementById('saveProduct').addEventListener('click', saveProduct);

        document.getElementById('btnSaveTemplate').addEventListener('click', () => el.templateModal.classList.add('visible'));
        document.getElementById('closeTemplateModal').addEventListener('click', () => el.templateModal.classList.remove('visible'));
        document.getElementById('cancelTemplateModal').addEventListener('click', () => el.templateModal.classList.remove('visible'));
        document.getElementById('confirmSaveTemplate').addEventListener('click', saveTemplate);

        // Slot Dropdowns (Mobile)
        el.slotSelects.forEach((select, i) => {
            select.addEventListener('change', (e) => {
                const productId = parseInt(e.target.value);
                if (productId) {
                    const product = products.find(p => p.id === productId);
                    if (product) {
                        slotProducts[i] = { ...product }; // Preserve existing discounts? Maybe logic overhaul needed if discounts matter
                        // Better to copy just product data and keep existing discount config if any?
                        // For now behaves like drag drop - replaces slot content
                        renderSlotProduct(i);
                        checkBigWin();
                    }
                } else {
                    slotProducts[i] = null;
                    renderSlotProduct(i);
                    checkBigWin();
                }
            });
        });
    }

    function getIconHtml(iconUrl) {
        if (!iconUrl) return '📦';
        const isUrl = iconUrl.indexOf('/') > -1 || iconUrl.indexOf('.') > -1;
        if (isUrl) {
            return `<img src="${iconUrl}" style="max-height: 24px; max-width: 24px; vertical-align: middle; object-fit: contain;" alt="icon">`;
        }
        return iconUrl;
    }

    // Init
    function init() {
        connect();
        setupDropZones();
        setupEventListeners();
        for (let i = 0; i < 3; i++) renderSlotProduct(i);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
