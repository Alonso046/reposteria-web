const API_BASE_URL = "http://localhost:8000";
let productToDeleteId = null; 

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadAdminProducts();
    setupForm();
    setupFileInput();
});

// ==========================================
// SISTEMA DE LOGIN FRONTAL
// ==========================================
function checkLogin() {
    const passInput = document.getElementById("admin-password").value;
    const errorMsg = document.getElementById("login-error");
    const overlay = document.getElementById("login-overlay");
    const dashboard = document.getElementById("admin-dashboard");

    // Contraseña de acceso
    if (passInput === "reposteria2026") {
        overlay.style.display = "none";
        dashboard.style.display = "block";
    } else {
        errorMsg.style.display = "block";
    }
}

// Permitir presionar "Enter" para ingresar
document.getElementById("admin-password").addEventListener("keypress", function(e) {
    if (e.key === "Enter") checkLogin();
});

// ==========================================
// MANEJO DEL INPUT DE ARCHIVO
// ==========================================
function setupFileInput() {
    const fileInput = document.getElementById("prod-image-file");
    const clearBtn = document.getElementById("btn-clear-file");

    fileInput.addEventListener("change", function() {
        if (this.files.length > 0) {
            clearBtn.style.display = "block";
        } else {
            clearBtn.style.display = "none";
        }
    });
}

function clearFile() {
    document.getElementById("prod-image-file").value = "";
    document.getElementById("btn-clear-file").style.display = "none";
}

// ==========================================
// CARGA DE DATOS DESDE LA API
// ==========================================
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/`);
        const categories = await response.json();
        const select = document.getElementById("prod-category");
        
        select.innerHTML = "";
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
}

async function loadAdminProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/products/`);
        const products = await response.json();
        const tbody = document.getElementById("admin-table-body");
        tbody.innerHTML = "";

        products.forEach(prod => {
            const tr = document.createElement("tr");
            const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(prod.base_price);
            
            // Escapar comillas simples para evitar errores en el botón de editar
            const escapedName = prod.name.replace(/'/g, "\\'");
            const escapedDesc = (prod.description || "").replace(/'/g, "\\'");
            const escapedImg = (prod.image_url || "").replace(/'/g, "\\'");

            tr.innerHTML = `
                <td><strong>${prod.name}</strong></td>
                <td>${formattedPrice}</td>
                <td>
                    <button class="btn-edit" onclick="editProduct(${prod.id}, '${escapedName}', ${prod.category_id}, ${prod.base_price}, '${escapedDesc}', '${escapedImg}')">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct(${prod.id})">Borrar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// ==========================================
// FORMULARIO: CREAR Y EDITAR (CON IMGBB)
// ==========================================
function setupForm() {
    const form = document.getElementById("product-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.querySelector("#product-form .btn-primary");
        btnSubmit.innerText = "Procesando...";
        btnSubmit.disabled = true;

        const id = document.getElementById("prod-id").value;
        const fileInput = document.getElementById("prod-image-file");
        let finalImageUrl = document.getElementById("prod-current-image").value || null;

        // Si el usuario seleccionó una nueva foto, subir a ImgBB primero
        if (fileInput.files.length > 0) {
            btnSubmit.innerText = "Subiendo foto a ImgBB...";
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image/`, {
                    method: "POST",
                    body: formData
                });
                
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    finalImageUrl = uploadData.image_url;
                } else {
                    alert("Error al subir la imagen. Intenta nuevamente.");
                    btnSubmit.innerText = "Guardar Producto";
                    btnSubmit.disabled = false;
                    return; 
                }
            } catch (error) {
                console.error("Error subiendo foto:", error);
                btnSubmit.innerText = "Guardar Producto";
                btnSubmit.disabled = false;
                return;
            }
        }

        btnSubmit.innerText = "Guardando producto...";

        const payload = {
            name: document.getElementById("prod-name").value,
            category_id: parseInt(document.getElementById("prod-category").value),
            base_price: parseInt(document.getElementById("prod-price").value),
            description: document.getElementById("prod-desc").value,
            image_url: finalImageUrl,
            is_available: true
        };

        const method = id ? "PUT" : "POST";
        const url = id ? `${API_BASE_URL}/admin/products/${id}` : `${API_BASE_URL}/admin/products/`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                resetForm();
                loadAdminProducts();
            } else {
                alert("Error al guardar los datos del producto en la base de datos.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            btnSubmit.innerText = "Guardar Producto";
            btnSubmit.disabled = false;
        }
    });
}

