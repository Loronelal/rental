// ============================================================
// 1. Конфигурация и базовые функции
// ============================================================
const API_BASE = '/api';

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

    // Если статус 204 (No Content) — возвращаем null без парсинга
    if (response.status === 204) {
        return null;
    }

    // Если ответ не успешный — читаем текст ошибки
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }

    // Проверяем, есть ли тело ответа
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) === 0) {
        return null;
    }

    // Пытаемся парсить JSON
    try {
        return await response.json();
    } catch (e) {
        // Если не удалось распарсить, возвращаем null
        return null;
    }
}

// ============================================================
// 2. Управление аутентификацией (UI)
// ============================================================
function updateAuthUI() {
    const token = getToken();
    const userStatus = document.getElementById('userStatus');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (token) {
        userStatus.innerText = 'Пользователь';
        loginBtn.classList.add('d-none');
        registerBtn.classList.add('d-none');
        logoutBtn.classList.remove('d-none');
    } else {
        userStatus.innerText = 'Гость';
        loginBtn.classList.remove('d-none');
        registerBtn.classList.remove('d-none');
        logoutBtn.classList.add('d-none');
    }
    // Скрыть/показать админские вкладки
    const showAdmin = isAdmin();
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = showAdmin ? '' : 'none');
}

// Модалка аутентификации
let authMode = 'login'; // 'login' or 'register'

function toggleAuthMode() {
    const isLogin = authMode === 'login';
    authMode = isLogin ? 'register' : 'login';
    document.getElementById('authModalLabel').innerText = isLogin ? 'Регистрация' : 'Вход';
    document.getElementById('registerFields').style.display = isLogin ? 'block' : 'none';
    document.getElementById('authToggle').innerText = isLogin ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
    document.querySelector('#authForm button').innerText = isLogin ? 'Зарегистрироваться' : 'Войти';
}

window.openAuthModal = function (mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    document.getElementById('authModalLabel').innerText = isLogin ? 'Вход' : 'Регистрация';
    document.getElementById('registerFields').style.display = isLogin ? 'none' : 'block';
    document.getElementById('authToggle').innerText = isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    document.querySelector('#authForm button').innerText = isLogin ? 'Войти' : 'Зарегистрироваться';
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
};

document.getElementById('authForm').addEventListener('submit', async function (e) {
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
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            updateAuthUI();
            loadCatalog();
            loadMyRentals();
            loadMyEquipment();
            loadAnalytics();
            loadClients();
            loadEquipment();
            loadRentals();
        } else {
            alert('Регистрация успешна! Теперь войдите.');
            openAuthModal('login');
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
});

function logout() {
    removeToken();
    updateAuthUI();
    loadCatalog();
    loadMyRentals();
    loadMyEquipment();
    loadAnalytics();
    loadClients();
    loadEquipment();
    loadRentals();
}

