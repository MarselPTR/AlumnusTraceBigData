const API_URL = "https://script.google.com/macros/s/AKfycbzoxseR350vcQ6js8DblwhiRFI0q_y41TltWQOknCHqX6nprE_2akd6YXfBOEzoGK6Y/exec";
const PREVIEW_PAGE_SIZE = 10;

let previewOffset = 0;
let previewHasMore = false;

function kembaliKePencarian() {
    // Sembunyikan area Form Edit
    document.getElementById('formSection').classList.add('hidden');
    
    // Tampilkan kembali form pencarian dan tabel daftar alumni
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('previewSection').classList.remove('hidden');
    
    // Bersihkan isi NIM agar siap mencari nama baru
    document.getElementById('nimInput').value = "";
    
    // Otomatis meluncur ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loginAdmin() {
    const user = document.getElementById('usernameInput').value.trim();
    const pass = document.getElementById('passwordInput').value;
    
    if (user === "admin" && pass === "admin223344") {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('hidden');
        
        // Mulai memuat data preview ke tabel
        loadPreviewData();
    } else {
        alert("Username atau Password salah!");
    }
}
  
function loadPreviewData(reset = true) {
    document.getElementById('previewSection').classList.remove('hidden');
    const tbody = document.getElementById('tableBodyPreview');
    const btnLoadMore = document.getElementById('btnLoadMore');

    if (reset) {
        previewOffset = 0;
        previewHasMore = false;
        tbody.innerHTML = "<div class='preview-empty text-center text-muted py-3'><div class='spinner-border spinner-border-sm me-2'></div>Memuat daftar...</div>";
    }

    btnLoadMore.disabled = true;
    btnLoadMore.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Memuat...';
    
    fetch(API_URL + "?action=getTop20&limit=" + PREVIEW_PAGE_SIZE + "&offset=" + previewOffset)
    .then(response => response.json())
    .then(result => {
        if(result.status === "success") {
            if (reset) {
                tbody.innerHTML = "";
            }
            
            if(result.data.length === 0) {
                if (reset) {
                    tbody.innerHTML = "<div class='preview-empty text-center text-muted py-3'>Belum ada data alumni.</div>";
                }
                previewHasMore = false;
                updateLoadMoreButton();
                return;
            }

            // Memasukkan setiap data ke dalam baris tabel
            result.data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'preview-item';
                card.title = '';
                
                // Menambahkan fungsi agar baris bisa diklik
                card.onclick = function() {
                    document.getElementById('nimInput').value = item.nim;
                    mulaiPendataan(); // Otomatis jalankan pencarian form
                    window.scrollTo({ top: 0, behavior: 'smooth' }); // Layar otomatis naik ke atas
                };

                card.innerHTML = `
                    <div class="preview-col col-nim"><span class="nim-pill">${item.nim}</span></div>
                    <div class="preview-col col-name"><span class="name-main">${item.nama}</span></div>
                    <div class="preview-col col-prodi"><span class="prodi-main">${item.prodi}</span></div>
                `;
                tbody.appendChild(card);
            });

            previewOffset = Number(result.nextOffset || (previewOffset + result.data.length));

            // Fallback: jika API lama belum kirim hasMore/nextOffset,
            // anggap masih ada data jika jumlah item sama dengan page size.
            if (typeof result.hasMore === 'boolean') {
                previewHasMore = result.hasMore;
            } else {
                previewHasMore = result.data.length >= PREVIEW_PAGE_SIZE;
            }

            updateLoadMoreButton();
        }
    })
    .catch(err => {
        if (reset) {
            tbody.innerHTML = "<div class='preview-empty text-center text-danger py-3'>Gagal memuat preview data. Pastikan Apps Script jalan.</div>";
        }
        previewHasMore = false;
        updateLoadMoreButton();
    });
}

function updateLoadMoreButton() {
    const btnLoadMore = document.getElementById('btnLoadMore');
    btnLoadMore.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Muat Lebih Banyak';
    btnLoadMore.disabled = false;

    if (previewHasMore) {
        btnLoadMore.classList.remove('hidden');
    } else {
        btnLoadMore.classList.add('hidden');
    }
}

function loadMorePreviewData() {
    if (!previewHasMore) {
        return;
    }
    loadPreviewData(false);
}
  
