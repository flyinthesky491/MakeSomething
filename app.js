// Shared submit logic for all section pages.
// Paste your Apps Script Web app URL here once — every page uses this file.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDSxNWSB9IWEFX8rVudlZJQdBsIw6Vx3MUcXQypOEwf-tL3y_NwAdmACYZ39a-hZ_y/exec';

const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

// Shrinks a photo to at most maxSide px and returns JPEG as base64 (keeps uploads small on mobile data).
async function photoToJpegBase64(file, maxSide = 1280, quality = 0.8) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // PNG transparency becomes white instead of black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

function wireForm(sheetName) {
  const f = document.getElementById('f');
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');
  const dateField = f.querySelector('input[name="Date"]');
  if (dateField) dateField.value = todayStr();

  const show = (text, ok) => {
    msg.className = 'min-h-6 text-center text-sm font-medium ' + (ok ? 'text-teal-700' : 'text-red-600');
    msg.textContent = text;
  };

  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (SCRIPT_URL.startsWith('PASTE')) {
      show('Add your Web app URL in app.js first.', false);
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Saving...';
    msg.textContent = '';
    try {
      const data = new FormData(f);
      data.set('sheet', sheetName);

      // Photo fields: send a shrunken JPEG as text instead of the raw file.
      for (const input of f.querySelectorAll('input[type="file"]')) {
        data.delete(input.name);
        const file = input.files[0];
        if (!file) continue;
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
          show('Choose a PNG or JPEG photo.', false);
          return;
        }
        data.set(input.name + '_data', await photoToJpegBase64(file));
      }

      // no-cors: Apps Script accepts the data; the browser just can't read the reply
      await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) });
      show('Saved to your sheet.', true);
      f.reset();
      if (dateField) dateField.value = todayStr();
    } catch (err) {
      show('Could not save. Check your connection and try again.', false);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}
