/**
 * Math & Beer Store - Frontend Logic
 * Handles product catalog, cart, checkout, search/sort, quick view, and admin management.
 */
(function () {
    'use strict';

    // ── State ──────────────────────────────────────────
    let products = [];
    let cart = JSON.parse(localStorage.getItem('mb_cart') || '[]');
    let currentFilter = 'all';
    let searchQuery = '';
    let sortOrder = 'default';
    let isCheckoutMode = false;
    let currentQuickViewProduct = null;

    // ── DOM Elements ───────────────────────────────────
    const grid = document.getElementById('store-grid');
    const emptyState = document.getElementById('store-empty');
    const cartFab = document.getElementById('cart-fab');
    const cartCount = document.getElementById('cart-count');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBackdrop = document.getElementById('cart-backdrop');
    const cartClose = document.getElementById('cart-close');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartEmpty = document.getElementById('cart-empty');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutBack = document.getElementById('checkout-back');
    const adminPanel = document.getElementById('admin-panel');
    const adminOrdersList = document.getElementById('admin-orders-list');
    const productForm = document.getElementById('admin-product-form');
    const filterBtns = document.querySelectorAll('#store-filters .filter-btn');
    
    // New Elements
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const quickViewModal = document.getElementById('quick-view-modal');
    const quickViewClose = document.getElementById('quick-view-close');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const adminOrdersTab = document.getElementById('admin-orders-tab');
    const adminProductsTab = document.getElementById('admin-products-tab');
    const adminProductsList = document.getElementById('admin-products-list');
    const adminProductCancelBtn = document.getElementById('admin-product-cancel');
    const adminProductSubmitBtn = document.getElementById('admin-product-submit');
    const adminProductTitle = document.getElementById('admin-product-form-title');

    // ── Helpers ────────────────────────────────────────
    function formatPrice(price) {
        return '$' + price.toLocaleString('es-CO');
    }

    function getCategoryLabel(cat) {
        const labels = { pin: 'Pin', forro: 'Forro', buso: 'Buso' };
        return labels[cat] || cat;
    }

    function getCategoryIcon(cat) {
        const icons = { pin: 'fa-thumbtack', forro: 'fa-mobile-screen', buso: 'fa-shirt' };
        return icons[cat] || 'fa-box';
    }

    function slugify(value) {
        return (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function buildVariantImage(baseImage, color) {
        if (!baseImage) return '../static/images/logos/logo_M&B.png';
        const cleanColor = slugify(color);
        if (!cleanColor) return baseImage;
        const lastDot = baseImage.lastIndexOf('.');
        if (lastDot === -1) return `${baseImage}_${cleanColor}`;
        return `${baseImage.slice(0, lastDot)}_${cleanColor}${baseImage.slice(lastDot)}`;
    }

    // Preload image helper
    function preloadImage(url) {
        if (!url) return;
        const img = new Image();
        img.src = url;
    }

    function saveCart() {
        localStorage.setItem('mb_cart', JSON.stringify(cart));
        updateCartBadge();
    }

    function updateCartBadge() {
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = total;
        cartCount.style.display = total > 0 ? 'flex' : 'none';
    }

    // ── Load Products ──────────────────────────────────
    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            products = await res.json();
            const countEl = document.getElementById('store-product-count');
            if (countEl) {
                countEl.textContent = products.length;
            }
            renderProducts();
            if (adminPanel.style.display === 'block') {
                renderAdminProducts();
            }
            
            // Preload base images
            products.forEach(p => {
                if(p.image_url) preloadImage(p.image_url);
            });
        } catch (err) {
            console.error('Error loading products:', err);
            grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Error al cargar los productos</p>';
        }
    }

    // ── Render Products ────────────────────────────────
    function renderProducts() {
        let filtered = currentFilter === 'all'
            ? products
            : products.filter(p => p.category === currentFilter);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
        }

        // We make a copy of filtered to sort it without mutating original if it was just returning a reference
        filtered = [...filtered]; 
        
        if (sortOrder === 'price-asc') filtered.sort((a, b) => a.price - b.price);
        else if (sortOrder === 'price-desc') filtered.sort((a, b) => b.price - a.price);
        else if (sortOrder === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        emptyState.style.display = 'none';

        grid.innerHTML = filtered.map((p, i) => {
            const variations = p.variations || {};
            let variationHTML = '';

            if (p.category === 'buso') {
                const colorOptions = variations.colores || [];
                const sizeOptions = variations.tallas || [];
                const defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
                const defaultSize = sizeOptions[0] || '';
                variationHTML = `
                    <div class="product-card__variations">
                        ${colorOptions.length ? `<span class="variation-label">Color</span><div class="variation-chips variation-chips--colors">${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}</div>` : ''}
                        ${sizeOptions.length ? `<span class="variation-label">Talla</span><div class="variation-chips">${sizeOptions.map(t => `<button class="variation-chip${t === defaultSize ? ' selected' : ''}" data-variation="${t}" data-variation-type="size">${t}</button>`).join('')}</div>` : ''}
                    </div>`;
            } else if (p.category === 'pin' && variations.colores) {
                const colorOptions = variations.colores || [];
                const defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
                variationHTML = `
                    <div class="product-card__variations">
                        <span class="variation-label">Color</span>
                        <div class="variation-chips">
                            ${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}
                        </div>
                    </div>`;
            } else if (p.category === 'forro') {
                const colorOptions = variations.colores || [];
                const defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
                variationHTML = `
                    <div class="product-card__variations">
                        ${colorOptions.length ? `<span class="variation-label">Color</span><div class="variation-chips">${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}</div>` : ''}
                        <span class="variation-label">Modelo de celular (por encargo)</span>
                        <input type="text" class="variation-input" placeholder="Ej: iPhone 15, Samsung S24..." data-product-id="${p.id}">
                    </div>`;
            }

            const baseImage = p.image_url || '../static/images/logos/logo_M&B.png';
            const defaultColor = (p.variations && p.variations.colores && p.variations.colores.find(c => /morado|purple|violeta/i.test(c))) || (p.variations && p.variations.colores && p.variations.colores[0]) || '';
            const initialImage = (p.category === 'buso' || p.category === 'pin' || p.category === 'forro') && defaultColor ? buildVariantImage(baseImage, defaultColor) : baseImage;

            return `
                <div class="product-card" style="--delay:${i}">
                    <div class="product-card__image" style="cursor:pointer;" onclick="window.openQuickView(${p.id})">
                        <img src="${initialImage}" alt="${p.name}" loading="lazy" data-base-image="${baseImage}" data-fallback="../static/images/logos/logo_M&B.png" onerror="this.src === this.dataset.baseImage ? (this.src = this.dataset.fallback) : (this.src = this.dataset.baseImage)">
                    </div>
                    <div class="product-card__body">
                        <span class="product-card__category">
                            <i class="fa-solid ${getCategoryIcon(p.category)}"></i> ${getCategoryLabel(p.category)}
                        </span>
                        <h3 class="product-card__name">${p.name}</h3>
                        <p class="product-card__desc">${p.description || ''}</p>
                        <div class="product-card__price">${formatPrice(p.price)}</div>
                        ${variationHTML}
                        <button class="product-card__add-btn" data-product-id="${p.id}" ${p.category === 'buso' && variations.colores && variations.tallas ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-plus"></i> Agregar al carrito
                        </button>
                    </div>
                </div>`;
        }).join('');

        // Preload variant images on hover over the card to speed up switching
        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                const chips = card.querySelectorAll('.variation-chip[data-variation-type="color"]');
                const img = card.querySelector('.product-card__image img');
                const baseImage = img ? (img.dataset.baseImage || '../static/images/logos/logo_M&B.png') : null;
                if(baseImage) {
                    chips.forEach(chip => {
                        preloadImage(buildVariantImage(baseImage, chip.dataset.variation));
                    });
                }
            }, {once: true}); // Only run once per card
        });

        // Bind variation chip clicks
        grid.querySelectorAll('.variation-chip').forEach(chip => {
            chip.addEventListener('click', function (e) {
                e.stopPropagation();
                const chipsGroup = this.closest('.variation-chips');
                const siblings = chipsGroup.querySelectorAll('.variation-chip');
                siblings.forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');

                const card = this.closest('.product-card') || this.closest('.quick-view-content');
                const img = card.querySelector('img');
                const addBtn = card.querySelector('.product-card__add-btn');
                const selectedVariation = this.dataset.variation;
                const selectedType = this.dataset.variationType;
                
                if (selectedType === 'color' && img) {
                    const baseImage = img.dataset.baseImage || '../static/images/logos/logo_M&B.png';
                    const filename = buildVariantImage(baseImage, selectedVariation);
                    img.src = filename;
                    img.dataset.selectedImage = filename;
                    img.dataset.fallback = img.dataset.fallback || '../static/images/logos/logo_M&B.png';
                }

                // Check button state
                const categoryEl = card.querySelector('.product-card__category');
                const isBuso = categoryEl && categoryEl.textContent.toLowerCase().includes('buso');
                const hasColor = !!card.querySelector('.variation-chip.selected[data-variation-type="color"]');
                const hasSize = isBuso ? !!card.querySelector('.variation-chip.selected[data-variation-type="size"]') : true;
                
                if (card.querySelector('.product-card__variations') && hasColor && hasSize) {
                    addBtn.disabled = false;
                } else {
                    addBtn.disabled = true;
                }
            });
        });

        // Bind add-to-cart buttons
        grid.querySelectorAll('.product-card__add-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                handleAddToCartClick(this);
            });
        });
    }

    function handleAddToCartClick(btnElement) {
        const productId = parseInt(btnElement.dataset.productId);
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let variation = '';
        let color = '';
        let size = '';
        const card = btnElement.closest('.product-card') || btnElement.closest('.quick-view-content');

        if (product.category === 'forro') {
            const input = card.querySelector('.variation-input');
            variation = input ? input.value.trim() : '';
            if (!variation) {
                showToast('Escribe el modelo de tu celular', 'error');
                input?.focus();
                return;
            }
        } else {
            const selectedColor = card.querySelector('.variation-chip.selected[data-variation-type="color"]');
            const selectedSize = card.querySelector('.variation-chip.selected[data-variation-type="size"]');
            const selectedParts = [];
            if (selectedColor) {
                color = selectedColor.dataset.variation;
                selectedParts.push(color);
            }
            if (selectedSize) {
                size = selectedSize.dataset.variation;
                selectedParts.push(size);
            }
            variation = selectedParts.join(' / ');
        }

        // capture the currently visible image for the selected variant (if any)
        const img = card.querySelector('img');
        const selectedImage = (img && (img.dataset.selectedImage || img.src)) || product.image_url;
        addToCart(productId, variation, color, size, selectedImage);
        
        if (quickViewModal && quickViewModal.style.display === 'flex') {
            closeQuickView();
        }
    }

    // ── Quick View Logic ───────────────────────────────
    window.openQuickView = function(productId) {
        const product = products.find(p => p.id === productId);
        if(!product) return;
        currentQuickViewProduct = product;

        document.getElementById('quick-view-name').textContent = product.name;
        document.getElementById('quick-view-desc').textContent = product.description || '';
        document.getElementById('quick-view-price').textContent = formatPrice(product.price);
        document.getElementById('quick-view-category').innerHTML = `<i class="fa-solid ${getCategoryIcon(product.category)}"></i> ${getCategoryLabel(product.category)}`;
        
        const imgEl = document.getElementById('quick-view-image');
        const baseImage = product.image_url || '../static/images/logos/logo_M&B.png';
        imgEl.dataset.baseImage = baseImage;
        imgEl.dataset.fallback = '../static/images/logos/logo_M&B.png';
        
        // Generate Variations HTML
        const variations = product.variations || {};
        let variationHTML = '';
        let defaultColor = '';

        if (product.category === 'buso') {
            const colorOptions = variations.colores || [];
            const sizeOptions = variations.tallas || [];
            defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
            const defaultSize = sizeOptions[0] || '';
            variationHTML = `
                ${colorOptions.length ? `<span class="variation-label">Color</span><div class="variation-chips variation-chips--colors">${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}</div>` : ''}
                ${sizeOptions.length ? `<span class="variation-label">Talla</span><div class="variation-chips">${sizeOptions.map(t => `<button class="variation-chip${t === defaultSize ? ' selected' : ''}" data-variation="${t}" data-variation-type="size">${t}</button>`).join('')}</div>` : ''}
            `;
        } else if (product.category === 'pin' && variations.colores) {
            const colorOptions = variations.colores || [];
            defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
            variationHTML = `
                <span class="variation-label">Color</span>
                <div class="variation-chips">
                    ${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}
                </div>
            `;
        } else if (product.category === 'forro') {
            const colorOptions = variations.colores || [];
            defaultColor = colorOptions.find(c => /morado|purple|violeta/i.test(c)) || colorOptions[0] || '';
            variationHTML = `
                ${colorOptions.length ? `<span class="variation-label">Color</span><div class="variation-chips">${colorOptions.map(c => `<button class="variation-chip${c === defaultColor ? ' selected' : ''}" data-variation="${c}" data-variation-type="color">${c}</button>`).join('')}</div>` : ''}
                <span class="variation-label">Modelo de celular (por encargo)</span>
                <input type="text" class="variation-input" placeholder="Ej: iPhone 15, Samsung S24..." data-product-id="${product.id}">
            `;
        }

        document.getElementById('quick-view-variations').innerHTML = variationHTML;
        
        const initialImage = defaultColor ? buildVariantImage(baseImage, defaultColor) : baseImage;
        imgEl.src = initialImage;
        imgEl.dataset.selectedImage = initialImage;

        const addBtn = document.getElementById('quick-view-add-btn');
        addBtn.dataset.productId = product.id;
        addBtn.disabled = (product.category === 'buso' && variations.colores && variations.tallas);

        // Rebind chips inside modal
        quickViewModal.querySelectorAll('.variation-chip').forEach(chip => {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                const chipsGroup = this.closest('.variation-chips');
                const siblings = chipsGroup.querySelectorAll('.variation-chip');
                siblings.forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');

                const selectedVariation = this.dataset.variation;
                if (this.dataset.variationType === 'color') {
                    const filename = buildVariantImage(baseImage, selectedVariation);
                    imgEl.src = filename;
                    imgEl.dataset.selectedImage = filename;
                }

                const hasColor = !!quickViewModal.querySelector('.variation-chip.selected[data-variation-type="color"]');
                const hasSize = product.category === 'buso' ? !!quickViewModal.querySelector('.variation-chip.selected[data-variation-type="size"]') : true;
                
                addBtn.disabled = !(hasColor && hasSize);
            });
        });

        quickViewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    function closeQuickView() {
        quickViewModal.style.display = 'none';
        document.body.style.overflow = '';
        currentQuickViewProduct = null;
    }

    if(quickViewClose) quickViewClose.addEventListener('click', closeQuickView);
    if(quickViewModal) {
        quickViewModal.addEventListener('click', function(e) {
            if(e.target === quickViewModal) closeQuickView();
        });
    }
    
    const quickViewAddBtn = document.getElementById('quick-view-add-btn');
    if(quickViewAddBtn) {
        quickViewAddBtn.addEventListener('click', function() {
            handleAddToCartClick(this);
        });
    }

    // ── Cart Operations ────────────────────────────────
    function addToCart(productId, variation, color = '', size = '', image_url = '') {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check if this exact item+variation already exists
        const existing = cart.find(item => item.product_id === productId && item.variation === variation);
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({
                product_id: productId,
                name: product.name,
                price: product.price,
                image_url: image_url || product.image_url,
                category: product.category,
                variation: variation,
                color: color,
                size: size,
                quantity: 1
            });
        }

        saveCart();
        showToast(`${product.name} agregado al carrito`, 'success');

        // Bounce animation on FAB
        cartFab.classList.add('cart-fab--bounce');
        setTimeout(() => cartFab.classList.remove('cart-fab--bounce'), 500);
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        saveCart();
        renderCartItems();
    }

    function updateQuantity(index, delta) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            removeFromCart(index);
            return;
        }
        saveCart();
        renderCartItems();
    }

    function getCartTotal() {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    // ── Render Cart Items ──────────────────────────────
    function renderCartItems() {
        if (cart.length === 0) {
            cartEmpty.style.display = 'flex';
            cartFooter.style.display = 'none';
            // Clear any existing item elements
            cartItemsContainer.querySelectorAll('.cart-item').forEach(el => el.remove());
            return;
        }

        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';

        // Remove old items
        cartItemsContainer.querySelectorAll('.cart-item').forEach(el => el.remove());

        cart.forEach((item, index) => {
            const imgSrc = item.image_url || '../static/images/logos/logo_M&B.png';
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${imgSrc}" alt="${item.name}" class="cart-item__img">
                <div class="cart-item__info">
                    <div class="cart-item__name">${item.name}</div>
                    ${item.color ? `<div class="cart-item__variation">Color: ${item.color}</div>` : ''}
                    ${item.size ? `<div class="cart-item__variation">Talla: ${item.size}</div>` : ''}
                    ${item.variation && !(item.color || item.size) ? `<div class="cart-item__variation">${item.variation}</div>` : ''}
                    <div class="cart-item__price">${formatPrice(item.price)}</div>
                    <div class="cart-item__qty">
                        <button class="qty-btn" data-index="${index}" data-delta="-1">−</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" data-index="${index}" data-delta="1">+</button>
                    </div>
                </div>
                <button class="cart-item__remove" data-index="${index}" aria-label="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;
            cartItemsContainer.appendChild(div);
        });

        // Update total
        cartTotal.textContent = formatPrice(getCartTotal());

        // Bind quantity buttons
        cartItemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                updateQuantity(parseInt(btn.dataset.index), parseInt(btn.dataset.delta));
            });
        });

        // Bind remove buttons
        cartItemsContainer.querySelectorAll('.cart-item__remove').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromCart(parseInt(btn.dataset.index));
            });
        });
    }

    // ── Cart Drawer Toggle ─────────────────────────────
    function openCart() {
        renderCartItems();
        cartDrawer.classList.add('cart-drawer--open');
        cartBackdrop.classList.add('cart-backdrop--visible');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        cartDrawer.classList.remove('cart-drawer--open');
        cartBackdrop.classList.remove('cart-backdrop--visible');
        document.body.style.overflow = '';
        // Reset to cart view if in checkout
        if (isCheckoutMode) {
            toggleCheckoutMode(false);
        }
    }

    // ── Checkout Mode ──────────────────────────────────
    function toggleCheckoutMode(show) {
        isCheckoutMode = show;
        cartItemsContainer.style.display = show ? 'none' : 'block';
        checkoutForm.style.display = show ? 'block' : 'none';
        checkoutBtn.style.display = show ? 'none' : 'block';
        whatsappBtn.style.display = show ? 'block' : 'none';
    }

    // ── Submit Order ───────────────────────────────────
    async function submitOrder() {
        const name = document.getElementById('checkout-name').value.trim();
        const phone = document.getElementById('checkout-phone').value.trim();
        const email = document.getElementById('checkout-email').value.trim();
        const address = document.getElementById('checkout-address').value.trim();
        const city = document.getElementById('checkout-city').value.trim();
        const notes = document.getElementById('checkout-notes').value.trim();

        // Validation
        if (!name) { showToast('Ingresa tu nombre', 'error'); return; }
        if (!phone) { showToast('Ingresa tu teléfono', 'error'); return; }
        if (!address) { showToast('Ingresa tu dirección de envío', 'error'); return; }
        if (!city) { showToast('Ingresa tu ciudad', 'error'); return; }

        const orderData = {
            customer_name: name,
            customer_phone: phone,
            customer_email: email,
            shipping_address: address,
            city: city,
            notes: notes,
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                variation: item.variation,
                color: item.color || '',
                size: item.size || ''
            }))
        };

        whatsappBtn.disabled = true;
        whatsappBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();

            if (data.success) {
                // Clear cart
                cart = [];
                saveCart();
                closeCart();
                renderCartItems();

                showToast('¡Pedido creado! Redirigiendo a WhatsApp...', 'success');

                // Open WhatsApp after a brief delay
                setTimeout(() => {
                    window.open(data.whatsapp_url, '_blank');
                }, 800);

                // Clear form
                document.getElementById('checkout-name').value = '';
                document.getElementById('checkout-phone').value = '';
                document.getElementById('checkout-email').value = '';
                document.getElementById('checkout-address').value = '';
                document.getElementById('checkout-city').value = '';
                document.getElementById('checkout-notes').value = '';
            } else {
                showToast(data.message || 'Error al crear el pedido', 'error');
            }
        } catch (err) {
            console.error('Order error:', err);
            showToast('Error de conexión. Intenta de nuevo.', 'error');
        } finally {
            whatsappBtn.disabled = false;
            whatsappBtn.innerHTML = '<i class="brands fa-whatsapp"></i> Pedir por WhatsApp';
        }
    }

    // ── Admin: Create & Update Product ─────────────────────────
    if (productForm) {
        productForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const formData = new FormData(productForm);
            const productId = document.getElementById('admin-product-id').value;
            const payload = {
                userid: localStorage.getItem('userid'),
                name: formData.get('name')?.toString().trim(),
                description: formData.get('description')?.toString().trim(),
                category: formData.get('category')?.toString().trim(),
                price: Number(formData.get('price')),
                image_url: formData.get('image_url')?.toString().trim(),
                variations: formData.get('variations')?.toString().trim()
            };

            try {
                let url = '/api/admin/products';
                let method = 'POST';
                if (productId) {
                    url = `/api/admin/products/${productId}`;
                    method = 'PUT';
                }

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    resetAdminForm();
                    showToast(`Diseño ${productId ? 'actualizado' : 'guardado'} correctamente`, 'success');
                    loadProducts();
                } else {
                    showToast(data.error || 'No se pudo guardar el diseño', 'error');
                }
            } catch (err) {
                console.error('Error saving product:', err);
                showToast('Error de conexión al guardar el diseño', 'error');
            }
        });

        if (adminProductCancelBtn) {
            adminProductCancelBtn.addEventListener('click', resetAdminForm);
        }
    }

    function resetAdminForm() {
        if(productForm) productForm.reset();
        const idInput = document.getElementById('admin-product-id');
        if(idInput) idInput.value = '';
        if(adminProductTitle) adminProductTitle.textContent = 'Agregar un nuevo diseño';
        if(adminProductSubmitBtn) adminProductSubmitBtn.textContent = 'Guardar diseño';
        if(adminProductCancelBtn) adminProductCancelBtn.style.display = 'none';
    }

    function renderAdminProducts() {
        if (!adminProductsList) return;
        if (products.length === 0) {
            adminProductsList.innerHTML = '<p style="color:var(--text-muted);">No hay productos.</p>';
            return;
        }

        adminProductsList.innerHTML = products.map(p => `
            <div class="admin-product-item">
                <div>
                    <strong>${p.name}</strong> - ${formatPrice(p.price)}
                    <div style="font-size:0.8rem; color:var(--text-muted);">${getCategoryLabel(p.category)}</div>
                </div>
                <div class="admin-product-item-actions">
                    <button class="edit" onclick="window.editAdminProduct(${p.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="delete" onclick="window.deleteAdminProduct(${p.id})"><i class="fa-solid fa-trash"></i> Desactivar</button>
                </div>
            </div>
        `).join('');
    }

    window.editAdminProduct = function(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;
        document.getElementById('admin-product-id').value = product.id;
        document.getElementById('admin-product-name').value = product.name;
        document.getElementById('admin-product-image').value = product.image_url || '';
        document.getElementById('admin-product-category').value = product.category;
        document.getElementById('admin-product-price').value = product.price;
        document.getElementById('admin-product-desc').value = product.description || '';
        document.getElementById('admin-product-var').value = product.variations && Object.keys(product.variations).length > 0 ? JSON.stringify(product.variations) : '';
        
        adminProductTitle.textContent = `Editar diseño: ${product.name}`;
        adminProductSubmitBtn.textContent = 'Actualizar diseño';
        adminProductCancelBtn.style.display = 'inline-block';
        
        // Scroll to form
        productForm.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteAdminProduct = async function(id) {
        if (!confirm('¿Estás seguro de que deseas desactivar este producto? Ya no aparecerá en la tienda.')) return;
        const userid = localStorage.getItem('userid');
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userid: userid })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Producto desactivado', 'success');
                loadProducts();
            } else {
                showToast(data.error || 'Error al desactivar', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };


    // ── Admin: Load Orders ─────────────────────────────
    async function loadAdminOrders(statusFilter = 'all') {
        const userid = localStorage.getItem('userid');
        if (!userid) return;

        try {
            const res = await fetch(`/api/admin/orders?userid=${userid}`);
            if (res.status === 403) return;
            const data = await res.json();
            renderAdminOrders(data.orders || [], statusFilter);
        } catch (err) {
            console.error('Error loading admin orders:', err);
        }
    }

    function renderAdminOrders(orders, statusFilter) {
        const filtered = statusFilter === 'all'
            ? orders
            : orders.filter(o => o.status === statusFilter);

        if (filtered.length === 0) {
            adminOrdersList.innerHTML = '<div class="store-empty" style="display:flex;padding:30px;"><i class="fa-solid fa-clipboard-check"></i><p>No hay pedidos</p></div>';
            return;
        }

        const statusLabels = {
            pending: 'Pendiente',
            paid: 'Pagado',
            shipped: 'Enviado',
            completed: 'Completado',
            cancelled: 'Cancelado'
        };

        adminOrdersList.innerHTML = filtered.map(order => {
            const date = new Date(order.created_at);
            const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const itemsHTML = (order.items || []).map(item =>
                `<div class="admin-order__item">
                    <span>${item.quantity}x ${item.product_name}${item.variation_selected ? ` (${item.variation_selected})` : ''}</span>
                    <span>${formatPrice(item.price_at_purchase * item.quantity)}</span>
                </div>`
            ).join('');

            return `
                <div class="admin-order">
                    <div class="admin-order__header">
                        <div>
                            <strong>Pedido #${order.id}</strong>
                            <span class="admin-order__date">${dateStr}</span>
                        </div>
                        <div class="admin-order__status-group">
                            <span class="order-status status--${order.status}">${statusLabels[order.status]}</span>
                            <select class="status-select" data-order-id="${order.id}" data-current="${order.status}">
                                <option value="" disabled selected>Cambiar</option>
                                <option value="pending">Pendiente</option>
                                <option value="paid">Pagado</option>
                                <option value="shipped">Enviado</option>
                                <option value="completed">Completado</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>
                    </div>
                    <div class="admin-order__items">${itemsHTML}</div>
                    <div class="admin-order__total">Total: ${formatPrice(order.total_price)}</div>
                    <div class="admin-order__customer">
                        <div><i class="fa-solid fa-user"></i> ${order.customer_name}</div>
                        <div><i class="fa-solid fa-phone"></i> ${order.customer_phone}</div>
                        ${order.customer_email ? `<div><i class="fa-solid fa-envelope"></i> ${order.customer_email}</div>` : ''}
                        <div><i class="fa-solid fa-location-dot"></i> ${order.shipping_address}, ${order.city}</div>
                        ${order.notes ? `<div><i class="fa-solid fa-note-sticky"></i> ${order.notes}</div>` : ''}
                    </div>
                </div>`;
        }).join('');

        // Bind status change dropdowns
        adminOrdersList.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async function () {
                const orderId = this.dataset.orderId;
                const newStatus = this.value;
                const userid = localStorage.getItem('userid');

                try {
                    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userid: userid, status: newStatus })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast(`Pedido #${orderId} actualizado a "${newStatus}"`, 'success');
                        loadAdminOrders();
                    } else {
                        showToast(data.message || 'Error al actualizar', 'error');
                    }
                } catch (err) {
                    showToast('Error de conexión', 'error');
                }
            });
        });
    }

    // ── Check if user is admin ─────────────────────────
    async function checkAdmin() {
        const userid = localStorage.getItem('userid');
        if (!userid) return;

        try {
            const res = await fetch(`/api/profile/${userid}`);
            const data = await res.json();
            if (data.is_admin) {
                adminPanel.style.display = 'block';
                loadAdminOrders();
                renderAdminProducts();

                // Admin status filter buttons
                adminPanel.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        adminPanel.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        loadAdminOrders(this.dataset.status);
                    });
                });
            }
        } catch (err) {
            // Not admin or not logged in - that's fine
        }
    }

    // ── Event Listeners ────────────────────────────────

    // Category filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.category;
            renderProducts();
        });
    });

    // Search and Sort
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderProducts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            renderProducts();
        });
    }

    // Admin Tabs
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            adminTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.tab;
            if (target === 'orders') {
                adminOrdersTab.style.display = 'block';
                adminProductsTab.style.display = 'none';
            } else {
                adminOrdersTab.style.display = 'none';
                adminProductsTab.style.display = 'block';
            }
        });
    });

    // Cart FAB
    cartFab.addEventListener('click', openCart);

    // Cart close
    cartClose.addEventListener('click', closeCart);
    cartBackdrop.addEventListener('click', closeCart);

    // Checkout button
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            showToast('Tu carrito está vacío', 'error');
            return;
        }
        toggleCheckoutMode(true);
    });

    // Back from checkout
    checkoutBack.addEventListener('click', () => toggleCheckoutMode(false));

    // WhatsApp submit
    whatsappBtn.addEventListener('click', submitOrder);

    // Keyboard: Escape to close cart or quick view
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (cartDrawer.classList.contains('cart-drawer--open')) {
                closeCart();
            } else if (quickViewModal && quickViewModal.style.display === 'flex') {
                closeQuickView();
            }
        }
    });

    // ── Init ───────────────────────────────────────────
    updateCartBadge();
    loadProducts();
    checkAdmin();

})();