function mulaiPendataan() {
    const nim = document.getElementById('nimInput').value.trim();
    if(nim === "") {
        alert("Harap masukkan NIM terlebih dahulu!");
        return;
    }
    
    const btn = document.getElementById('btnLanjutNim');
    btn.innerHTML = '<i class="bi bi-compass me-2"></i>Mencari Data...';
    btn.disabled = true;

    
    fetch(API_URL + "?nim=" + encodeURIComponent(nim))
    .then(response => response.json())
    .then(result => {
        
        btn.innerHTML = '<i class="bi bi-crosshair me-2"></i>Temukan NIM';
        btn.disabled = false;

        if (result.status === "success") {
            
            document.getElementById('displayNama').innerText = result.nama;
            document.getElementById('displayProdi').innerText = result.prodi;
            document.getElementById('displayNim').innerText = result.nim;

            
            document.getElementById('email').value = result.email;
            document.getElementById('hp').value = result.hp;
            document.getElementById('linkedin').value = result.linkedin;
            document.getElementById('ig').value = result.ig;
            document.getElementById('tiktok').value = result.tiktok;
            document.getElementById('facebook').value = result.facebook;
            document.getElementById('kantor').value = result.kantor;
            document.getElementById('alamatKantor').value = result.alamatKantor;
            document.getElementById('posisi').value = result.posisi;
            document.getElementById('sosmedKantor').value = result.sosmedKantor;

            if (result.statusKerja !== "") {
                document.getElementById('statusKerja').value = result.statusKerja;
            } else {
                document.getElementById('statusKerja').selectedIndex = 0;
            }

            
            document.getElementById('authSection').classList.add('hidden'); 
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('previewSection').classList.add('hidden'); // Hilangkan tabel preview saat mengisi form
            document.getElementById('formSection').classList.remove('hidden');

        } else if (result.status === "not_found") {
            alert("Maaf, NIM " + nim + " tidak dapat ditemukan di Database. Pastikan NIM yang Anda masukkan benar.");
        } else {
            alert("Error Sistem: " + result.message);
        }
    })
    .catch(error => {
        alert("Gagal terhubung dengan server Google. Coba lagi dalam beberapa saat.");
        btn.innerHTML = '<i class="bi bi-crosshair me-2"></i>Temukan NIM';
        btn.disabled = false;
    });
}


document.getElementById('tracerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    
    if(API_URL === "MASUKKAN_URL_ANDA_DI_SINI") {
        alert("Gagal: URL API Google Apps Script belum dimasukkan ke dalam kode HTML.");
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.innerText = "Menyimpan data...";
    btn.disabled = true;

    
    const payload = {
        nim: document.getElementById('displayNim').innerText,
        linkedin: document.getElementById('linkedin').value,
        ig: document.getElementById('ig').value,
        email: document.getElementById('email').value,
        hp: document.getElementById('hp').value,
        tiktok: document.getElementById('tiktok').value,
        facebook: document.getElementById('facebook').value,
        alamatKantor: document.getElementById('alamatKantor').value,
        kantor: document.getElementById('kantor').value,
        posisi: document.getElementById('posisi').value,
        statusKerja: document.getElementById('statusKerja').value,
        sosmedKantor: document.getElementById('sosmedKantor').value
    };

    // MENGUBAH JALUR MENJADI 'GET' AGAR TIDAK DIBLOKIR GOOGLE SAMA SEKALI
    // Kita menumpang jalur pencarian yang sudah terbukti lolos keamanan
    const queryParams = new URLSearchParams(payload).toString();

    fetch(API_URL + "?action=update&" + queryParams, {
        method: 'GET'
    })
    .then(response => response.json()) // Kini kita bisa dengan bangga melihat respon Google
    .then(result => {
        if (result.status === "success") {
            alert("Berhasil! Perubahan data alumni sudah tersimpan.");
            kembaliKePencarian(); 
            loadPreviewData(); // Refresh tabel admin
        } else {
            alert("Gagal! Respons dari Server Spreadsheet Anda: " + result.message);
        }
        btn.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i>Terapkan Perubahan Data';
        btn.disabled = false;
    })
    .catch(error => {
        alert("Internet Tiba-Tiba Terputus: " + error.message);
        btn.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i>Terapkan Perubahan Data';
        btn.disabled = false;
    });
});
