/**
 * Alumni API for Google Apps Script Web App.
 *
 * Expected request parameters from frontend:
 * - action=getTop20&limit=10&offset=0
 * - action=update&nim=...&linkedin=...&ig=...&email=...&hp=...&tiktok=...&facebook=...&alamatKantor=...&kantor=...&posisi=...&statusKerja=...&sosmedKantor=...
 * - nim=... (for single alumni lookup)
 */

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (params.action || "").toString().trim();

    if (action === "login") {
      return handleLogin_(params);
    }

    if (action === "getStats") {
      return handleGetStats_();
    }

    if (action === "searchByName") {
      return handleSearchByName_(params);
    }

    if (action === "scrapeAI") {
      return handleGeminiScraping_(params);
    }

    if (action === "runBatch") {
      return handleBatchRequest_();
    }

    return handleFindByNim_(params);
  } catch (err) {
    return json_({ status: "error", message: err.toString() });
  }
}

/**
 * FUNGSI BATCH SCRAPER (Mencicil data di background)
 */
function handleBatchRequest_() {
  var stats = runBatchScraper();
  return json_({ 
    status: "success", 
    message: "Batch selesai (10 data).",
    processed: stats.processed,
    remaining: stats.remaining 
  });
}

function runBatchScraper() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {processed: 0, remaining: 0};

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 17).getValues(); 
  var batchSize = 10; 
  var processedCount = 0;
  var emptyCount = 0;

  for (var i = 0; i < dataRange.length; i++) {
    var rowData = dataRange[i];
    var rowIndex = i + 2;
    
    if (!rowData[8]) { // Cek kolom Email
      emptyCount++;
      if (processedCount < batchSize) {
        var result = handleGeminiScraping_({nama: rowData[0], prodi: rowData[5], nim: rowData[1]});
        if (result.status === "success") {
          var d = result.data;
          var updateRange = [[
            d.linkedin || "", d.ig || "", d.email || "", d.hp || "", d.tiktok || "",
            d.facebook || "", d.alamatKantor || "", d.kantor || "", d.posisi || "",
            d.statusKerja || "", d.sosmedKantor || ""
          ]];
          sheet.getRange(rowIndex, 7, 1, 11).setValues(updateRange);
          processedCount++;
        }
        Utilities.sleep(1000);
      }
    }
  }
  return { processed: processedCount, remaining: emptyCount - processedCount };
}

/**
 * Keamanan Login di Sisi Server
 */
function handleLogin_(params) {
  var user = params.u || "";
  var pass = params.p || "";
  // GANTI PASSWORD DI SINI
  if (user === "admin" && pass === "admin223344") {
    return json_({ status: "success", token: "AUTH_OK_" + new Date().getTime() });
  }
  return json_({ status: "error", message: "ID Pengguna atau Kata Sandi salah!" });
}

/**
 * Statistik Analitik untuk Dashboard
 */
function handleGetStats_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return json_({ total: 0 });

  // OPTIMASI: Hanya ambil 10.000 data terakhir untuk statistik agar tidak LAG/Timeout
  // Mengolah 140rb data sekaligus dalam satu request akan membuat sistem crash.
  var startRow = Math.max(2, lastRow - 10000);
  var numRows = lastRow - startRow + 1;
  
  var data = sheet.getRange(startRow, 1, numRows, 17).getValues();
  var stats = {
    total: lastRow - 1,
    processedSample: data.length,
    filled: 0,
    statusKerja: { "Swasta": 0, "PNS": 0, "Wirausaha": 0, "Lainnya": 0 },
    prodi: {}
  };

  data.forEach(function(row) {
    if (row[8]) stats.filled++; 
    
    var sk = row[15] || "Lainnya";
    if (stats.statusKerja[sk] !== undefined) stats.statusKerja[sk]++;
    else stats.statusKerja["Lainnya"]++;

    var pr = row[5] || "Lainnya";
    stats.prodi[pr] = (stats.prodi[pr] || 0) + 1;
  });

  return json_(stats);
}

/**
 * Pencarian Berdasarkan Nama
 */
function handleSearchByName_(params) {
  var query = (params.q || "").toLowerCase();
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return json_({ data: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase().indexOf(query) !== -1) {
      results.push({
        nama: data[i][0],
        nim: data[i][1],
        prodi: data[i][5]
      });
    }
    if (results.length >= 20) break; // Limit 20 hasil pencarian
  }
  return json_({ status: "success", data: results });
}

/**
 * Scraping data alumni menggunakan Gemini AI (Gratis)
 */
function handleGeminiScraping_(params) {
  var nama = params.nama || "";
  var prodi = params.prodi || "";
  var nim = params.nim || "";

  // DAPATKAN API KEY GRATIS DI: https://aistudio.google.com/
  var GEMINI_API_KEY = "MASUKKAN_API_KEY_GEMINI_ANDA"; 
  
  if (!nama) {
    return json_({ status: "error", message: "Nama alumni diperlukan." });
  }

  var prompt = "Tugas: Riset Data Alumni Profesional\n" +
               "Subjek: " + nama + "\n" +
               "Program Studi: " + prodi + "\n" +
               "Institusi: Universitas Muhammadiyah Malang (UMM)\n" +
               "NIM: " + nim + "\n\n" +
               "Instruksi Khusus:\n" +
               "1. Cari jejak digital profesional orang ini di LinkedIn, situs perusahaan, atau direktori alumni.\n" +
               "2. Pastikan orang yang ditemukan adalah lulusan UMM sesuai prodi tersebut. Jika ada keraguan karena nama yang pasaran, prioritaskan yang berlokasi di Indonesia atau memiliki riwayat pendidikan UMM.\n" +
               "3. Ekstrak informasi karir saat ini (Nama Kantor, Jabatan, Lokasi Kantor).\n" +
               "4. Cari username sosial media jika tersedia secara publik.\n" +
               "5. Jika data tidak ditemukan sama sekali, kembalikan string kosong.\n\n" +
               "Output harus JSON murni tanpa penjelasan apapun:\n" +
               "{ \"linkedin\": \"\", \"ig\": \"\", \"email\": \"\", \"hp\": \"\", \"tiktok\": \"\", \"facebook\": \"\", \"alamatKantor\": \"\", \"kantor\": \"\", \"posisi\": \"\", \"statusKerja\": \"\", \"sosmedKantor\": \"\" }";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

  try {
    var payload = {
      "contents": [{ "parts": [{ "text": prompt }] }]
    };

    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    var response = UrlFetchApp.fetch(url, options);
    var resJson = JSON.parse(response.getContentText());
    
    if (!resJson.candidates || resJson.candidates.length === 0) {
      return json_({ status: "error", message: "AI tidak memberikan jawaban." });
    }

    var aiText = resJson.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    var scrapedData = JSON.parse(aiText);
    return json_({ status: "success", data: scrapedData });

  } catch (err) {
    return json_({ status: "error", message: "Scraping Gagal: " + err.toString() });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets()[0];
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
