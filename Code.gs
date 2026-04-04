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

    if (action === "update") {
      return handleUpdate_(params);
    }

    if (action === "getTop20") {
      return handleTop20_(params);
    }

    return handleFindByNim_(params);
  } catch (err) {
    return json_({ status: "error", message: err.toString() });
  }
}

function handleUpdate_(params) {
  var nimToUpdate = (params.nim || "").toString().trim();
  if (!nimToUpdate) {
    return json_({ status: "error", message: "NIM wajib diisi." });
  }

  var sheet = getSheet_();
  var found = sheet.getRange("B:B").createTextFinder(nimToUpdate).matchEntireCell(true).findNext();

  if (!found) {
    return json_({ status: "error", message: "NIM tidak ditemukan." });
  }

  var rowIdx = found.getRow();

  // Kolom G(7) sampai Q(17) = 11 kolom
  // G Linked In, H Instagram, I Email, J Nomor Telepon, K TikTok,
  // L Facebook, M Alamat Bekerja, N Tempat Bekerja, O Posisi Jabatan,
  // P Status Pekerjaan, Q Sosial Media Kantor
  var dataUpdate = [[
    params.linkedin || "",
    params.ig || "",
    params.email || "",
    params.hp || "",
    params.tiktok || "",
    params.facebook || "",
    params.alamatKantor || "",
    params.kantor || "",
    params.posisi || "",
    params.statusKerja || "",
    params.sosmedKantor || ""
  ]];

  sheet.getRange(rowIdx, 7, 1, 11).setValues(dataUpdate);
  return json_({ status: "success", message: "Data terupdate!" });
}

function handleTop20_(params) {
  var sheet = getSheet_();
  var dataRows = Math.max(0, sheet.getLastRow() - 1); // exclude header row
  var limit = parseInt(params.limit, 10);
  var offset = parseInt(params.offset, 10);

  if (isNaN(limit) || limit < 1) {
    limit = 10;
  }
  if (limit > 50) {
    limit = 50;
  }

  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  if (dataRows === 0 || offset >= dataRows) {
    return json_({ status: "success", data: [], hasMore: false, nextOffset: offset, total: dataRows });
  }

  var maxRows = Math.min(limit, dataRows - offset);

  // Ambil kolom A..F: nama(0), nim(1), prodi(5)
  var values = sheet.getRange(2 + offset, 1, maxRows, 6).getValues();
  var data = [];

  for (var i = 0; i < values.length; i++) {
    data.push({
      nama: values[i][0] || "-",
      nim: values[i][1] || "-",
      prodi: values[i][5] || "-"
    });
  }

  var nextOffset = offset + maxRows;
  var hasMore = nextOffset < dataRows;

  return json_({ status: "success", data: data, hasMore: hasMore, nextOffset: nextOffset, total: dataRows });
}

function handleFindByNim_(params) {
  var nimToFind = (params.nim || "").toString().trim();
  if (!nimToFind) {
    return json_({ status: "error", message: "Parameter tidak lengkap." });
  }

  var sheet = getSheet_();
  var found = sheet.getRange("B:B").createTextFinder(nimToFind).matchEntireCell(true).findNext();

  if (!found) {
    return json_({ status: "not_found" });
  }

  var rowIndex = found.getRow();
  var rowData = sheet.getRange(rowIndex, 1, 1, 17).getValues()[0];

  return json_({
    status: "success",
    nama: rowData[0] || "",
    nim: rowData[1] || "",
    prodi: rowData[5] || "",
    linkedin: rowData[6] || "",
    ig: rowData[7] || "",
    email: rowData[8] || "",
    hp: rowData[9] || "",
    tiktok: rowData[10] || "",
    facebook: rowData[11] || "",
    alamatKantor: rowData[12] || "",
    kantor: rowData[13] || "",
    posisi: rowData[14] || "",
    statusKerja: rowData[15] || "",
    sosmedKantor: rowData[16] || ""
  });
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
