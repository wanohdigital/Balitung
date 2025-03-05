let currentBusiness = null;
let businessToEdit = null;
let businesses = JSON.parse(localStorage.getItem('businesses')) || [];
let capitals = JSON.parse(localStorage.getItem('capitals')) || {};
let incomes = JSON.parse(localStorage.getItem('incomes')) || {};
let expenses = JSON.parse(localStorage.getItem('expenses')) || {};
let monthlyProfit = {};
let totalProfit = Object.values(monthlyProfit).reduce((sum, p) => sum + p, 0);
let averageProfit = Object.keys(monthlyProfit).length > 0 
    ? totalProfit / Object.keys(monthlyProfit).length 
    : 0;

let breakEven = totalModal > 0 && averageProfit > 0 
    ? (totalModal / averageProfit).toFixed(1) + ' bulan' 
    : '-';

// Tampilkan di UI
$('#breakEven').html(breakEven);

// Format tanggal ke Bulan Tahun
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', { 
        month: 'long', 
        year: 'numeric' 
    }).format(date);
}

// Group data by bulan
function groupByMonth(data) {
    const groups = {};
    Object.values(data).forEach(item => {
        const monthKey = formatDate(item.date);
        groups[monthKey] = groups[monthKey] || [];
        groups[monthKey].push(item);
    });
    return groups;
}

// Update dashboard dengan semua bulan
function updateDashboard() {
    if (!currentBusiness) return;

    // Hitung total modal
    const totalModal = Object.values(capitals[currentBusiness] || {}).reduce((sum, c) => 
        sum + (c.quantity * c.price), 0
    );

    // Group pemasukkan & pengeluaran per bulan
    const groupedIncome = groupByMonth(incomes[currentBusiness] || {});
    const groupedExpense = groupByMonth(expenses[currentBusiness] || {});

    // Hitung profit per bulan
    Object.keys(groupedIncome).forEach(month => {
        const incomeTotal = groupedIncome[month].reduce((sum, i) => sum + i.amount, 0);
        const expenseTotal = groupedExpense[month]?.reduce((sum, e) => sum + e.amount, 0) || 0;
        monthlyProfit[month] = incomeTotal - expenseTotal;
    });

    // Hitung estimasi balik modal
    const averageProfit = Object.values(monthlyProfit).reduce((sum, p) => sum + p, 0) 
        / Object.keys(monthlyProfit).length || 0;
    const breakEven = totalModal > 0 && averageProfit > 0 
        ? (totalModal / averageProfit).toFixed(1) + ' bulan' 
        : '-';

    // Tampilkan di UI
    $('#totalModal').text(formatRupiah(totalModal));
    $('#breakEven').text(breakEven);
    $('#currentProfit').text(formatRupiah(monthlyProfit[currentMonth] || 0));
    
    // Tampilkan semua bulan di dashboard
    let profitHtml = '<div class="row">';
    Object.entries(monthlyProfit).forEach(([month, profit]) => {
        profitHtml += `
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>${month}</h5>
                        <p>Profit: ${formatRupiah(profit)}</p>
                    </div>
                </div>
            </div>
        `;
    });
    profitHtml += '</div>';
    $('#monthlyProfit').html(profitHtml);
}

// Load data usaha dengan active state
function loadBusinesses() {
    const $businessList = $('#businessList');
    $businessList.html('');
    
    businesses.forEach(b => {
        $businessList.append(`
            <li class="dropdown-item d-flex justify-content-between align-items-center ${b.id === currentBusiness ? 'active' : ''}" 
                data-business-id="${b.id}">
                <span>${b.name}</span>
                <button class="btn btn-sm btn-light" onclick="openEditBusinessModal(${b.id}, event)">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </li>
        `);
    });
    
    // Jika tidak ada usaha, sembunyikan dropdown
    if (businesses.length === 0) {
        $('#businessSelector').attr('disabled', true);
    }
}

// Fungsi untuk menghitung total modal
function calculateTotalCapital() {
    return Object.values(capitals[currentBusiness] || {}).reduce((sum, c) => 
        sum + (c.quantity * c.price), 0
    );
}

