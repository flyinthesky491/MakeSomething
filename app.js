// Shared submit logic for all section pages.
// Paste your Apps Script Web app URL here once — every page uses this file.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDSxNWSB9IWEFX8rVudlZJQdBsIw6Vx3MUcXQypOEwf-tL3y_NwAdmACYZ39a-hZ_y/exec';

function wireForm(sheetName) {
  const f = document.getElementById('f');
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');

  const dateField = f.querySelector('input[name="Date"]');
  if (dateField) {
    const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    dateField.value = today();
  }

  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (SCRIPT_URL.startsWith('PASTE')) {
      msg.className = 'min-h-6 text-center text-sm font-medium text-red-600';
      msg.textContent = 'Add your Web app URL in app.js first.';
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Saving...';
    msg.textContent = '';
    try {
      const data = new FormData(f);
      data.set('sheet', sheetName);
      await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) });
      msg.className = 'min-h-6 text-center text-sm font-medium text-teal-700';
      msg.textContent = 'Saved to your sheet.';
      f.reset();
      if (dateField) {
        const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
        dateField.value = today();
      }
    } catch (err) {
      msg.className = 'min-h-6 text-center text-sm font-medium text-red-600';
      msg.textContent = 'Could not save. Check your connection and try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}
