// Paste this into Extensions > Apps Script inside your Google Sheet.
// One tab per section. Each submission names its tab in a "sheet" field.
// The Diet tab also saves the uploaded photo to Google Drive and stores its link.

const SHEET_CONFIG = {
  Tasks:     ['Date', 'Tasks'],
  Strategy:  ['Date', 'Scenario', 'Strategy', 'Result'],
  Learnings: ['Date', 'Learning', 'Source'],
  Questions: ['Date', 'Question', 'Source'],
  Diet:      ['Date', 'Name', 'Photo', 'Review']
};

const PHOTO_FOLDER_NAME = 'Strategy Log - Diet Photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // safety limit after decoding

function doPost(e) {
  const p = e.parameter;
  const sheetName = p.sheet;
  const headers = SHEET_CONFIG[sheetName];

  if (!headers) {
    return ContentService.createTextOutput('error: unknown sheet "' + sheetName + '"');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const row = headers.map(h => p[h] || '');

  // A photo arrives as base64 text in "<Column>_data" (the browser already shrinks it to a JPEG).
  headers.forEach((h, i) => {
    const data = p[h + '_data'];
    if (data) {
      row[i] = savePhoto_(data, [p.Date, p.Name].filter(Boolean).join('_'));
    }
  });

  sheet.appendRow(row);
  return ContentService.createTextOutput('ok');
}

function savePhoto_(base64, label) {
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_PHOTO_BYTES) {
    return 'error: photo too large';
  }
  const safe = (label || 'photo').replace(/[^\w\-]+/g, '_').slice(0, 60);
  const name = safe + '_' + Date.now() + '.jpg';
  const blob = Utilities.newBlob(bytes, 'image/jpeg', name);
  return getPhotoFolder_().createFile(blob).getUrl();
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
}
