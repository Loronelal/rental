// ============================================================
// 1. Конфигурация и базовые функции
// ============================================================
const API_BASE = '/api';
let currentPageName = 'catalog';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('clientId');
}

function isAuthenticated() {
    return !!getToken();
}

function isAdmin() {
    return localStorage.getItem('role') === 'Admin';
}

async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(options.headers || {})
    };
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) === 0) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

// ============================================================
// 2. Аутентификация (UI)
// ============================================================
function updateAuthUI() {
    const userStatus = document.getElementById('userStatus');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const token = getToken();
    const userName = localStorage.getItem('userName') || 'Гость';
    if (userStatus) {
        userStatus.innerText = token ? userName : 'Гость';
    }
    if (loginBtn) loginBtn.classList.toggle('d-none', !!token);
    if (registerBtn) registerBtn.classList.toggle('d-none', !!token);
    if (logoutBtn) logoutBtn.classList.toggle('d-none', !token);

    const showAdmin = isAdmin();
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.style.display = showAdmin ? '' : 'none';
    });
}

let authMode = 'login';

function toggleAuthMode() {
    const isLogin = authMode === 'login';
    authMode = isLogin ? 'register' : 'login';
    const label = document.getElementById('authModalLabel');
    const registerFields = document.getElementById('registerFields');
    const toggle = document.getElementById('authToggle');
    const submitBtn = document.querySelector('#authForm button');
    if (label) label.innerText = isLogin ? 'Регистрация' : 'Вход';
    if (registerFields) registerFields.style.display = isLogin ? 'block' : 'none';
    if (toggle) toggle.innerText = isLogin ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
    if (submitBtn) submitBtn.innerText = isLogin ? 'Зарегистрироваться' : 'Войти';
}

window.openAuthModal = function (mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    const label = document.getElementById('authModalLabel');
    const registerFields = document.getElementById('registerFields');
    const toggle = document.getElementById('authToggle');
    const submitBtn = document.querySelector('#authForm button');
    if (label) label.innerText = isLogin ? 'Вход' : 'Регистрация';
    if (registerFields) registerFields.style.display = isLogin ? 'none' : 'block';
    if (toggle) toggle.innerText = isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    if (submitBtn) submitBtn.innerText = isLogin ? 'Войти' : 'Зарегистрироваться';
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
};

const authForm = document.getElementById('authForm');
if (authForm) {
    authForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const isLogin = document.querySelector('#authForm button').innerText === 'Войти';
        let url, body;
        if (isLogin) {
            url = '/api/auth/login';
            body = { username, password };
        } else {
            url = '/api/auth/register';
            body = {
                username,
                password,
                name: document.getElementById('authName').value.trim(),
                phone: document.getElementById('authPhone').value.trim(),
                email: document.getElementById('authEmail').value.trim()
            };
            if (!body.name || !body.phone) {
                alert('Заполните имя и телефон');
                return;
            }
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text);
            }
            if (isLogin) {
                const data = await response.json();
                setToken(data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('clientId', data.clientId);
                localStorage.setItem('userName', data.name);
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
                updateAuthUI();
                loadPageData();
            } else {
                alert('Регистрация успешна! Теперь войдите.');
                openAuthModal('login');
            }
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });
}

function logout() {
    removeToken();
    localStorage.removeItem('userName');
    updateAuthUI();
    loadPageData();
}

// ============================================================
// 3. Определение текущей страницы
// ============================================================
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('catalog')) return 'catalog';
    if (path.includes('profile')) return 'profile';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('myEquipment')) return 'myEquipment';
    if (path.includes('clients')) return 'clients';
    if (path.includes('equipment')) return 'equipment';
    if (path.includes('rentals')) return 'rentals';
    if (path.includes('maintenances')) return 'maintenances';
    return 'catalog';
}

function loadPageData() {
    currentPageName = getCurrentPage();
    switch (currentPageName) {
        case 'catalog':
            loadFilterTypes();
            loadCatalog();
            break;
        case 'profile':
            loadMyRentals();
            loadPaymentOptions();
            loadRatingOptions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'myEquipment':
            loadMyEquipment();
            loadMyEquipmentTypes();
            break;
        case 'clients':
            loadClients();
            break;
        case 'equipment':
            loadEquipment();
            break;
        case 'rentals':
            loadRentals();
            break;
        case 'maintenances':
            loadMaintenances();
            break;
        default:
            break;
    }
}

// ============================================================
// 4. Каталог (фильтры, загрузка, сортировка, пагинация)
// ============================================================
let allEquipment = [];
let filteredEquipment = [];
let currentPage = 1;
const pageSize = 6;

async function loadFilterTypes() {
    const select = document.getElementById('filterType');
    if (!select) return;
    try {
        const types = await fetchAPI('equipmenttypes');
        select.innerHTML = '<option value="">Все типы</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.text = t.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Ошибка загрузки типов:', e);
    }
}

async function loadCatalog() {
    if (currentPageName !== 'catalog') return;
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    try {
        const items = await fetchAPI('equipment');
        allEquipment = items;
        applyFilters();
    } catch (err) {
        alert('Ошибка загрузки каталога: ' + err.message);
    }
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterType = document.getElementById('filterType');
    const priceFrom = document.getElementById('priceFrom');
    const priceTo = document.getElementById('priceTo');
    const filterYear = document.getElementById('filterYear');
    const filterStatus = document.getElementById('filterStatus');
    const sortSelect = document.getElementById('sortSelect');

    if (!searchInput || !filterType || !priceFrom || !priceTo || !filterYear || !filterStatus || !sortSelect) return;

    const searchText = searchInput.value.toLowerCase().trim();
    const typeId = filterType.value;
    const priceFromVal = parseFloat(priceFrom.value) || 0;
    const priceToVal = parseFloat(priceTo.value) || Infinity;
    const yearFrom = parseInt(filterYear.value) || 0;
    const status = filterStatus.value;

    filteredEquipment = allEquipment.filter(e => {
        if (searchText) {
            const nameMatch = e.name.toLowerCase().includes(searchText);
            const typeMatch = (e.typeName || '').toLowerCase().includes(searchText);
            if (!nameMatch && !typeMatch) return false;
        }
        if (typeId && e.typeId != typeId) return false;
        const rate = e.hourlyRate || 0;
        if (rate < priceFromVal || rate > priceToVal) return false;
        if (yearFrom && e.year < yearFrom) return false;
        if (status && e.status !== status) return false;
        return true;
    });

    const sortBy = sortSelect.value;
    switch (sortBy) {
        case 'name':
            filteredEquipment.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price_asc':
            filteredEquipment.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
            break;
        case 'price_desc':
            filteredEquipment.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
            break;
        case 'year':
            filteredEquipment.sort((a, b) => b.year - a.year);
            break;
        default:
            break;
    }

    currentPage = 1;
    renderCatalog();
}