// Handler edit/hapus modal awal
function editCapital(id) {
    const capital = capitals[currentBusiness][id];
    $('#editModalBody').html(`
        <input type="text" class="form-control mb-3" value="${capital.name}" id="editCapitalName">
        <input type="number" class="form-control mb-3" value="${capital.quantity}" id="editCapitalQuantity">
        <input type="number" class="form-control mb-3" value="${capital.price}" id="editCapitalPrice">
        <button class="btn btn-danger" onclick="updateCapital(${id})">Update</button>
    `);
    $('#editModal').modal('show');
}

function deleteCapital(id) {
    Swal.fire({
        title: 'Hapus Modal?',
        text: 'Data tidak bisa dikembalikan!',
        icon: 'warning',
        showCancelButton: true
    }).then(result => {
        if (result.isConfirmed) {
            delete capitals[currentBusiness][id];
            localStorage.setItem('capitals', JSON.stringify(capitals));
            showTab('capital');
            Swal.fire('Sukses!', 'Modal dihapus', 'success');
        }
    });
}

// Handler edit/hapus keuangan
function editFinance(type, id) {
    const data = type === 'income' ? incomes[currentBusiness][id] : expenses[currentBusiness][id];
    $(`#editModalBody`).html(`
        <input type="date" class="form-control mb-3" value="${data.date}" id="editFinanceDate">
        <input type="number" class="form-control mb-3" value="${data.amount}" id="editFinanceAmount">
        <input type="text" class="form-control mb-3" value="${data.description}" id="editFinanceDescription">
        <button class="btn btn-danger" onclick="updateFinance('${type}', ${id})">Update</button>
    `);
    $('#editModal').modal('show');
}

function deleteFinance(type, id) {
    Swal.fire({
        title: 'Hapus Data?',
        text: 'Data tidak bisa dikembalikan!',
        icon: 'warning',
        showCancelButton: true
    }).then(result => {
        if (result.isConfirmed) {
            const storage = type === 'income' ? incomes : expenses;
            delete storage[currentBusiness][id];
            localStorage.setItem(type === 'income' ? 'incomes' : 'expenses', JSON.stringify(storage));
            showTab(type);
            Swal.fire('Sukses!', 'Data dihapus', 'success');
        }
    });
}

$(document).on('click', '.dropdown-item', function(e) {
    e.stopPropagation(); // Stop event bubbling
    
    const businessId = $(this).data('business-id');
    if (businessId) {
        currentBusiness = businessId;
        updateDashboard();
        showTab('capital');
        $('#businessSelector').text($(this).find('span').text());
        
        // Update active state
        $('.dropdown-item').removeClass('active');
        $(this).addClass('active');
    }
});

// Inisialisasi
$(document).ready(() => {
    // Set tab pertama kali
    showTab('capital');
    loadBusinesses();
    
    // Pastikan dashboard tetap tampil
    updateDashboard();
});

// Simpan usaha
function saveBusiness() {
    const name = $('#businessName').val();
    if (!name) return Swal.fire('Error', 'Nama usaha harus diisi!', 'error');
    
    const business = {
        id: Date.now(),
        name
    };
    
    businesses.push(business);
    localStorage.setItem('businesses', JSON.stringify(businesses));
    
    Swal.fire('Sukses', 'Usaha berhasil ditambahkan!', 'success');
    $('#addBusinessModal').modal('hide');
    loadBusinesses();
}

// Pilih usaha
function selectBusiness(id) {
    currentBusiness = id;
    loadBusinesses(); // Reload dropdown dengan active state
    updateDashboard(); // Update dashboard sesuai usaha
}

