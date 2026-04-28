const API_URL = "https://script.google.com/macros/s/AKfycbyyV2yZlK-f4reak4CQNk3YqT-0F1FMlzWbUG7ynkrlCxCBBzMhO_xni5IGiWvUIa1O/exec";
const PREVIEW_PAGE_SIZE = 15;

let previewOffset = 0;
let previewHasMore = false;
let currentStats = null;
let chartStatusInstance = null;
let chartProdiInstance = null;

function loginAdmin() {
    const user = document.getElementById('usernameInput').value.trim();
    const pass = document.getElementById('passwordInput').value;
    const btn = event.target;
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memverifikasi...';
    btn.disabled = true;

    fetch(API_URL + "?action=login&u=" + encodeURIComponent(user) + "&p=" + encodeURIComponent(pass))
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            document.getElementById('authSection').classList.add('hidden');
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('analyticsSection').classList.remove('hidden');
            
            loadPreviewData();
            loadDashboardStats();
        } else {
            alert(result.message);
            btn.innerHTML = '<i class="bi bi-door-open-fill me-2"></i>Buka Dashboard';
            btn.disabled = false;
        }
    })
    .catch(err => {
        alert("Gagal terhubung ke server login.");
        btn.disabled = false;
    });
}

function loadDashboardStats() {
    const totalEl = document.getElementById('statTotal');
    const filledEl = document.getElementById('statFilled');
    
    totalEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    filledEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    fetch(API_URL + "?action=getStats")
    .then(response => response.json())
    .then(stats => {
        currentStats = stats;
        totalEl.innerText = stats.total.toLocaleString();
        
        const filled = stats.filled;
        filledEl.innerText = filled.toLocaleString();
        
        // Perbaikan kalkulasi persen agar tidak NaN atau tak terhingga
        let percent = 0;
        if (stats.total > 0) {
            percent = Math.min(100, Math.round((filled / stats.total) * 100));
        }
        
        const pb = document.getElementById('batchProgressBar');
        pb.style.width = percent + "%";
        pb.innerText = percent + "%";

        renderCharts(stats);
        if (stats.prodi && Object.keys(stats.prodi).length > 0) {
            populateProdiFilter(stats.prodi);
        }
    })
    .catch(err => {
        totalEl.innerText = "Error";
        filledEl.innerText = "Error";
        console.error("Stats Load Error:", err);
    });
}

