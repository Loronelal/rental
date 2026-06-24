// ============================================================
// 1. Базовые настройки и вспомогательные функции
// ============================================================

const API_BASE = '/api';  // Если фронт и бэк на одном порту. Или укажите полный URL, например 'https://localhost:7101/api'

// Получение токена из localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Сохранение токена
function setToken(token) {
    localStorage.setItem('token', token);
}

// Удаление токена
function removeToken() {
    localStorage.removeItem('token');
}

// Проверка авторизации
function isAuthenticated() {
    return !!getToken();
}

// Универсальная функция для запросов к API (автоматически добавляет токен)
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
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }
    return response.json();
}

// ============================================================
// 2. Управление аутентификацией (UI)
// ============================================================

// Обновление интерфейса в зависимости от статуса входа
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
}

// Переключение между формами входа и регистрации
document.getElementById('authToggle').addEventListener('click', function () {
    const isLogin = this.innerText.includes('Зарегистрироваться');
    document.getElementById('authModalLabel').innerText = isLogin ? 'Регистрация' : 'Вход';
    document.getElementById('registerFields').style.display = isLogin ? 'block' : 'none';
    this.innerText = isLogin ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
    document.querySelector('#authForm button').innerText = isLogin ? 'Зарегистрироваться' : 'Войти';
});

// Обработка отправки формы аутентификации
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
            updateAuthUI();
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            loadMyRentals();   // загружаем личный кабинет
            loadAllEquipment(); // обновляем каталог (может измениться статус техники)
        } else {
            alert('Регистрация успешна! Теперь войдите.');
            document.getElementById('authToggle').click(); // переключаем на вход
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
});

// Выход
document.getElementById('logoutBtn').addEventListener('click', function () {
    removeToken();
    updateAuthUI();
    document.getElementById('profileRentals').innerHTML = '<p>Войдите, чтобы увидеть свои бронирования</p>';
    loadAllEquipment();
});

// ============================================================
// 3. Каталог техники (главная страница)
// ============================================================

// Загрузка всех единиц техники с фильтрацией
async function loadAllEquipment() {
    const typeId = document.getElementById('catalogType').value;
    const yearFrom = document.getElementById('catalogYearFrom').value;
    const priceTo = document.getElementById('catalogPriceTo').value;
    const status = document.getElementById('catalogStatus').value;

    let url = 'equipment?';
    const params = [];
    if (typeId) params.push(`typeId=${typeId}`);
    if (yearFrom) params.push(`yearFrom=${yearFrom}`);
    if (priceTo) params.push(`priceTo=${priceTo}`);
    if (status) params.push(`status=${status}`);
    url += params.join('&');

    try {
        const items = await fetchAPI(url);
        const container = document.getElementById('catalogResults');
        if (!items.length) {
            container.innerHTML = '<p class="text-muted">Техника не найдена</p>';
            return;
        }
        container.innerHTML = `<div class="row">${items.map(e => `
            <div class="col-md-4 mb-3">
                <div class="card h-100" onclick="showEquipmentDetail(${e.id})" style="cursor:pointer;">
                    <div class="card-body">
                        <h5 class="card-title">${e.name}</h5>
                        <p class="card-text">Год: ${e.year}, Ставка: ${e.hourlyRate} руб/час</p>
                        <p>Рейтинг: ${e.rating?.avgRating?.toFixed(1) || '0'} (${e.rating?.rentalCount || 0} аренд)</p>
                        <span class="badge ${e.status === 'доступен' ? 'bg-success' : 'bg-danger'}">${e.status}</span>
                    </div>
                </div>
            </div>
        `).join('')}</div>`;
    } catch (err) {
        alert('Ошибка загрузки каталога: ' + err.message);
    }
}

// Применение фильтров (вызывается по кнопке)
function applyFilters() {
    loadAllEquipment();
}