// Tab handler
function showTab(type) {
    $('.nav-button').removeClass('active');
    $(`.nav-button[onclick="showTab('${type}')"]`).addClass('active');

    if (type == 'home') {
        $('#dashboard').hide();
    } else {
        $('#dashboard').show();
    }
    
    let html = '';
    switch(type) {
        case 'home':
            html = `
                <div class="card card-custom mb-4">
                    <div class="card-body text-center">
                        <h3 class="mb-4">Balitung</h3>
                        <p class="text-muted">
                            Aplikasi untuk menghitung Return on Investment, 
                            manajemen modal, dan analisis keuangan usaha secara sederhana, mudah dan <strong>gratis</strong>.<br />Bisa diakses tanpa akses internet juga (<strong>offline</strong>).
                        </p>
                    </div>
                </div>

                <!-- Cards Fitur -->
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <div class="card card-feature h-100">
                            <div class="card-body">
                                <i class="fas fa-coins fa-2x text-danger mb-3"></i>
                                <h5>Modal Awal</h5>
                                <p>Input semua modal usaha untuk menghitung total investasi awal</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card card-feature h-100">
                            <div class="card-body">
                                <i class="fas fa-chart-line fa-2x text-success mb-3"></i>
                                <h5>Pemasukkan</h5>
                                <p>Catat semua pemasukkan usaha per bulan</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card card-feature h-100">
                            <div class="card-body">
                                <i class="fas fa-hand-holding-usd fa-2x text-warning mb-3"></i>
                                <h5>Pengeluaran</h5>
                                <p>Monitor pengeluaran operasional usaha</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card card-custom">
                    <div class="card-body text-center">
                        <p class="text-muted">
                            Untuk pertanyaan, masukkan, diskusi bisa melalui Whatsapp +62851-8323-1708 atau Email ke inbox@wanoh.digital.
                        </p>
                    </div>
                </div>
            `;
            break;
        case 'capital':
            html = `
                <button class="btn btn-danger mb-3" onclick="$('#addCapitalModal').modal('show')">
                    <i class="fas fa-plus"></i> Tambah Modal
                </button>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Jumlah</th>
                            <th>Harga</th>
                            <th>Total</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(capitals[currentBusiness] || {}).map(([id, c]) => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.quantity}</td>
                                <td>Rp${c.price}</td>
                                <td>Rp${c.quantity * c.price}</td>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="editCapital(${id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteCapital(${id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'income':
            html = `
                <button class="btn btn-success mb-3" onclick="showFinanceModal('income')">
                    <i class="fas fa-plus"></i> Tambah Pemasukkan
                </button>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Jumlah</th>
                            <th>Keterangan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(incomes[currentBusiness] || {}).map(([key, i]) => `
                            <tr>
                                <td>${i.date}</td>
                                <td>Rp${i.amount}</td>
                                <td>${i.description}</td>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="editCapital(${id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteCapital(${id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'expense':
            html = `
                <button class="btn btn-warning mb-3" onclick="showFinanceModal('expense')">
                    <i class="fas fa-plus"></i> Tambah Pengeluaran
                </button>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Jumlah</th>
                            <th>Keterangan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(expenses[currentBusiness] || {}).map(([key, e]) => `
                            <tr>
                                <td>${e.date}</td>
                                <td>Rp${e.amount}</td>
                                <td>${e.description}</td>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="editCapital(${id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteCapital(${id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
    }
    $('#tabContent').html(html);
}

// Simpan modal awal
function saveCapital() {
    const name = $('#capitalName').val();
    const quantity = parseInt($('#capitalQuantity').val()) || 0;
    const price = parseInt($('#capitalPrice').val()) || 0;
    
    if (!name || quantity <= 0 || price <= 0) return Swal.fire('Error', 'Lengkapi semua field!', 'error');
    
    capitals[currentBusiness] = capitals[currentBusiness] || {};
    capitals[currentBusiness][Date.now()] = {
        name,
        quantity,
        price
    };
    localStorage.setItem('capitals', JSON.stringify(capitals));
    
    Swal.fire('Sukses', 'Modal awal berhasil ditambahkan!', 'success');
    $('#addCapitalModal').modal('hide');
    showTab('capital');
    updateDashboard();
}

// Simpan pemasukkan/pengeluaran
function saveFinance() {
    const type = $('#financeModalTitle').data('type');
    const date = $('#financeDate').val();
    const amount = parseInt($('#financeAmount').val()) || 0;
    const description = $('#financeDescription').val();
    
    if (!date || amount <= 0 || !description) return Swal.fire('Error', 'Lengkapi semua field!', 'error');
    
    const storage = type === 'income' ? incomes : expenses;
    storage[currentBusiness] = storage[currentBusiness] || {};
    storage[currentBusiness][Date.now()] = {
        date,
        amount,
        description
    };
    localStorage.setItem(type === 'income' ? 'incomes' : 'expenses', JSON.stringify(storage));
    
    Swal.fire('Sukses', `${type === 'income' ? 'Pemasukkan' : 'Pengeluaran'} berhasil ditambahkan!`, 'success');
    $(`#addFinanceModal`).modal('hide');
    showTab(type);
    updateDashboard();
}

// Update modal awal
function updateCapital(id) {
    const name = $('#editCapitalName').val();
    const quantity = parseInt($('#editCapitalQuantity').val()) || 0;
    const price = parseInt($('#editCapitalPrice').val()) || 0;

    if (!name || quantity <= 0 || price <= 0) {
        return Swal.fire('Error', 'Lengkapi semua field!', 'error');
    }

    capitals[currentBusiness][id] = {
        name,
        quantity,
        price
    };
    localStorage.setItem('capitals', JSON.stringify(capitals));

    Swal.fire('Sukses', 'Modal berhasil diperbarui!', 'success');
    $('#editModal').modal('hide');
    showTab('capital');
    updateDashboard();
}

// Update pemasukkan/pengeluaran
function updateFinance(type, id) {
    const date = $('#editFinanceDate').val();
    const amount = parseInt($('#editFinanceAmount').val()) || 0;
    const description = $('#editFinanceDescription').val();

    if (!date || amount <= 0 || !description) {
        return Swal.fire('Error', 'Lengkapi semua field!', 'error');
    }

    const storage = type === 'income' ? incomes : expenses;
    storage[currentBusiness][id] = {
        date,
        amount,
        description
    };
    localStorage.setItem(type === 'income' ? 'incomes' : 'expenses', JSON.stringify(storage));

    Swal.fire('Sukses', `${type === 'income' ? 'Pemasukkan' : 'Pengeluaran'} berhasil diperbarui!`, 'success');
    $('#editModal').modal('hide');
    showTab(type);
    updateDashboard();
}

// Buka modal edit usaha
function openEditBusinessModal(id, event) {
    event.stopPropagation(); // Stop event bubbling
    const business = businesses.find(b => b.id === id);
    businessToEdit = id;
    
    $('#editBusinessName').val(business.name);
    $('#editBusinessModal').modal('show');
}

// Update nama usaha
function updateBusiness() {
    const newName = $('#editBusinessName').val();
    if (!newName) return Swal.fire('Error', 'Nama harus diisi!', 'error');
    
    const businessIndex = businesses.findIndex(b => b.id === businessToEdit);
    businesses[businessIndex].name = newName;
    localStorage.setItem('businesses', JSON.stringify(businesses));
    
    Swal.fire('Sukses!', 'Nama usaha diperbarui', 'success');
    $('#editBusinessModal').modal('hide');
    loadBusinesses();
}

// Hapus usaha beserta data terkait
function deleteBusiness() {
    Swal.fire({
        title: 'Hapus Usaha?',
        text: 'Semua data terkait akan dihapus!',
        icon: 'warning',
        showCancelButton: true
    }).then(result => {
        if (result.isConfirmed) {
            // Hapus data terkait
            delete capitals[businessToEdit];
            delete incomes[businessToEdit];
            delete expenses[businessToEdit];
            
            // Filter usaha yang dihapus
            businesses = businesses.filter(b => b.id !== businessToEdit); // Sekarang bisa di-assign
            localStorage.setItem('businesses', JSON.stringify(businesses));
            localStorage.setItem('capitals', JSON.stringify(capitals));
            localStorage.setItem('incomes', JSON.stringify(incomes));
            localStorage.setItem('expenses', JSON.stringify(expenses));
            
            // Reset current business
            if (businesses.length > 0) {
                currentBusiness = businesses[0].id;
            } else {
                currentBusiness = null;
            }
            
            // Refresh UI
            loadBusinesses();
            updateDashboard();
            showTab('capital');
            
            Swal.fire('Sukses!', 'Usaha berhasil dihapus', 'success');
            $('#editBusinessModal').modal('hide');
        }
    });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Tampilkan modal Bootstrap
    $('#installModal').modal('show');
});

function installPWA() {
    $('#installModal').modal('hide');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => deferredPrompt = null);
}