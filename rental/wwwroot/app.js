const API_BASE = 'https://localhost:7101/api';

// ========== Общие вспомогательные функции ==========
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`;
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }
    return response.json();
}

// ========== КЛИЕНТЫ ==========
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
    } catch (e) {
        alert('Ошибка загрузки клиентов: ' + e.message);
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

// Обработчик формы клиента
document.getElementById('clientForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('clientId').value);
    const data = {
        name: document.getElementById('clientName').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        passportData: document.getElementById('clientPassport').value.trim()
    };
    // Простая валидация
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
    } catch (e) {
        alert('Ошибка сохранения: ' + e.message);
    }
});

async function editClient(id) {
    try {
        const client = await fetchAPI(`clients/${id}`);
        showClientForm(client);
    } catch (e) {
        alert('Ошибка загрузки клиента: ' + e.message);
    }
}

async function deleteClient(id) {
    if (!confirm('Удалить клиента?')) return;
    try {
        await fetchAPI(`clients/${id}`, { method: 'DELETE' });
        loadClients();
    } catch (e) {
        alert('Ошибка удаления: ' + e.message);
    }
}

// ========== ТЕХНИКА ==========
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
    } catch (e) {
        alert('Ошибка загрузки техники: ' + e.message);
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
    } catch (e) {
        alert('Ошибка сохранения: ' + e.message);
    }
});

async function editEquipment(id) {
    try {
        const equip = await fetchAPI(`equipment/${id}`);
        showEquipmentForm(equip);
    } catch (e) {
        alert('Ошибка загрузки: ' + e.message);
    }
}

async function deleteEquipment(id) {
    if (!confirm('Удалить технику?')) return;
    try {
        await fetchAPI(`equipment/${id}`, { method: 'DELETE' });
        loadEquipment();
    } catch (e) {
        alert('Ошибка удаления: ' + e.message);
    }
}

// ========== БРОНИРОВАНИЯ ==========
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
    } catch (e) {
        alert('Ошибка загрузки бронирований: ' + e.message);
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
    } catch (e) {
        alert('Ошибка создания бронирования: ' + e.message);
    }
});

async function deleteRental(id) {
    if (!confirm('Удалить бронирование?')) return;
    try {
        await fetchAPI(`rentals/${id}`, { method: 'DELETE' });
        loadRentals();
    } catch (e) {
        alert('Ошибка удаления: ' + e.message);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function () {
    loadClients();
    loadEquipment();
    loadRentals();
});