// ============================================================
// 3. Загрузка данных для фильтров
// ============================================================
async function loadFilterTypes() {
    try {
        const types = await fetchAPI('equipmenttypes');
        const select = document.getElementById('filterType');
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

// ============================================================
// 4. Каталог (загрузка, фильтрация, сортировка, пагинация)
// ============================================================
let allEquipment = [];
let filteredEquipment = [];
let currentPage = 1;
const pageSize = 6;

async function loadCatalog() {
    try {
        const items = await fetchAPI('equipment');
        allEquipment = items;
        applyFilters();
    } catch (err) {
        alert('Ошибка загрузки каталога: ' + err.message);
    }
}

function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
    const typeId = document.getElementById('filterType').value;
    const priceFrom = parseFloat(document.getElementById('priceFrom').value) || 0;
    const priceTo = parseFloat(document.getElementById('priceTo').value) || Infinity;
    const yearFrom = parseInt(document.getElementById('filterYear').value) || 0;
    const status = document.getElementById('filterStatus').value;

    filteredEquipment = allEquipment.filter(e => {
        // Поиск по названию и типу
        if (searchText) {
            const nameMatch = e.name.toLowerCase().includes(searchText);
            const typeName = e.type?.name || '';
            const typeMatch = typeName.toLowerCase().includes(searchText);
            if (!nameMatch && !typeMatch) return false;
        }
        // Тип
        if (typeId && e.typeId != typeId) return false;
        // Цена
        const rate = e.hourlyRate || 0;
        if (rate < priceFrom || rate > priceTo) return false;
        // Год
        if (yearFrom && e.year < yearFrom) return false;
        // Статус
        if (status && e.status !== status) return false;
        return true;
    });

    // Сортировка
    const sortBy = document.getElementById('sortSelect').value;
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
    countDisplay.innerText = `Найдено: ${filteredEquipment.length} единиц`;

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredEquipment.length);
    const pageItems = filteredEquipment.slice(start, end);

    if (pageItems.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">Техника не найдена</div>`;
    } else {
        container.innerHTML = pageItems.map(e => {
            const statusBadge = e.status === 'доступен' ? 'bg-success' :
                e.status === 'в аренде' ? 'bg-danger' : 'bg-warning';
            const statusText = e.status === 'доступен' ? 'Доступен' :
                e.status === 'в аренде' ? 'В аренде' : 'На обслуживании';
            const disabled = e.status !== 'доступен' ? 'disabled' : '';
            const rating = e.rating?.avgRating?.toFixed(1) || '0';
            const rentalCount = e.rating?.rentalCount || 0;
            return `
                <div class="col-xl-4 col-lg-6 col-md-6 mb-4">
                    <div class="equipment-card">
                        <img src="https://via.placeholder.com/400x200/0d6efd/ffffff?text=${encodeURIComponent(e.name)}" class="card-img-top" alt="${e.name}">
                        <div class="card-body">
                            <h5 class="card-title">${e.name}</h5>
                            <div class="card-text">
                                <p><i class="fas fa-calendar-alt"></i> Год: ${e.year}</p>
                                <p><i class="fas fa-tachometer-alt"></i> Статус: <span class="badge ${statusBadge}">${statusText}</span></p>
                                <p><i class="fas fa-star"></i> Рейтинг: ${rating} (${rentalCount} аренд)</p>
                            </div>
                            <div class="price-block">
                                <span class="price">${e.hourlyRate || 0} ₽ <small>/ час</small></span>
                            </div>
                            <div class="btn-group-card">
                                <button class="btn btn-outline-primary btn-sm" onclick="showDetails(${e.id})">Подробнее</button>
                                <button class="btn btn-success btn-sm" ${disabled} onclick="quickBook(${e.id})">Заказать</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Пагинация
    const totalPages = Math.ceil(filteredEquipment.length / pageSize);
    const pagination = document.getElementById('pagination');
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
// 5. Детали и бронирование
// ============================================================
async function showDetails(id) {
    try {
        const item = await fetchAPI(`equipment/${id}`);
        const body = document.getElementById('equipmentModalBody');
        body.innerHTML = `
            <h4>${item.name}</h4>
            <p><strong>Год:</strong> ${item.year} · <strong>Ставка:</strong> ${item.hourlyRate} руб/час</p>
            <p><strong>Статус:</strong> ${item.status}</p>
            <p><strong>Тип:</strong> ${item.typeName || '—'}</p>
            <p><strong>Рейтинг:</strong> ${item.avgRating?.toFixed(1) || '0'} (${item.rentalCount || 0} аренд)</p>
            <p><strong>Владелец:</strong> ${item.ownerName || '—'}</p>
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
        document.getElementById('detailRentalForm').addEventListener('submit', async function (e) {
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
    if (!isAuthenticated()) {
        document.getElementById('profileRentals').innerHTML = '<p>Войдите, чтобы увидеть свои бронирования</p>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals/my');
        const container = document.getElementById('profileRentals');
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
                <div><span class="badge bg-secondary">Оплачено: 0 руб</span></div>
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
// 7. Оплата и оценка
// ============================================================
async function loadPaymentOptions() {
    const select = document.getElementById('paymentRentalId');
    if (!isAuthenticated()) {
        select.innerHTML = '<option value="">Войдите, чтобы увидеть бронирования</option>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals/my');
        if (!rentals.length) {
            select.innerHTML = '<option value="">Нет бронирований</option>';
            return;
        }
        select.innerHTML = rentals.map(r => `
            <option value="${r.id}">Бронь #${r.id} — ${r.equipmentName} (${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()})</option>
        `).join('');
    } catch (err) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadRatingOptions() {
    const select = document.getElementById('ratingEquipmentId');
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

document.getElementById('paymentForm').addEventListener('submit', async function (e) {
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

document.getElementById('ratingForm').addEventListener('submit', async function (e) {
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

// ============================================================
// 8. Аналитика
// ============================================================
async function loadAnalytics() {
    try {
        const top = await fetchAPI('equipment/top');
        const topContainer = document.getElementById('topRated');
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
        const overdueContainer = document.getElementById('overdueMaintenance');
        if (!overdue.length) {
            overdueContainer.innerHTML = '<p class="text-muted">Нет просроченного ТО</p>';
        } else {
            overdueContainer.innerHTML = `<ul class="list-group">${overdue.map(m => `
                <li class="list-group-item">Техника #${m.equipmentId} (ТО закончилось: ${new Date(m.endDate).toLocaleDateString()})</li>
            `).join('')}</ul>`;
        }
    } catch (err) {
        alert('Ошибка загрузки аналитики: ' + err.message);
    }
}

document.getElementById('revenueForm').addEventListener('submit', async function (e) {
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

// ============================================================
// 9. Моя техника
// ============================================================
async function loadMyEquipment() {
    if (!isAuthenticated()) {
        document.getElementById('myEquipmentList').innerHTML = '<p>Войдите, чтобы увидеть свою технику</p>';
        return;
    }
    try {
        const items = await fetchAPI('equipment/my');
        const container = document.getElementById('myEquipmentList');
        if (!items.length) {
            container.innerHTML = '<p class="text-muted">Вы ещё не добавили ни одной единицы техники</p>';
            return;
        }
        container.innerHTML = `<ul class="list-group">${items.map(e => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${e.name}</strong> (${e.year})<br>
                    <small>Ставка: ${e.hourlyRate} руб/час, Статус: ${e.status}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-warning me-1" onclick="editMyEquipment(${e.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMyEquipment(${e.id})"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('')}</ul>`;
    } catch (err) {
        alert('Ошибка загрузки моей техники: ' + err.message);
    }
}

function showMyEquipmentForm(equip = null) {
    const container = document.getElementById('myEquipmentFormContainer');
    container.style.display = 'block';
    loadMyEquipmentTypes();
    if (equip) {
        document.getElementById('myEquipmentFormTitle').textContent = 'Редактирование техники';
        document.getElementById('myEquipmentId').value = equip.id;
        document.getElementById('myEquipmentName').value = equip.name;
        document.getElementById('myEquipmentTypeId').value = equip.typeId;
        document.getElementById('myEquipmentYear').value = equip.year;
        document.getElementById('myEquipmentRate').value = equip.hourlyRate;
        document.getElementById('myEquipmentStatus').value = equip.status;
    } else {
        document.getElementById('myEquipmentFormTitle').textContent = 'Добавление техники';
        document.getElementById('myEquipmentId').value = 0;
        document.getElementById('myEquipmentForm').reset();
    }
}

function hideMyEquipmentForm() {
    document.getElementById('myEquipmentFormContainer').style.display = 'none';
}

async function loadMyEquipmentTypes() {
    try {
        const types = await fetchAPI('equipmenttypes');
        const select = document.getElementById('myEquipmentTypeId');
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

document.getElementById('myEquipmentForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('myEquipmentId').value);
    const data = {
        name: document.getElementById('myEquipmentName').value.trim(),
        typeId: parseInt(document.getElementById('myEquipmentTypeId').value),
        year: parseInt(document.getElementById('myEquipmentYear').value),
        hourlyRate: parseFloat(document.getElementById('myEquipmentRate').value),
        status: document.getElementById('myEquipmentStatus').value
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
});

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
async function loadClients() {
    if (!isAdmin()) {
        document.getElementById('clientsList').innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const clients = await fetchAPI('clients');
        const container = document.getElementById('clientsList');
        if (!clients.length) {
            container.innerHTML = '<p class="text-muted">Клиентов пока нет</p>';
            return;
        }
        container.innerHTML = `<ul class="list-group">${clients.map(c => `
            <li class="list-group-item">
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
    } catch (err) {
        alert('Ошибка загрузки клиентов: ' + err.message);
    }
}

function showClientForm(client = null) {
    const container = document.getElementById('clientFormContainer');
    container.style.display = 'block';
    if (client) {
        document.getElementById('clientFormTitle').textContent = 'Редактирование клиента';
        document.getElementById('clientId').value = client.id;
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientPhone').value = client.phone;
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientPassport').value = client.passportData || '';
    } else {
        document.getElementById('clientFormTitle').textContent = 'Добавление клиента';
        document.getElementById('clientId').value = 0;
        document.getElementById('clientForm').reset();
    }
}

function hideClientForm() {
    document.getElementById('clientFormContainer').style.display = 'none';
}

document.getElementById('clientForm').addEventListener('submit', async function (e) {
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
});

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
async function loadEquipment() {
    if (!isAdmin()) {
        document.getElementById('equipmentList').innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const items = await fetchAPI('equipment');
        const container = document.getElementById('equipmentList');
        if (!items.length) {
            container.innerHTML = '<p class="text-muted">Техники пока нет</p>';
            return;
        }
        container.innerHTML = `<ul class="list-group">${items.map(e => `
            <li class="list-group-item">
                <div>
                    <strong>${e.name}</strong> (${e.year})<br>
                    <small>Ставка: ${e.hourlyRate} руб/час, Статус: ${e.status}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-warning me-1" onclick="editEquipment(${e.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEquipment(${e.id})"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('')}</ul>`;
    } catch (err) {
        alert('Ошибка загрузки техники: ' + err.message);
    }
}

function showEquipmentForm(equip = null) {
    const container = document.getElementById('equipmentFormContainer');
    container.style.display = 'block';
    if (equip) {
        document.getElementById('equipmentFormTitle').textContent = 'Редактирование техники';
        document.getElementById('equipmentId').value = equip.id;
        document.getElementById('equipmentName').value = equip.name;
        document.getElementById('equipmentTypeId').value = equip.typeId;
        document.getElementById('equipmentYear').value = equip.year;
        document.getElementById('equipmentRate').value = equip.hourlyRate;
        document.getElementById('equipmentStatus').value = equip.status;
    } else {
        document.getElementById('equipmentFormTitle').textContent = 'Добавление техники';
        document.getElementById('equipmentId').value = 0;
        document.getElementById('equipmentForm').reset();
    }
}

function hideEquipmentForm() {
    document.getElementById('equipmentFormContainer').style.display = 'none';
}

document.getElementById('equipmentForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('equipmentId').value);
    const data = {
        name: document.getElementById('equipmentName').value.trim(),
        typeId: parseInt(document.getElementById('equipmentTypeId').value),
        year: parseInt(document.getElementById('equipmentYear').value),
        hourlyRate: parseFloat(document.getElementById('equipmentRate').value),
        status: document.getElementById('equipmentStatus').value
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
});

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
async function loadRentals() {
    if (!isAdmin()) {
        document.getElementById('rentalsList').innerHTML = '<p class="text-muted">Доступно только администратору</p>';
        return;
    }
    try {
        const rentals = await fetchAPI('rentals');
        const container = document.getElementById('rentalsList');
        if (!rentals.length) {
            container.innerHTML = '<p class="text-muted">Бронирований пока нет</p>';
            return;
        }
        container.innerHTML = `<ul class="list-group">${rentals.map(r => `
            <li class="list-group-item">
                <div>
                    <strong>Бронь #${r.id}</strong> — клиент ${r.clientId}, техника ${r.equipmentId}<br>
                    <small>С ${new Date(r.startDate).toLocaleString()} по ${new Date(r.endDate).toLocaleString()}</small><br>
                    <span class="badge bg-secondary">Статус: ${r.status}</span>
                    <span class="badge bg-success">Стоимость: ${r.totalCost} руб</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="deleteRental(${r.id})"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('')}</ul>`;
    } catch (err) {
        alert('Ошибка загрузки бронирований: ' + err.message);
    }
}

function showRentalForm() {
    document.getElementById('rentalFormContainer').style.display = 'block';
    document.getElementById('rentalForm').reset();
}

function hideRentalForm() {
    document.getElementById('rentalFormContainer').style.display = 'none';
}

document.getElementById('rentalForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = {
        clientId: parseInt(document.getElementById('rentalClientId').value),
        equipmentId: parseInt(document.getElementById('rentalEquipmentId').value),
        startDate: new Date(document.getElementById('rentalStart').value).toISOString(),
        endDate: new Date(document.getElementById('rentalEnd').value).toISOString()
    };
    if (isNaN(data.clientId) || isNaN(data.equipmentId) || !data.startDate || !data.endDate) {
        alert('Заполните все поля');
        return;
    }
    try {
        await fetchAPI('rentals', { method: 'POST', body: JSON.stringify(data) });
        hideRentalForm();
        loadRentals();
        loadCatalog();
    } catch (err) {
        alert('Ошибка создания бронирования: ' + err.message);
    }
});

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
// 11. Инициализация
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    updateAuthUI();

    // Загружаем каталог
    loadFilterTypes();
    loadCatalog();

    // Загружаем остальные вкладки (данные подгрузятся по мере активации)
    loadMyRentals();
    loadMyEquipment();
    loadAnalytics();
    loadClients();
    loadEquipment();
    loadRentals();

    // Сортировка
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
    // Кнопка поиска
    document.getElementById('searchInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') applyFilters();
    });

    // Подгрузка опций для оплаты и оценки при активации вкладки "Личный кабинет"
    document.getElementById('profile-tab').addEventListener('shown.bs.tab', function () {
        loadPaymentOptions();
        loadRatingOptions();
    });

    // Подгрузка типов для "Моя техника" при активации вкладки
    document.getElementById('myEquipment-tab').addEventListener('shown.bs.tab', function () {
        loadMyEquipmentTypes();
    });
});