function renderCharts(stats) {
    // Chart Status Kerja
    const ctxStatus = document.getElementById('chartStatusKerja').getContext('2d');
    if(chartStatusInstance) chartStatusInstance.destroy();
    chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stats.statusKerja),
            datasets: [{
                data: Object.values(stats.statusKerja),
                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Chart Prodi (Top 5)
    const sortedProdi = Object.entries(stats.prodi).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const ctxProdi = document.getElementById('chartProdi').getContext('2d');
    if(chartProdiInstance) chartProdiInstance.destroy();
    chartProdiInstance = new Chart(ctxProdi, {
        type: 'bar',
        data: {
            labels: sortedProdi.map(x => x[0]),
            datasets: [{
                label: 'Jumlah Alumni',
                data: sortedProdi.map(x => x[1]),
                backgroundColor: '#4e73df'
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

function populateProdiFilter(prodiObj) {
    const filter = document.getElementById('filterProdi');
    const sorted = Object.keys(prodiObj).sort();
    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.innerText = p;
        filter.appendChild(opt);
    });
}

function filterBySearch() {
    const nameQuery = document.getElementById('searchNameInput').value.trim();
    if (nameQuery.length >= 2) {
        searchByName(nameQuery);
    } else if (nameQuery.length === 0) {
        loadPreviewData(true);
    }
}

function searchByName(query) {
    const tbody = document.getElementById('tableBodyPreview');
    tbody.innerHTML = "<div class='text-center py-3'><div class='spinner-border spinner-border-sm'></div> Mencari...</div>";
    
    fetch(API_URL + "?action=searchByName&q=" + encodeURIComponent(query))
    .then(response => response.json())
    .then(result => {
        tbody.innerHTML = "";
        if (result.data.length === 0) {
            tbody.innerHTML = "<div class='text-center py-3'>Tidak ada nama yang cocok.</div>";
            return;
        }
        renderTableRows(result.data);
        document.getElementById('btnLoadMore').classList.add('hidden');
    });
}

function loadPreviewData(reset = true) {
    const tbody = document.getElementById('tableBodyPreview');
    const btnLoadMore = document.getElementById('btnLoadMore');

    if (reset) {
        previewOffset = 0;
        tbody.innerHTML = "<div class='text-center py-3'><div class='spinner-border spinner-border-sm'></div> Memuat...</div>";
    }

    fetch(API_URL + "?action=getTop20&limit=" + PREVIEW_PAGE_SIZE + "&offset=" + previewOffset)
    .then(response => response.json())
    .then(result => {
        if (reset) tbody.innerHTML = "";
        renderTableRows(result.data);
        
        previewOffset += result.data.length;
        previewHasMore = result.hasMore;
        
        if (previewHasMore) btnLoadMore.classList.remove('hidden');
        else btnLoadMore.classList.add('hidden');
    });
}

function renderTableRows(data) {
    const tbody = document.getElementById('tableBodyPreview');
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview-item';
        card.onclick = () => {
            document.getElementById('nimInput').value = item.nim;
            mulaiPendataan();
        };
        card.innerHTML = `
            <div class="preview-col col-nim"><span class="nim-pill">${item.nim}</span></div>
            <div class="preview-col col-name"><span class="name-main">${item.nama}</span></div>
            <div class="preview-col col-prodi"><span class="prodi-main">${item.prodi}</span></div>
        `;
        tbody.appendChild(card);
    });
}

function triggerBatch() {
    const btn = document.getElementById('btnBatchRun');
    const info = document.getElementById('batchStatusInfo');
    
    btn.disabled = true;
    info.classList.remove('hidden');
    info.innerText = "⏳ Memproses 10 data...";

    fetch(API_URL + "?action=runBatch")
    .then(response => response.json())
    .then(result => {
        btn.disabled = false;
        if (result.status === "success") {
            info.innerText = `✅ Berhasil memproses ${result.processed} data. Tersisa ${result.remaining} lagi.`;
            loadDashboardStats();
        } else {
            info.innerText = "❌ Gagal: " + result.message;
        }
    });
}

function exportToCSV() {
    alert("Menyiapkan ekspor data... Proses ini mengambil data langsung dari Spreadsheet.");
    window.open(API_URL + "?action=getTop20&limit=1000&offset=0"); // Contoh sederhana, idealnya menggunakan download blob
}

function mulaiPendataan() {
    const nim = document.getElementById('nimInput').value.trim();
    if(!nim) return alert("Masukkan NIM!");
    
    const btn = document.getElementById('btnLanjutNim');
    btn.innerHTML = "Mencari...";
    btn.disabled = true;

    fetch(API_URL + "?nim=" + nim)
    .then(response => response.json())
    .then(result => {
        btn.innerHTML = '<i class="bi bi-crosshair me-2"></i>Temukan NIM';
        btn.disabled = false;

        if (result.status === "success") {
            document.getElementById('displayNama').innerText = result.nama;
            document.getElementById('displayProdi').innerText = result.prodi;
            document.getElementById('displayNim').innerText = result.nim;

            const fields = ['email','hp','linkedin','ig','tiktok','facebook','kantor','alamatKantor','posisi','sosmedKantor','statusKerja'];
            fields.forEach(f => {
                if(document.getElementById(f)) document.getElementById(f).value = result[f] || "";
            });

            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('analyticsSection').classList.add('hidden');
            document.getElementById('formSection').classList.remove('hidden');
        } else {
            alert("NIM tidak ditemukan.");
        }
    });
}

function scrapeWithGrok() {
    const nama = document.getElementById('displayNama').innerText;
    const prodi = document.getElementById('displayProdi').innerText;
    const nim = document.getElementById('displayNim').innerText;
    const btn = document.getElementById('btnGrokScrape');
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Meneliti...';
    btn.disabled = true;

    fetch(API_URL + "?action=scrapeAI&nama=" + encodeURIComponent(nama) + "&prodi=" + encodeURIComponent(prodi) + "&nim=" + encodeURIComponent(nim))
    .then(response => response.json())
    .then(result => {
        btn.innerHTML = '<i class="bi bi-stars me-1"></i> Scrape dengan Gemini AI';
        btn.disabled = false;

        if (result.status === "success") {
            const d = result.data;
            let foundCount = 0;
            const fields = ['email','hp','linkedin','ig','tiktok','facebook','kantor','alamatKantor','posisi','sosmedKantor','statusKerja'];
            
            fields.forEach(f => {
                if(d[f] && d[f].length > 1) {
                    document.getElementById(f).value = d[f];
                    foundCount++;
                }
            });

            if (foundCount > 0) {
                alert("AI berhasil menemukan " + foundCount + " informasi baru!");
            } else {
                alert("AI sudah mencari, tapi belum menemukan informasi publik yang valid untuk alumni ini.");
            }
        } else {
            alert("Gagal memanggil AI: " + (result.message || "Unknown Error"));
        }
    });
}

function kembaliKePencarian() {
    document.getElementById('formSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('previewSection').classList.remove('hidden');
    document.getElementById('analyticsSection').classList.remove('hidden');
    document.getElementById('nimInput').value = "";
}

document.getElementById('tracerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    const payload = {
        action: "update",
        nim: document.getElementById('displayNim').innerText,
        email: document.getElementById('email').value,
        hp: document.getElementById('hp').value,
        linkedin: document.getElementById('linkedin').value,
        ig: document.getElementById('ig').value,
        tiktok: document.getElementById('tiktok').value,
        facebook: document.getElementById('facebook').value,
        kantor: document.getElementById('kantor').value,
        alamatKantor: document.getElementById('alamatKantor').value,
        posisi: document.getElementById('posisi').value,
        statusKerja: document.getElementById('statusKerja').value,
        sosmedKantor: document.getElementById('sosmedKantor').value
    };

    fetch(API_URL + "?" + new URLSearchParams(payload).toString())
    .then(response => response.json())
    .then(result => {
        alert("Data berhasil disimpan!");
        kembaliKePencarian();
        loadDashboardStats();
        btn.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i>Terapkan Perubahan Data';
        btn.disabled = false;
    });
});
