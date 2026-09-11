// ==========================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ==========================================
const API_BASE_URL = "https://reposteria-api.onrender.com";
let cart = [];
let allProducts = [];
let currentSelectedProduct = null; // Guarda temporalmente la torta que se está personalizando

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadMenu();
    setupCheckout();
    
    const dateInput = document.getElementById('delivery-date');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
});

// ==========================================
// CARGA DE DATOS DESDE LA API
// ==========================================
async function loadMenu() {
    try {
        const [categoriesRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/categories/`),
            fetch(`${API_BASE_URL}/admin/products/`)
        ]);

        const categories = await categoriesRes.json();
        allProducts = await productsRes.json();

        renderCategories(categories);
        renderProducts(allProducts);
    } catch (error) {
        console.error("Error cargando el menú:", error);
        document.getElementById("products-container").innerHTML = 
            "<p style='text-align:center; grid-column: 1/-1;'>Ocurrió un error al cargar los productos.</p>";
    }
}

// ==========================================
// RENDERIZADO DE INTERFAZ
// ==========================================
function renderCategories(categories) {
    const container = document.getElementById("categories-container");
    container.innerHTML = `<button class="active" onclick="filterProducts('all', this)">Todos</button>`;
    
    categories.forEach(cat => {
        if (cat.is_active) {
            container.innerHTML += `<button onclick="filterProducts(${cat.id}, this)">${cat.name}</button>`;
        }
    });
}

function renderProducts(products) {
    const container = document.getElementById("products-container");
    container.innerHTML = "";

    products.forEach(prod => {
        if (!prod.is_available) return;

        const imageUrl = prod.image_url || 'https://images.unsplash.com/photo-1556910103-1c02745a872f?auto=format&fit=crop&w=500&q=80';
        const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(prod.base_price);
        
        // Escapar comillas para evitar errores al pasar el nombre
        const escapedName = prod.name.replace(/'/g, "\\'");

        const card = `
            <article class="product-card">
                <img src="${imageUrl}" alt="${prod.name}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <p>${prod.description || 'Delicioso postre artesanal.'}</p>
                    <span class="price">${formattedPrice}</span>
                    <!-- AHORA ABRE EL MODAL EN LUGAR DE AGREGAR DIRECTO -->
                    <button class="btn-add" onclick="openOptionsModal(${prod.id}, '${escapedName}', ${prod.base_price})">
                        Personalizar y Agregar
                    </button>
                </div>
            </article>
        `;
        container.innerHTML += card;
    });
}

function filterProducts(categoryId, btnElement) {
    document.querySelectorAll(".categories-nav button").forEach(btn => btn.classList.remove("active"));
    btnElement.classList.add("active");

    if (categoryId === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category_id === categoryId);
        renderProducts(filtered);
    }
}

// ==========================================
// LÓGICA DE PERSONALIZACIÓN (MODAL)
// ==========================================
function openOptionsModal(id, name, price) {
    currentSelectedProduct = { id, name, price };
    
    document.getElementById("modal-product-name").innerText = name;
    document.getElementById("modal-product-price").innerText = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
    
    document.getElementById("modal-product-size").value = "";
    document.getElementById("modal-product-dedication").value = "";
    
    document.getElementById("product-options-modal").style.display = "flex";
}

function closeOptionsModal() {
    document.getElementById("product-options-modal").style.display = "none";
    currentSelectedProduct = null;
}

function confirmAddToCart() {
    if (!currentSelectedProduct) return;
    
    const size = document.getElementById("modal-product-size").value;
    const dedication = document.getElementById("modal-product-dedication").value;
    
    addToCart(
        currentSelectedProduct.id, 
        currentSelectedProduct.name, 
        currentSelectedProduct.price,
        size,
        dedication
    );
    
    closeOptionsModal();
}

// ==========================================
// LÓGICA DEL CARRITO DE COMPRAS
// ==========================================
function toggleCart() {
    document.getElementById("cart-sidebar").classList.toggle("closed");
}

function addToCart(id, name, price, sizeOption, dedicationText) {
    // Creamos un ID único para el carrito agrupando por formato y dedicatoria
    const cartItemId = `${id}-${sizeOption || 'std'}-${dedicationText || 'none'}`;
    const existingItem = cart.find(item => item.cartItemId === cartItemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            id: id, 
            cartItemId: cartItemId, 
            name: name, 
            price: price, 
            quantity: 1,
            size_option: sizeOption || null,
            dedication_text: dedicationText || null
        });
    }
    
    updateCartUI();
    document.getElementById("cart-sidebar").classList.remove("closed");
}

function updateQuantity(cartItemId, delta) {
    const item = cart.find(item => item.cartItemId === cartItemId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.cartItemId !== cartItemId);
        }
    }
    updateCartUI();
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotalElement = document.getElementById("cart-total");
    const cartBadge = document.getElementById("cart-badge");
    const btnSubmit = document.getElementById("btn-submit-order");

    cartItemsContainer.innerHTML = "";
    let total = 0;
    let totalItems = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p class='empty-cart'>Tu carrito está vacío.</p>";
        btnSubmit.disabled = true;
    } else {
        btnSubmit.disabled = false;
        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            totalItems += item.quantity;
            
            const formattedSubtotal = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(subtotal);

            // Armar los textos adicionales si existen
            let detailsHtml = "";
            if (item.size_option) detailsHtml += `<small>Formato: ${item.size_option}</small>`;
            if (item.dedication_text) detailsHtml += `<small>📝 "${item.dedication_text}"</small>`;

            cartItemsContainer.innerHTML += `
                <li class="cart-item">
                    <div class="cart-item-info">
                        <span class="item-name">${item.name}</span>
                        ${detailsHtml}
                        <div class="quantity-controls" style="margin-top: 5px;">
                            <button class="btn-qty" onclick="updateQuantity('${item.cartItemId}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn-qty" onclick="updateQuantity('${item.cartItemId}', 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <span>${formattedSubtotal}</span>
                    </div>
                </li>
            `;
        });
    }

    cartTotalElement.innerText = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total);
    cartBadge.innerText = totalItems;
}

// ==========================================
// PROCESAMIENTO DEL PEDIDO (CHECKOUT)
// ==========================================
function setupCheckout() {
    const form = document.getElementById("order-form");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;

        const btnSubmit = document.getElementById("btn-submit-order");
        btnSubmit.innerText = "Procesando...";
        btnSubmit.disabled = true;

        const orderPayload = {
            customer_name: document.getElementById("customer-name").value,
            customer_phone: document.getElementById("customer-phone").value,
            delivery_date: document.getElementById("delivery-date").value,
            notes: document.getElementById("order-notes").value,
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                size_option: item.size_option, 
                dedication_text: item.dedication_text
            }))
        };

        try {
            const response = await fetch(`${API_BASE_URL}/sales/orders/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderPayload)
            });

            if (response.ok) {
                const result = await response.json();
                cart = [];
                updateCartUI();
                form.reset();
                window.location.href = result.whatsapp_redirect_url;
            } else {
                alert("Hubo un problema al procesar tu encargo. Inténtalo nuevamente.");
            }
        } catch (error) {
            console.error("Error en checkout:", error);
            alert("No se pudo conectar con el servidor.");
        } finally {
            btnSubmit.innerText = "Agendar por WhatsApp";
            btnSubmit.disabled = false;
        }
    });
}