function renderCatalog() {
    const container = document.getElementById('catalogGrid');
    const countDisplay = document.getElementById('resultCount');
    if (!container) return;
    if (countDisplay) {
        countDisplay.innerText = `Найдено: ${filteredEquipment.length} единиц`;
    }

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredEquipment.length);
    const pageItems = filteredEquipment.slice(start, end);

    const currentUserId = localStorage.getItem('clientId') ? parseInt(localStorage.getItem('clientId')) : null;

    if (pageItems.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">Техника не найдена</div>`;
    } else {
        container.innerHTML = pageItems.map(e => {
            const statusBadge = e.status === 'доступен' ? 'bg-success' :
                e.status === 'в аренде' ? 'bg-danger' : 'bg-warning';
            const statusText = e.status === 'доступен' ? 'Доступен' :
                e.status === 'в аренде' ? 'В аренде' : 'На обслуживании';

            const isOwner = currentUserId && e.ownerId === currentUserId;
            const orderBtn = isOwner
                ? `<button class="btn btn-secondary btn-sm" disabled>Ваша техника</button>`
                : `<button class="btn btn-success btn-sm" ${e.status !== 'доступен' ? 'disabled' : ''} onclick="quickBook(${e.id})">Заказать</button>`;

            const rating = e.avgRating?.toFixed(1) || '0';
            const rentalCount = e.rentalCount || 0;

            const imgSrc = e.typeImageUrl || `https://via.placeholder.com/400x200/0d6efd/ffffff?text=${encodeURIComponent(e.typeName)}`;

            const lastMaint = e.lastMaintenanceDate ? new Date(e.lastMaintenanceDate).toLocaleDateString() : 'не указано';

            return `
                <div class="col-xl-4 col-lg-6 col-md-6 mb-4">
                    <div class="equipment-card">
                        <img src="${imgSrc}" class="card-img-top" alt="${e.name}">
                        <div class="card-body">
                            <h5 class="card-title">${e.name}</h5>
                            <div class="card-text">
                                <p><i class="fas fa-calendar-alt"></i> Год: ${e.year}</p>
                                <p><i class="fas fa-tachometer-alt"></i> Статус: <span class="badge ${statusBadge}">${statusText}</span></p>
                                <p><i class="fas fa-star"></i> Рейтинг: ${rating} (${rentalCount} аренд)</p>
                                <p><i class="fas fa-wrench"></i> Последнее ТО: ${lastMaint}</p>
                            </div>
                            <div class="price-block">
                                <span class="price">${e.hourlyRate || 0} ₽ <small>/ час</small></span>
                            </div>
                            <div class="btn-group-card">
                                <button class="btn btn-outline-primary btn-sm" onclick="showDetails(${e.id})">Подробнее</button>
                                ${orderBtn}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const totalPages = Math.ceil(filteredEquipment.length / pageSize);
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    let paginationHtml = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(-1)">Предыдущая</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i})">${i}</a></li>`;
    }
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(1)">Следующая</a></li>`;
    pagination.innerHTML = paginationHtml;
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredEquipment.length / pageSize);
    let newPage;
    if (typeof delta === 'number' && delta < 0) {
        newPage = currentPage - 1;
    } else if (typeof delta === 'number' && delta > 0 && delta < 10) {
        newPage = delta;
    } else {
        newPage = currentPage + delta;
    }
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    renderCatalog();
}

