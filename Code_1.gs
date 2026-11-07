// Paste this into Extensions > Apps Script inside your Google Sheet.
// One tab per section. Each submission names its tab in a "sheet" field.
// The Diet tab saves the uploaded photo to Google Drive, shows it inside the sheet
// (Photo column) and adds a link to open/download it (Photo link column).

const SHEET_CONFIG = {
  Tasks:     ['Date', 'Tasks'],
  Strategy:  ['Date', 'Scenario', 'Strategy', 'Result'],
  Learnings: ['Date', 'Learning', 'Source'],
  Questions: ['Date', 'Question', 'Source'],
  Diet:      ['Date', 'Name', 'Photo', 'Review', 'Photo link']
};

const PHOTO_FOLDER_NAME = 'Strategy Log - Diet Photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // safety limit after decoding
const PHOTO_ROW_HEIGHT = 160;            // pixels, so the picture is visible in the sheet
const PHOTO_COL_WIDTH = 200;

function doPost(e) {
  const p = e.parameter;
  const sheetName = p.sheet;
  const headers = SHEET_CONFIG[sheetName];

  if (!headers) {
    return ContentService.createTextOutput('error: unknown sheet "' + sheetName + '"');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Create the header row, or repair it if columns were added in a newer version.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      if (current.join('|') !== headers.join('|')) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Photo columns are filled below from the uploaded data, never from raw form text.
    const iPhoto = headers.indexOf('Photo');
    const iLink = headers.indexOf('Photo link');
    const row = headers.map((h, i) => (i === iPhoto || i === iLink) ? '' : (p[h] || ''));

    let hasPhoto = false;
    if (iPhoto > -1 && p.Photo_data) {
      const saved = savePhoto_(p.Photo_data, [p.Date, p.Name].filter(Boolean).join('_'));
      if (saved.error) {
        row[iPhoto] = saved.error;
      } else {
        row[iPhoto] = '=IMAGE("https://drive.google.com/thumbnail?id=' + saved.id + '&sz=w800")';
        row[iLink] = '=HYPERLINK("' + saved.url + '","Open / download")';
        hasPhoto = true;
      }
    }

    sheet.appendRow(row);

    if (hasPhoto) {
      sheet.setRowHeight(sheet.getLastRow(), PHOTO_ROW_HEIGHT);
      sheet.setColumnWidth(iPhoto + 1, PHOTO_COL_WIDTH);
    }
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

function savePhoto_(base64, label) {
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_PHOTO_BYTES) {
    return { error: 'error: photo too large' };
  }
  const safe = (label || 'photo').replace(/[^\w\-]+/g, '_').slice(0, 60);
  const name = safe + '_' + Date.now() + '.jpg';
  const blob = Utilities.newBlob(bytes, 'image/jpeg', name);
  const file = getPhotoFolder_().createFile(blob);
  // The IMAGE() formula loads the picture without signing in, so the file must be viewable by link.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: file.getId(), url: file.getUrl() };
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
}