function editProduct(id, name, category_id, price, desc, image) {
    document.getElementById("form-title").innerText = "Editar Producto";
    document.getElementById("prod-id").value = id;
    document.getElementById("prod-name").value = name;
    document.getElementById("prod-category").value = category_id;
    document.getElementById("prod-price").value = price;
    document.getElementById("prod-desc").value = desc !== 'null' ? desc : "";
    
    // Configurar estado de la imagen actual
    const currentImgUrl = image !== 'null' ? image : "";
    document.getElementById("prod-current-image").value = currentImgUrl;
    
    const textInfo = document.getElementById("current-image-text");
    if (currentImgUrl) {
        textInfo.innerText = "✓ Este producto ya tiene una foto guardada. Solo sube un archivo si deseas cambiarla.";
        textInfo.style.display = "block";
    } else {
        textInfo.style.display = "none";
    }
    
    document.getElementById("btn-cancel").style.display = "inline-block";
    clearFile(); 
    window.scrollTo(0, 0); 
}

function resetForm() {
    document.getElementById("product-form").reset();
    document.getElementById("prod-id").value = "";
    document.getElementById("prod-current-image").value = "";
    document.getElementById("current-image-text").style.display = "none";
    document.getElementById("form-title").innerText = "Agregar Nuevo Producto";
    document.getElementById("btn-cancel").style.display = "none";
    clearFile();
}

// ==========================================
// ELIMINACIÓN DE PRODUCTOS (MODAL)
// ==========================================
function deleteProduct(id) {
    productToDeleteId = id;
    document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
    productToDeleteId = null;
    document.getElementById("delete-modal").style.display = "none";
}

async function confirmDelete() {
    if (productToDeleteId) {
        try {
            await fetch(`${API_BASE_URL}/admin/products/${productToDeleteId}`, { method: "DELETE" });
            loadAdminProducts();
            closeDeleteModal();
        } catch (error) {
            console.error("Error eliminando producto:", error);
            alert("No se pudo eliminar el producto.");
        }
    }
}

// ==========================================
// SISTEMA DE PESTAÑAS (TABS) Y VENTAS
// ==========================================
function switchTab(tabName) {
    const viewCatalog = document.getElementById("view-catalog");
    const viewSales = document.getElementById("view-sales");
    const btnCatalog = document.getElementById("tab-catalog");
    const btnSales = document.getElementById("tab-sales");

    if (tabName === "catalog") {
        viewCatalog.style.display = "grid";
        viewSales.style.display = "none";
        btnCatalog.className = "btn-primary";
        btnSales.className = "btn-secondary";
    } else {
        viewCatalog.style.display = "none";
        viewSales.style.display = "block";
        btnCatalog.className = "btn-secondary";
        btnSales.className = "btn-primary";
        
        // Cargar las ventas automáticamente al abrir la pestaña
        loadSalesHistory();
    }
}

async function loadSalesHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/sales/orders/`);
        const orders = await response.json();
        const tbody = document.getElementById("sales-table-body");
        
        tbody.innerHTML = "";
        
        if (orders.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Aún no hay pedidos registrados.</td></tr>";
            return;
        }

        orders.forEach(order => {
            const formattedTotal = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(order.total_amount);
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${order.id}</strong></td>
                <td>${order.customer_name}</td>
                <td><a href="https://wa.me/${order.customer_phone}" target="_blank" style="color: var(--accent-caramelo);">${order.customer_phone}</a></td>
                <td>📅 ${order.delivery_date}</td>
                <td style="color: var(--text-cafe); font-weight: bold;">${formattedTotal}</td>
                <td style="font-size: 0.85rem; color: #666;">${order.notes || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando historial de ventas:", error);
    }
}