// ============================================================
// 5. Детали и бронирование (модалка)
// ============================================================
async function showDetails(id) {
    try {
        const item = await fetchAPI(`equipment/${id}`);
        const body = document.getElementById('equipmentModalBody');
        if (!body) return;

        const currentUserId = localStorage.getItem('clientId') ? parseInt(localStorage.getItem('clientId')) : null;
        const isOwner = currentUserId && item.ownerId === currentUserId;

        const imgSrc = item.typeImageUrl || `https://via.placeholder.com/400x200/0d6efd/ffffff?text=${encodeURIComponent(item.typeName)}`;

        let rentalFormHtml = '';
        if (isOwner) {
            rentalFormHtml = `<div class="alert alert-warning">Это ваша техника. Вы не можете забронировать её сами.</div>`;
        } else {
            rentalFormHtml = `
                <hr>
                <h6>Бронирование</h6>
                <form id="detailRentalForm">
                    <input type="hidden" id="detailEquipmentId" value="${item.id}">
                    <div class="mb-2">
                        <label>Дата начала</label>
                        <input type="datetime-local" id="detailStart" class="form-control" required>
                    </div>
                    <div class="mb-2">
                        <label>Дата окончания</label>
                        <input type="datetime-local" id="detailEnd" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-success">Забронировать</button>
                </form>
            `;
        }

        body.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${imgSrc}" class="img-fluid rounded" alt="${item.name}" style="max-height: 300px; width: 100%; object-fit: contain;">
                </div>
                <div class="col-md-6">
                    <h4>${item.name}</h4>
                    <p><strong>Год:</strong> ${item.year} · <strong>Ставка:</strong> ${item.hourlyRate} руб/час</p>
                    <p><strong>Статус:</strong> ${item.status}</p>
                    <p><strong>Тип:</strong> ${item.typeName || '—'}</p>
                    <p><strong>Рейтинг:</strong> ${item.avgRating?.toFixed(1) || '0'} (${item.rentalCount || 0} аренд)</p>
                    <p><strong>Владелец:</strong> ${item.ownerName || '—'}</p>
                    <p><strong>Последнее ТО:</strong> ${item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString() : 'не указано'}</p>
                    ${rentalFormHtml}
                </div>
            </div>
        `;

        const form = document.getElementById('detailRentalForm');
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const equipmentId = parseInt(document.getElementById('detailEquipmentId').value);
                const start = document.getElementById('detailStart').value;
                const end = document.getElementById('detailEnd').value;
                if (!start || !end) {
                    alert('Укажите даты');
                    return;
                }
                if (!isAuthenticated()) {
                    alert('Пожалуйста, войдите в систему');
                    return;
                }
                try {
                    await fetchAPI('rentals', {
                        method: 'POST',
                        body: JSON.stringify({
                            equipmentId,
                            startDate: new Date(start).toISOString(),
                            endDate: new Date(end).toISOString()
                        })
                    });
                    alert('Бронирование создано!');
                    bootstrap.Modal.getInstance(document.getElementById('equipmentModal')).hide();
                    loadCatalog();
                } catch (err) {
                    alert('Ошибка: ' + err.message);
                }
            });
        }

        const modal = new bootstrap.Modal(document.getElementById('equipmentModal'));
        modal.show();
    } catch (err) {
        alert('Ошибка загрузки деталей: ' + err.message);
    }
}

async function quickBook(id) {
    if (!isAuthenticated()) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    showDetails(id);
}

// ============================================================
// 6. Личный кабинет (мои бронирования)
// ============================================================
async function loadMyRentals() {
    const container = document.getElementById('profileRentals');
    if (!container) return;
    if (!isAuthenticated()) {
        container.innerHTML = '<p>Войдите, чтобы увидеть свои бронирования</p>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals/my');
        if (!rentals.length) {
            container.innerHTML = '<p class="text-muted">У вас нет бронирований</p>';
            return;
        }
        container.innerHTML = `<ul class="list-group">${rentals.map(r => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>Бронь #${r.id}</strong> — ${r.equipmentName}<br>
                    ${new Date(r.startDate).toLocaleString()} - ${new Date(r.endDate).toLocaleString()}<br>
                    Стоимость: ${r.totalCost} руб, Статус: ${r.status}
                    ${r.status === 'активно' ? `<button class="btn btn-sm btn-danger ms-2" onclick="cancelMyRental(${r.id})">Отменить</button>` : ''}
                    ${r.status === 'активно' ? `<button class="btn btn-sm btn-primary ms-2" onclick="extendRental(${r.id})">+1 час</button>` : ''}
                </div>
                <div><span class="badge bg-secondary">Оплачено: ${r.paidAmount ? r.paidAmount.toFixed(2) : '0'} руб</span></div>
            </li>
        `).join('')}</ul>`;
    } catch (err) {
        alert('Ошибка загрузки бронирований: ' + err.message);
    }
}

async function cancelMyRental(id) {
    if (!confirm('Отменить бронирование?')) return;
    try {
        await fetchAPI(`rentals/${id}/cancel`, { method: 'PUT' });
        alert('Бронирование отменено');
        loadMyRentals();
        loadCatalog();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function extendRental(id) {
    try {
        const result = await fetchAPI(`rentals/${id}/extend`, { method: 'PUT' });
        alert(`Бронирование продлено. Новая стоимость: ${result.newTotal} руб, новая дата окончания: ${new Date(result.newEnd).toLocaleString()}`);
        loadMyRentals();
        loadCatalog();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// ============================================================
// 7. Оплата и оценка (формы)
// ============================================================
async function loadPaymentOptions() {
    const select = document.getElementById('paymentRentalId');
    if (!select) return;
    if (!isAuthenticated()) {
        select.innerHTML = '<option value="">Войдите, чтобы увидеть бронирования</option>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals/my');
        // Показываем только активные бронирования
        const activeRentals = rentals.filter(r => r.status === 'активно');
        if (!activeRentals.length) {
            select.innerHTML = '<option value="">Нет активных бронирований</option>';
            return;
        }
        select.innerHTML = activeRentals.map(r => `
            <option value="${r.id}">Бронь #${r.id} — ${r.equipmentName} (${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()})</option>
        `).join('');
    } catch (err) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadRatingOptions() {
    const select = document.getElementById('ratingEquipmentId');
    if (!select) return;
    if (!isAuthenticated()) {
        select.innerHTML = '<option value="">Войдите, чтобы оценить технику</option>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals/my');
        const completed = rentals.filter(r => r.status === 'завершено');
        if (!completed.length) {
            select.innerHTML = '<option value="">Нет завершённых аренд</option>';
            return;
        }
        select.innerHTML = completed.map(r => `
            <option value="${r.equipmentId}">${r.equipmentName} (бронь #${r.id})</option>
        `).join('');
    } catch (err) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const rentalId = parseInt(document.getElementById('paymentRentalId').value);
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const method = document.getElementById('paymentMethod').value;
        if (!rentalId || !amount) {
            alert('Выберите бронирование и укажите сумму');
            return;
        }
        try {
            await fetchAPI('payments', {
                method: 'POST',
                body: JSON.stringify({ rentalId, amount, method })
            });
            alert('Оплата внесена');
            this.reset();
            loadPaymentOptions();
            loadMyRentals();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });
}

const ratingForm = document.getElementById('ratingForm');
if (ratingForm) {
    ratingForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const equipmentId = parseInt(document.getElementById('ratingEquipmentId').value);
        const rating = parseInt(document.getElementById('ratingValue').value);
        if (!equipmentId || rating < 1 || rating > 5) {
            alert('Выберите технику и укажите оценку от 1 до 5');
            return;
        }
        try {
            await fetchAPI(`equipmentratings/rate?equipmentId=${equipmentId}&rating=${rating}`, { method: 'POST' });
            alert('Спасибо за оценку!');
            this.reset();
            loadRatingOptions();
            loadCatalog();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });
}

// ============================================================
// 8. Аналитика
// ============================================================
async function loadAnalytics() {
    const topContainer = document.getElementById('topRated');
    const overdueContainer = document.getElementById('overdueMaintenance');
    if (!topContainer || !overdueContainer) return;

    try {
        const top = await fetchAPI('equipment/top');
        if (!top.length) {
            topContainer.innerHTML = '<p class="text-muted">Нет данных</p>';
        } else {
            topContainer.innerHTML = `<ul class="list-group">${top.map(t => `
                <li class="list-group-item d-flex justify-content-between">
                    <span>${t.equipmentName || 'Техника #' + t.equipmentId}</span>
                    <span>Аренд: ${t.rentalCount}, Рейтинг: ${t.avgRating?.toFixed(1) || '0'}</span>
                </li>
            `).join('')}</ul>`;
        }

        const overdue = await fetchAPI('maintenances/overdue');
        if (!overdue.length) {
            overdueContainer.innerHTML = '<p class="text-muted">Нет просроченного ТО</p>';
        } else {
            overdueContainer.innerHTML = `<ul class="list-group">${overdue.map(m => `
                <li class="list-group-item">${m.equipment.name} — ТО закончилось ${new Date(m.endDate).toLocaleDateString()}</li>
            `).join('')}</ul>`;
        }
    } catch (err) {
        alert('Ошибка загрузки аналитики: ' + err.message);
    }

    loadForecastTypes();
    setDefaultForecastDates();
    setDefaultMyRevenueDates();
}

const revenueForm = document.getElementById('revenueForm');
if (revenueForm) {
    revenueForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const start = document.getElementById('revenueStart').value;
        const end = document.getElementById('revenueEnd').value;
        if (!start || !end) {
            alert('Укажите даты');
            return;
        }
        try {
            const data = await fetchAPI(`payments/revenue?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
            const container = document.getElementById('revenueResults');
            if (!container) return;
            if (!data.length) {
                container.innerHTML = '<p class="text-muted">Нет данных</p>';
            } else {
                container.innerHTML = `<table class="table table-sm"><thead><tr><th>Тип</th><th>Выручка</th></tr></thead><tbody>${data.map(d => `
                    <tr><td>${d.type}</td><td>${d.total}</td></tr>
                `).join('')}</tbody></table>`;
            }
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });
}

// ============================================================
// Моя техника
// ============================================================
let allMyEquipment = [];

async function loadMyEquipment() {
    const container = document.getElementById('myEquipmentList');
    if (!container) return;
    if (!isAuthenticated()) {
        container.innerHTML = '<p>Войдите, чтобы увидеть свою технику</p>';
        return;
    }
    try {
        const items = await fetchAPI('equipment/my');
        allMyEquipment = items; // сохраняем все для фильтрации
        renderMyEquipment(allMyEquipment);
    } catch (err) {
        alert('Ошибка загрузки моей техники: ' + err.message);
    }
}

function renderMyEquipment(items) {
    const container = document.getElementById('myEquipmentList');
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<p class="text-muted">Техника не найдена</p>';
        return;
    }
    container.innerHTML = `<ul class="list-group">${items.map(e => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${e.name}</strong> (${e.year})<br>
                <small>Тип: ${e.type?.name || 'не указан'}</small><br>
                <small>Ставка: ${e.hourlyRate} руб/час, Статус: ${e.status}</small><br>
                <small>Последнее ТО: ${e.lastMaintenanceDate ? new Date(e.lastMaintenanceDate).toLocaleDateString() : 'не указано'}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-warning me-1" onclick="editMyEquipment(${e.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteMyEquipment(${e.id})"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('')}</ul>`;
}

function applyMyEquipmentFilter() {
    const search = document.getElementById('myEquipmentSearch')?.value.toLowerCase().trim() || '';
    const filtered = allMyEquipment.filter(e => {
        const nameMatch = e.name.toLowerCase().includes(search);
        const typeMatch = (e.type?.name || '').toLowerCase().includes(search);
        return nameMatch || typeMatch;
    });
    renderMyEquipment(filtered);
}

function resetMyEquipmentFilter() {
    const input = document.getElementById('myEquipmentSearch');
    if (input) input.value = '';
    renderMyEquipment(allMyEquipment);
}

function showMyEquipmentForm(equip = null) {
    const modal = new bootstrap.Modal(document.getElementById('myEquipmentModal'));
    const title = document.getElementById('myEquipmentModalLabel');
    const idField = document.getElementById('myEquipmentId');
    const nameField = document.getElementById('myEquipmentName');
    const typeIdField = document.getElementById('myEquipmentTypeId');
    const yearField = document.getElementById('myEquipmentYear');
    const rateField = document.getElementById('myEquipmentRate');
    const statusField = document.getElementById('myEquipmentStatus');
    const lastMaintField = document.getElementById('myEquipmentLastMaintenanceDate');

    loadMyEquipmentTypes();

    if (equip) {
        title.textContent = 'Редактирование техники';
        idField.value = equip.id;
        nameField.value = equip.name;
        typeIdField.value = equip.typeId;
        yearField.value = equip.year;
        rateField.value = equip.hourlyRate;
        statusField.value = equip.status;
        if (equip.lastMaintenanceDate) {
            const date = new Date(equip.lastMaintenanceDate);
            lastMaintField.value = date.toISOString().split('T')[0];
        } else {
            lastMaintField.value = '';
        }
    } else {
        title.textContent = 'Добавление техники';
        idField.value = 0;
        document.getElementById('myEquipmentForm').reset();
        lastMaintField.value = '';
    }
    modal.show();
}

function hideMyEquipmentForm() {
    bootstrap.Modal.getInstance(document.getElementById('myEquipmentModal')).hide();
}

async function loadMyEquipmentTypes() {
    const select = document.getElementById('myEquipmentTypeId');
    if (!select) return;
    try {
        const types = await fetchAPI('equipmenttypes');
        select.innerHTML = '<option value="">Выберите тип</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.text = t.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Ошибка загрузки типов:', err);
    }
}

const myEquipmentForm = document.getElementById('myEquipmentForm');
if (myEquipmentForm) {
    myEquipmentForm.removeEventListener('submit', myEquipmentForm._listener);
    myEquipmentForm._listener = async function (e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('myEquipmentId').value);
        const lastMaint = document.getElementById('myEquipmentLastMaintenanceDate').value;
        const data = {
            name: document.getElementById('myEquipmentName').value.trim(),
            typeId: parseInt(document.getElementById('myEquipmentTypeId').value),
            year: parseInt(document.getElementById('myEquipmentYear').value),
            hourlyRate: parseFloat(document.getElementById('myEquipmentRate').value),
            status: document.getElementById('myEquipmentStatus').value,
            lastMaintenanceDate: lastMaint ? new Date(lastMaint).toISOString() : null
        };
        if (!data.name || isNaN(data.typeId) || isNaN(data.year) || isNaN(data.hourlyRate)) {
            alert('Заполните все обязательные поля');
            return;
        }
        try {
            if (id === 0) {
                await fetchAPI('equipment', { method: 'POST', body: JSON.stringify(data) });
            } else {
                await fetchAPI(`equipment/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) });
            }
            hideMyEquipmentForm();
            loadMyEquipment();
            loadCatalog();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    };
    myEquipmentForm.addEventListener('submit', myEquipmentForm._listener);
}

async function editMyEquipment(id) {
    try {
        const equip = await fetchAPI(`equipment/${id}`);
        showMyEquipmentForm(equip);
    } catch (err) {
        alert('Ошибка загрузки: ' + err.message);
    }
}

async function deleteMyEquipment(id) {
    if (!confirm('Удалить технику?')) return;
    try {
        await fetchAPI(`equipment/${id}`, { method: 'DELETE' });
        loadMyEquipment();
        loadCatalog();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ============================================================
// 10. Админские CRUD (Клиенты, Техника, Бронирования)
// ============================================================

// ---------- КЛИЕНТЫ ----------
let allClients = [];
let filteredClients = [];

async function loadClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;
    if (!isAdmin()) {
        container.innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const clients = await fetchAPI('clients');
        allClients = clients;
        filteredClients = [...clients];
        renderClients();
    } catch (err) {
        alert('Ошибка загрузки клиентов: ' + err.message);
    }
}

function renderClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;
    if (!filteredClients.length) {
        container.innerHTML = '<p class="text-muted">Клиентов не найдено</p>';
        return;
    }
    container.innerHTML = `<ul class="list-group">${filteredClients.map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${c.name}</strong> (${c.phone})<br>
                <small>Email: ${c.email || '—'}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-warning me-1" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('')}</ul>`;
}

function applyClientFilters() {
    const search = document.getElementById('clientSearch')?.value.toLowerCase().trim() || '';
    filteredClients = allClients.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search)
    );
    renderClients();
}

function resetClientFilters() {
    const input = document.getElementById('clientSearch');
    if (input) input.value = '';
    filteredClients = [...allClients];
    renderClients();
}

function showClientForm(client = null) {
    const modal = new bootstrap.Modal(document.getElementById('clientModal'));
    const title = document.getElementById('clientModalLabel');
    const idField = document.getElementById('clientId');
    const nameField = document.getElementById('clientName');
    const phoneField = document.getElementById('clientPhone');
    const emailField = document.getElementById('clientEmail');
    const passportField = document.getElementById('clientPassport');

    if (client) {
        title.textContent = 'Редактирование клиента';
        idField.value = client.id;
        nameField.value = client.name;
        phoneField.value = client.phone;
        emailField.value = client.email || '';
        passportField.value = client.passportData || '';
    } else {
        title.textContent = 'Добавление клиента';
        idField.value = 0;
        document.getElementById('clientForm').reset();
    }
    modal.show();
}

function hideClientForm() {
    bootstrap.Modal.getInstance(document.getElementById('clientModal')).hide();
}

const clientForm = document.getElementById('clientForm');
if (clientForm) {
    clientForm.removeEventListener('submit', clientForm._listener);
    clientForm._listener = async function (e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('clientId').value);
        const data = {
            name: document.getElementById('clientName').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            passportData: document.getElementById('clientPassport').value.trim()
        };
        if (!data.name || !data.phone) {
            alert('Имя и телефон обязательны');
            return;
        }
        try {
            if (id === 0) {
                await fetchAPI('clients', { method: 'POST', body: JSON.stringify(data) });
            } else {
                await fetchAPI(`clients/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) });
            }
            hideClientForm();
            loadClients();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    };
    clientForm.addEventListener('submit', clientForm._listener);
}

async function editClient(id) {
    try {
        const client = await fetchAPI(`clients/${id}`);
        showClientForm(client);
    } catch (err) {
        alert('Ошибка загрузки клиента: ' + err.message);
    }
}

async function deleteClient(id) {
    if (!confirm('Удалить клиента?')) return;
    try {
        await fetchAPI(`clients/${id}`, { method: 'DELETE' });
        loadClients();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ---------- ТЕХНИКА (админ) ----------
let allEquipmentAdmin = [];
let filteredEquipmentAdmin = [];

async function loadEquipment() {
    const container = document.getElementById('equipmentList');
    if (!container) return;
    if (!isAdmin()) {
        container.innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const items = await fetchAPI('equipment');
        allEquipmentAdmin = items;
        filteredEquipmentAdmin = [...items];
        renderEquipmentAdmin();
        const types = await fetchAPI('equipmenttypes');
        const typeSelect = document.getElementById('eqTypeFilter');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Все типы</option>';
            types.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.text = t.name;
                typeSelect.appendChild(opt);
            });
        }
    } catch (err) {
        alert('Ошибка загрузки техники: ' + err.message);
    }
}

function renderEquipmentAdmin() {
    const container = document.getElementById('equipmentList');
    if (!container) return;
    if (!filteredEquipmentAdmin.length) {
        container.innerHTML = '<p class="text-muted">Техника не найдена</p>';
        return;
    }
    container.innerHTML = `<ul class="list-group">${filteredEquipmentAdmin.map(e => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${e.name}</strong> (${e.year})<br>
                <small>Ставка: ${e.hourlyRate} руб/час, Статус: ${e.status}</small><br>
                <small>Последнее ТО: ${e.lastMaintenanceDate ? new Date(e.lastMaintenanceDate).toLocaleDateString() : 'не указано'}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-warning me-1" onclick="editEquipment(${e.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteEquipment(${e.id})"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('')}</ul>`;
}

function applyEquipmentFilters() {
    const search = document.getElementById('eqSearch')?.value.toLowerCase().trim() || '';
    const typeId = document.getElementById('eqTypeFilter')?.value || '';
    const status = document.getElementById('eqStatusFilter')?.value || '';
    filteredEquipmentAdmin = allEquipmentAdmin.filter(e => {
        let match = true;
        if (search) match = match && e.name.toLowerCase().includes(search);
        if (typeId) match = match && e.typeId == typeId;
        if (status) match = match && e.status === status;
        return match;
    });
    renderEquipmentAdmin();
}

function resetEquipmentFilters() {
    const search = document.getElementById('eqSearch');
    const type = document.getElementById('eqTypeFilter');
    const status = document.getElementById('eqStatusFilter');
    if (search) search.value = '';
    if (type) type.value = '';
    if (status) status.value = '';
    filteredEquipmentAdmin = [...allEquipmentAdmin];
    renderEquipmentAdmin();
}

function showEquipmentForm(equip = null) {
    const modal = new bootstrap.Modal(document.getElementById('equipmentModalAdmin'));
    const title = document.getElementById('equipmentModalAdminLabel');
    const idField = document.getElementById('equipmentId');
    const nameField = document.getElementById('equipmentName');
    const typeIdField = document.getElementById('equipmentTypeId');
    const yearField = document.getElementById('equipmentYear');
    const rateField = document.getElementById('equipmentRate');
    const statusField = document.getElementById('equipmentStatus');
    const lastMaintField = document.getElementById('equipmentLastMaintenanceDate');

    // Загружаем типы в выпадающий список
    loadEquipmentTypesForAdmin();

    if (equip) {
        title.textContent = 'Редактирование техники';
        idField.value = equip.id;
        nameField.value = equip.name;
        typeIdField.value = equip.typeId;
        yearField.value = equip.year;
        rateField.value = equip.hourlyRate;
        statusField.value = equip.status;
        if (equip.lastMaintenanceDate) {
            const date = new Date(equip.lastMaintenanceDate);
            lastMaintField.value = date.toISOString().split('T')[0];
        } else {
            lastMaintField.value = '';
        }
    } else {
        title.textContent = 'Добавление техники';
        idField.value = 0;
        document.getElementById('equipmentForm').reset();
        lastMaintField.value = '';
    }
    modal.show();
}

function hideEquipmentForm() {
    bootstrap.Modal.getInstance(document.getElementById('equipmentModalAdmin')).hide();
}

const equipmentForm = document.getElementById('equipmentForm');
if (equipmentForm) {
    equipmentForm.removeEventListener('submit', equipmentForm._listener);
    equipmentForm._listener = async function (e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('equipmentId').value);
        const lastMaint = document.getElementById('equipmentLastMaintenanceDate').value;
        const data = {
            name: document.getElementById('equipmentName').value.trim(),
            typeId: parseInt(document.getElementById('equipmentTypeId').value),
            year: parseInt(document.getElementById('equipmentYear').value),
            hourlyRate: parseFloat(document.getElementById('equipmentRate').value),
            status: document.getElementById('equipmentStatus').value,
            lastMaintenanceDate: lastMaint ? new Date(lastMaint).toISOString() : null
        };
        if (!data.name || isNaN(data.typeId) || isNaN(data.year) || isNaN(data.hourlyRate)) {
            alert('Заполните все обязательные поля');
            return;
        }
        try {
            if (id === 0) {
                await fetchAPI('equipment', { method: 'POST', body: JSON.stringify(data) });
            } else {
                await fetchAPI(`equipment/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) });
            }
            hideEquipmentForm();
            loadEquipment();
            loadCatalog();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    };
    equipmentForm.addEventListener('submit', equipmentForm._listener);
}

async function editEquipment(id) {
    try {
        const equip = await fetchAPI(`equipment/${id}`);
        showEquipmentForm(equip);
    } catch (err) {
        alert('Ошибка загрузки: ' + err.message);
    }
}

async function deleteEquipment(id) {
    if (!confirm('Удалить технику?')) return;
    try {
        await fetchAPI(`equipment/${id}`, { method: 'DELETE' });
        loadEquipment();
        loadCatalog();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ---------- БРОНИРОВАНИЯ (админ) ----------
let allRentals = [];
let filteredRentals = [];

async function loadRentals() {
    const container = document.getElementById('rentalsList');
    if (!container) return;
    if (!isAdmin()) {
        container.innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals');
        allRentals = rentals;
        filteredRentals = [...rentals];
        renderRentals();
    } catch (err) {
        alert('Ошибка загрузки бронирований: ' + err.message);
    }
}

function renderRentals() {
    const container = document.getElementById('rentalsList');
    if (!container) return;
    if (!filteredRentals.length) {
        container.innerHTML = '<p class="text-muted">Бронирований не найдено</p>';
        return;
    }
    container.innerHTML = `<ul class="list-group">${filteredRentals.map(r => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>Бронь #${r.id}</strong> — клиент: ${r.clientName} (${r.clientId}), техника: ${r.equipmentName} (${r.equipmentId})<br>
                <small>С ${new Date(r.startDate).toLocaleString()} по ${new Date(r.endDate).toLocaleString()}</small><br>
                <span class="badge bg-secondary">Статус: ${r.status}</span>
                <span class="badge bg-success">Стоимость: ${r.totalCost} руб</span>
            </div>
            <div>
                <button class="btn btn-sm btn-warning me-1" onclick="editRental(${r.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteRental(${r.id})"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('')}</ul>`;
}

function applyRentalFilters() {
    const search = document.getElementById('rentalSearch')?.value.toLowerCase().trim() || '';
    const status = document.getElementById('rentalStatusFilter')?.value || '';
    const dateFrom = document.getElementById('rentalDateFrom')?.value || '';
    const dateTo = document.getElementById('rentalDateTo')?.value || '';
    filteredRentals = allRentals.filter(r => {
        let match = true;
        if (search) {
            match = match && (r.clientName.toLowerCase().includes(search) || r.equipmentName.toLowerCase().includes(search));
        }
        if (status) match = match && r.status === status;
        if (dateFrom) {
            const d = new Date(r.startDate);
            const filterDate = new Date(dateFrom);
            match = match && d >= filterDate;
        }
        if (dateTo) {
            const d = new Date(r.endDate);
            const filterDate = new Date(dateTo);
            match = match && d <= filterDate;
        }
        return match;
    });
    renderRentals();
}

function resetRentalFilters() {
    const search = document.getElementById('rentalSearch');
    const status = document.getElementById('rentalStatusFilter');
    const from = document.getElementById('rentalDateFrom');
    const to = document.getElementById('rentalDateTo');
    if (search) search.value = '';
    if (status) status.value = '';
    if (from) from.value = '';
    if (to) to.value = '';
    filteredRentals = [...allRentals];
    renderRentals();
}

function showRentalForm(rental = null) {
    const modal = new bootstrap.Modal(document.getElementById('rentalModal'));
    const title = document.getElementById('rentalModalLabel');
    const idField = document.getElementById('rentalId');
    const clientIdField = document.getElementById('rentalClientId');
    const equipmentIdField = document.getElementById('rentalEquipmentId');
    const startField = document.getElementById('rentalStart');
    const endField = document.getElementById('rentalEnd');
    const statusField = document.getElementById('rentalStatus');

    if (rental) {
        title.textContent = 'Редактирование бронирования';
        idField.value = rental.id;
        clientIdField.value = rental.clientId;
        equipmentIdField.value = rental.equipmentId;
        startField.value = new Date(rental.startDate).toISOString().slice(0, 16);
        endField.value = new Date(rental.endDate).toISOString().slice(0, 16);
        statusField.value = rental.status;
    } else {
        title.textContent = 'Создание бронирования';
        idField.value = 0;
        document.getElementById('rentalForm').reset();
        statusField.value = 'активно';
    }
    modal.show();
}

function hideRentalForm() {
    bootstrap.Modal.getInstance(document.getElementById('rentalModal')).hide();
}

const rentalForm = document.getElementById('rentalForm');
if (rentalForm) {
    rentalForm.removeEventListener('submit', rentalForm._listener);
    rentalForm._listener = async function (e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('rentalId').value);
        const data = {
            clientId: parseInt(document.getElementById('rentalClientId').value),
            equipmentId: parseInt(document.getElementById('rentalEquipmentId').value),
            startDate: new Date(document.getElementById('rentalStart').value).toISOString(),
            endDate: new Date(document.getElementById('rentalEnd').value).toISOString(),
            status: document.getElementById('rentalStatus').value
        };
        if (isNaN(data.clientId) || isNaN(data.equipmentId) || !data.startDate || !data.endDate) {
            alert('Заполните все поля');
            return;
        }
        try {
            if (id === 0) {
                const createData = {
                    clientId: data.clientId,
                    equipmentId: data.equipmentId,
                    startDate: data.startDate,
                    endDate: data.endDate
                };
                await fetchAPI('rentals', { method: 'POST', body: JSON.stringify(createData) });
            } else {
                const existing = await fetchAPI(`rentals/${id}`);
                const updated = { ...existing, ...data };
                await fetchAPI(`rentals/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
            }
            hideRentalForm();
            loadRentals();
            loadCatalog();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    };
    rentalForm.addEventListener('submit', rentalForm._listener);
}

async function editRental(id) {
    try {
        const rental = await fetchAPI(`rentals/${id}`);
        showRentalForm(rental);
    } catch (err) {
        alert('Ошибка загрузки бронирования: ' + err.message);
    }
}

async function deleteRental(id) {
    if (!confirm('Удалить бронирование?')) return;
    try {
        await fetchAPI(`rentals/${id}`, { method: 'DELETE' });
        loadRentals();
        loadCatalog();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ============================================================
// 11. Прогнозирование спроса (Хольта-Уинтерса)
// ============================================================
async function loadForecastTypes() {
    const select = document.getElementById('forecastType');
    if (!select) return;
    try {
        const types = await fetchAPI('equipmenttypes');
        select.innerHTML = '<option value="">Все типы</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.text = t.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Ошибка загрузки типов для прогноза:', e);
    }
}

function setDefaultForecastDates() {
    const start = document.getElementById('forecastStart');
    const end = document.getElementById('forecastEnd');
    if (start && end) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const in30Days = new Date(now);
        in30Days.setDate(now.getDate() + 30);
        start.value = tomorrow.toISOString().split('T')[0];
        end.value = in30Days.toISOString().split('T')[0];
    }
}

const forecastForm = document.getElementById('forecastForm');
if (forecastForm) {
    forecastForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const start = document.getElementById('forecastStart').value;
        const end = document.getElementById('forecastEnd').value;
        const typeId = document.getElementById('forecastType').value;
        const alpha = parseFloat(document.getElementById('forecastAlpha').value) || 0.3;
        const beta = parseFloat(document.getElementById('forecastBeta').value) || 0.1;
        const gamma = parseFloat(document.getElementById('forecastGamma').value) || 0.3;

        if (!start || !end) {
            alert('Укажите даты');
            return;
        }

        try {
            let url = `forecast/holt-winters?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
            url += `&alpha=${alpha}&beta=${beta}&gamma=${gamma}`;
            if (typeId) url += `&equipmentTypeId=${typeId}`;

            const data = await fetchAPI(url);
            const tableContainer = document.getElementById('forecastTable');

            if (!data || !data.length) {
                tableContainer.innerHTML = '<p class="text-muted">Нет данных для прогноза</p>';
                return;
            }

            let tableHtml = `<table class="table table-sm table-striped"><thead><tr><th>Дата</th><th>Прогноз аренд</th></tr></thead><tbody>`;
            data.forEach(item => {
                const date = new Date(item.date).toLocaleDateString();
                tableHtml += `<tr><td>${date}</td><td>${item.predictedRentals.toFixed(1)}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            tableContainer.innerHTML = tableHtml;

            const ctx = document.getElementById('forecastChart').getContext('2d');
            if (window.forecastChartInstance) {
                window.forecastChartInstance.destroy();
            }
            const labels = data.map(item => new Date(item.date).toLocaleDateString());
            const values = data.map(item => item.predictedRentals);
            window.forecastChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Прогнозируемое количество аренд',
                        data: values,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        x: { display: true, title: { display: true, text: 'Дата' } },
                        y: { display: true, title: { display: true, text: 'Количество аренд' }, beginAtZero: true }
                    }
                }
            });
        } catch (err) {
            alert('Ошибка загрузки прогноза: ' + err.message);
        }
    });
}


// ============================================================
// Моя выручка (для владельца техники)
// ============================================================
const myRevenueForm = document.getElementById('myRevenueForm');
if (myRevenueForm) {
    // Удалим возможные старые обработчики, чтобы избежать дублирования
    myRevenueForm.removeEventListener('submit', myRevenueForm._listener);
    myRevenueForm._listener = async function (e) {
        e.preventDefault(); // гарантированно отключаем стандартную отправку
        console.log('📊 Запрос моей выручки'); // для отладки

        const start = document.getElementById('myRevenueStart').value;
        const end = document.getElementById('myRevenueEnd').value;
        const groupBy = document.getElementById('myRevenueGroup').value;

        if (!start || !end) {
            alert('Укажите даты');
            return;
        }

        try {
            const data = await fetchAPI(`payments/revenue/my?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&groupBy=${groupBy}`);
            const container = document.getElementById('myRevenueResults');
            if (!container) return;
            if (!data.length) {
                container.innerHTML = '<p class="text-muted">Нет данных</p>';
                return;
            }
            let tableHtml = `<table class="table table-sm"><thead><tr><th>${groupBy === 'equipment' ? 'Название техники' : 'Тип'}</th><th>Выручка</th></tr></thead><tbody>`;
            data.forEach(item => {
                const name = groupBy === 'equipment' ? item.equipmentName : item.type;
                tableHtml += `<tr><td>${name}</td><td>${item.total.toFixed(2)}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    };
    myRevenueForm.addEventListener('submit', myRevenueForm._listener);
}

// Установка дат по умолчанию для моей выручки
function setDefaultMyRevenueDates() {
    const start = document.getElementById('myRevenueStart');
    const end = document.getElementById('myRevenueEnd');
    if (start && end) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start.value = firstDayOfMonth.toISOString().split('T')[0];
        end.value = today.toISOString().split('T')[0];
    }
}

// ============================================================
// Загрузка типов для админской формы техники
// ============================================================
async function loadEquipmentTypesForAdmin() {
    const select = document.getElementById('equipmentTypeId');
    if (!select) return;
    try {
        const types = await fetchAPI('equipmenttypes');
        select.innerHTML = '<option value="">Выберите тип</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.text = t.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Ошибка загрузки типов для админки:', e);
    }
}

// ============================================================
// Управление ТО (админ)
// ============================================================
let allMaintenances = [];
let allEquipmentForMaintenance = [];

async function loadMaintenances() {
    const container = document.getElementById('maintenancesList');
    if (!container) return;
    if (!isAdmin()) {
        container.innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const [maintenances, equipment] = await Promise.all([
            fetchAPI('maintenances'),
            fetchAPI('equipment')
        ]);
        allMaintenances = maintenances;
        allEquipmentForMaintenance = equipment;
        renderMaintenances(allMaintenances);
        // Заполняем выпадающие списки с техникой
        const select = document.getElementById('maintenanceEquipmentId');
        if (select) {
            select.innerHTML = '<option value="">Выберите технику</option>';
            equipment.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.text = `${e.name} (ID: ${e.id})`;
                select.appendChild(opt);
            });
        }
        // Заполняем фильтр по технике
        const filterSelect = document.getElementById('maintenanceEquipmentFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Все техника</option>';
            equipment.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.text = `${e.name} (ID: ${e.id})`;
                filterSelect.appendChild(opt);
            });
        }
    } catch (err) {
        alert('Ошибка загрузки ТО: ' + err.message);
    }
}

function renderMaintenances(items) {
    const container = document.getElementById('maintenancesList');
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<p class="text-muted">Записей ТО не найдено</p>';
        return;
    }
    container.innerHTML = `<ul class="list-group">${items.map(m => {
        const equipmentName = allEquipmentForMaintenance.find(e => e.id === m.equipmentId)?.name || 'Техника #' + m.equipmentId;
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${equipmentName}</strong><br>
                    <small>С ${new Date(m.startDate).toLocaleString()} по ${new Date(m.endDate).toLocaleString()}</small><br>
                    <span class="badge bg-secondary">${m.type}</span>
                    <span class="badge bg-success">${m.cost} руб</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-warning me-1" onclick="editMaintenance(${m.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMaintenance(${m.id})"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `;
    }).join('')}</ul>`;
}

function applyMaintenanceFilters() {
    const equipFilter = document.getElementById('maintenanceEquipmentFilter').value;
    const typeFilter = document.getElementById('maintenanceTypeFilter').value;
    const dateFrom = document.getElementById('maintenanceDateFrom').value;
    const dateTo = document.getElementById('maintenanceDateTo').value;
    let filtered = allMaintenances;
    if (equipFilter) filtered = filtered.filter(m => m.equipmentId == equipFilter);
    if (typeFilter) filtered = filtered.filter(m => m.type === typeFilter);
    if (dateFrom) {
        const from = new Date(dateFrom);
        filtered = filtered.filter(m => new Date(m.startDate) >= from);
    }
    if (dateTo) {
        const to = new Date(dateTo);
        filtered = filtered.filter(m => new Date(m.endDate) <= to);
    }
    renderMaintenances(filtered);
}

function resetMaintenanceFilters() {
    document.getElementById('maintenanceEquipmentFilter').value = '';
    document.getElementById('maintenanceTypeFilter').value = '';
    document.getElementById('maintenanceDateFrom').value = '';
    document.getElementById('maintenanceDateTo').value = '';
    renderMaintenances(allMaintenances);
}

function showMaintenanceForm(maintenance = null) {
    const modal = new bootstrap.Modal(document.getElementById('maintenanceModal'));
    const title = document.getElementById('maintenanceModalLabel');
    const idField = document.getElementById('maintenanceId');
    const equipField = document.getElementById('maintenanceEquipmentId');
    const startField = document.getElementById('maintenanceStart');
    const endField = document.getElementById('maintenanceEnd');
    const typeField = document.getElementById('maintenanceType');
    const costField = document.getElementById('maintenanceCost');

    // Загружаем список техники, если он пуст
    if (allEquipmentForMaintenance.length === 0) {
        fetchAPI('equipment').then(data => {
            allEquipmentForMaintenance = data;
            // перезаполняем select
            const select = document.getElementById('maintenanceEquipmentId');
            if (select) {
                select.innerHTML = '<option value="">Выберите технику</option>';
                data.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e.id;
                    opt.text = `${e.name} (ID: ${e.id})`;
                    select.appendChild(opt);
                });
            }
        });
    }

    if (maintenance) {
        title.textContent = 'Редактирование ТО';
        idField.value = maintenance.id;
        equipField.value = maintenance.equipmentId;
        // форматируем даты для datetime-local
        startField.value = new Date(maintenance.startDate).toISOString().slice(0, 16);
        endField.value = new Date(maintenance.endDate).toISOString().slice(0, 16);
        typeField.value = maintenance.type;
        costField.value = maintenance.cost;
    } else {
        title.textContent = 'Добавление ТО';
        idField.value = 0;
        document.getElementById('maintenanceForm').reset();
    }
    modal.show();
}

function hideMaintenanceForm() {
    bootstrap.Modal.getInstance(document.getElementById('maintenanceModal')).hide();
}

const maintenanceForm = document.getElementById('maintenanceForm');
if (maintenanceForm) {
    maintenanceForm.removeEventListener('submit', maintenanceForm._listener);
    maintenanceForm._listener = async function (e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('maintenanceId').value);
        const data = {
            equipmentId: parseInt(document.getElementById('maintenanceEquipmentId').value),
            startDate: new Date(document.getElementById('maintenanceStart').value).toISOString(),
            endDate: new Date(document.getElementById('maintenanceEnd').value).toISOString(),
            type: document.getElementById('maintenanceType').value,
            cost: parseFloat(document.getElementById('maintenanceCost').value)
        };
        if (!data.equipmentId || !data.startDate || !data.endDate || isNaN(data.cost)) {
            alert('Заполните все обязательные поля');
            return;
        }
        try {
            if (id === 0) {
                await fetchAPI('maintenances', { method: 'POST', body: JSON.stringify(data) });
            } else {
                await fetchAPI(`maintenances/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) });
            }
            hideMaintenanceForm();
            loadMaintenances();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    };
    maintenanceForm.addEventListener('submit', maintenanceForm._listener);
}

async function editMaintenance(id) {
    try {
        const maintenance = await fetchAPI(`maintenances/${id}`);
        showMaintenanceForm(maintenance);
    } catch (err) {
        alert('Ошибка загрузки ТО: ' + err.message);
    }
}

async function deleteMaintenance(id) {
    if (!confirm('Удалить запись ТО?')) return;
    try {
        await fetchAPI(`maintenances/${id}`, { method: 'DELETE' });
        loadMaintenances();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ============================================================
// 12. Инициализация
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    currentPageName = getCurrentPage();
    updateAuthUI();
    loadPageData();

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') applyFilters();
        });
    }

    const authToggle = document.getElementById('authToggle');
    if (authToggle) {
        authToggle.addEventListener('click', toggleAuthMode);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    console.log('Приложение инициализировано. Страница:', currentPageName);
});