// Загрузка типов для выпадающего списка
async function loadCatalogTypes() {
    try {
        const types = await fetchAPI('equipmenttypes');
        const select = document.getElementById('catalogType');
        select.innerHTML = '<option value="">Все</option>';
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

// ============================================================
// 4. Детальное модальное окно техники и бронирование
// ============================================================

async function showEquipmentDetail(id) {
    try {
        const item = await fetchAPI(`equipment/${id}`);
        const body = document.getElementById('equipmentModalBody');
        body.innerHTML = `
            <h4>${item.name}</h4>
            <p>Год: ${item.year}, Ставка: ${item.hourlyRate} руб/час</p>
            <p>Статус: ${item.status}</p>
            <p>Тип: ${item.type?.name || '—'}</p>
            <p>Рейтинг: ${item.rating?.avgRating?.toFixed(1) || '0'} (${item.rating?.rentalCount || 0} аренд)</p>
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
                loadMyRentals();   // обновляем личный кабинет
                loadAllEquipment(); // обновляем каталог
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

// Быстрое бронирование из карточки (без открытия модалки)
async function quickRent(equipmentId, start, end) {
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
        loadMyRentals();
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// ============================================================
// 5. Личный кабинет (мои бронирования)
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
                <div>
                    <span class="badge bg-secondary">Оплачено: 0 руб</span>
                </div>
            </li>
        `).join('')}</ul>`;
    } catch (err) {
        alert('Ошибка загрузки бронирований: ' + err.message);
    }
}

// Отмена бронирования
async function cancelMyRental(id) {
    if (!confirm('Отменить бронирование?')) return;
    try {
        await fetchAPI(`rentals/${id}/cancel`, { method: 'PUT' });
        alert('Бронирование отменено');
        loadMyRentals();
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// Продление на 1 час
async function extendRental(id) {
    try {
        const result = await fetchAPI(`rentals/${id}/extend`, { method: 'PUT' });
        alert(`Бронирование продлено. Новая стоимость: ${result.newTotal} руб, новая дата окончания: ${new Date(result.newEnd).toLocaleString()}`);
        loadMyRentals();
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// ============================================================
// 6. Оплата и оценка
// ============================================================

// Форма оплаты
document.getElementById('paymentForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const rentalId = parseInt(document.getElementById('paymentRentalId').value);
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    if (!rentalId || !amount) {
        alert('Заполните все поля');
        return;
    }
    try {
        await fetchAPI('payments', {
            method: 'POST',
            body: JSON.stringify({ rentalId, amount, method })
        });
        alert('Оплата внесена');
        this.reset();
        loadMyRentals(); // обновляем список
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
});

// Форма оценки
document.getElementById('ratingForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const equipmentId = parseInt(document.getElementById('ratingEquipmentId').value);
    const rating = parseInt(document.getElementById('ratingValue').value);
    if (rating < 1 || rating > 5) {
        alert('Оценка от 1 до 5');
        return;
    }
    try {
        await fetchAPI(`equipmentratings/rate?equipmentId=${equipmentId}&rating=${rating}`, { method: 'POST' });
        alert('Спасибо за оценку!');
        this.reset();
        loadAllEquipment(); // обновляем каталог (рейтинг изменился)
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
});

// ============================================================
// 7. Аналитика
// ============================================================

async function loadAnalytics() {
    try {
        // ТОП-5
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

        // Просроченное ТО
        const overdue = await fetchAPI('maintenances/overdue');
        const overdueContainer = document.getElementById('overdueMaintenance');
        if (!overdue.length) {
            overdueContainer.innerHTML = '<p class="text-muted">Нет просроченного ТО</p>';
        } else {
            overdueContainer.innerHTML = `<ul class="list-group">${overdue.map(m => `
                <li class="list-group-item">
                    Техника #${m.equipmentId} (ТО закончилось: ${new Date(m.endDate).toLocaleDateString()})
                </li>
            `).join('')}</ul>`;
        }
    } catch (err) {
        alert('Ошибка загрузки аналитики: ' + err.message);
    }
}

// Выручка за период
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
// 8. Админские CRUD (Клиенты, Техника, Бронирования)
// ============================================================

// ---------- КЛИЕНТЫ ----------
async function loadClients() {
    try {
        const clients = await fetchAPI('clients');
        const container = document.getElementById('clientsList');
        if (clients.length === 0) {
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

// ---------- ТЕХНИКА ----------
async function loadEquipment() {
    try {
        const items = await fetchAPI('equipment');
        const container = document.getElementById('equipmentList');
        if (items.length === 0) {
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
        loadAllEquipment(); // обновляем каталог
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
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ---------- БРОНИРОВАНИЯ (админ) ----------
async function loadRentals() {
    try {
        const rentals = await fetchAPI('rentals');
        const container = document.getElementById('rentalsList');
        if (rentals.length === 0) {
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
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка создания бронирования: ' + err.message);
    }
});

async function deleteRental(id) {
    if (!confirm('Удалить бронирование?')) return;
    try {
        await fetchAPI(`rentals/${id}`, { method: 'DELETE' });
        loadRentals();
        loadAllEquipment();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

// ============================================================
// 9. Инициализация при загрузке страницы
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    updateAuthUI();               // обновить кнопки входа/выхода
    loadCatalogTypes();           // загрузить типы для фильтра
    loadAllEquipment();           // показать каталог
    loadAnalytics();              // загрузить аналитику
    loadClients();                // загрузить список клиентов
    loadEquipment();              // загрузить список техники (админ)
    loadRentals();                // загрузить список бронирований (админ)
    loadMyRentals();              // загрузить личный кабинет (если пользователь авторизован)
});