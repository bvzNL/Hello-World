const adminForm = document.getElementById('adminForm');
const adminMessage = document.getElementById('adminMessage');
const summaryCard = document.getElementById('summaryCard');
const tableCard = document.getElementById('tableCard');
const summaryEl = document.getElementById('summary');
const rowsEl = document.getElementById('rows');
const resetBtn = document.getElementById('resetBtn');

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

adminForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = adminForm.token.value.trim();

  adminMessage.textContent = 'Bezig met laden...';
  adminMessage.className = 'form-message';

  try {
    const response = await fetch(`/api/admin/rsvps?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Kon data niet ophalen.');
    }

    const s = data.summary || {};
    summaryEl.innerHTML = `
      <p><strong>Totaal reacties:</strong> ${s.totaal ?? 0}</p>
      <p><strong>Ja:</strong> ${s.ja ?? 0} | <strong>Nee:</strong> ${s.nee ?? 0} | <strong>Twijfel:</strong> ${s.twijfel ?? 0}</p>
      <p><strong>Totaal personen (alleen ja):</strong> ${s.personen_ja ?? 0}</p>
    `;

    rowsEl.innerHTML = data.rows.map((row) => `
      <tr>
        <td>${new Date(row.created_at).toLocaleString('nl-NL')}</td>
        <td>${esc(row.full_name)}</td>
        <td>${esc(row.attendance)}</td>
        <td>${esc(row.guests)}</td>
        <td>${esc(row.contact)}</td>
        <td>${esc(row.notes || '-')}</td>
      </tr>
    `).join('');

    summaryCard.hidden = false;
    tableCard.hidden = false;
    adminMessage.textContent = 'Overzicht geladen.';
    adminMessage.className = 'form-message ok';
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = 'form-message err';
    summaryCard.hidden = true;
    tableCard.hidden = true;
  }
});

resetBtn.addEventListener('click', async () => {
  const token = adminForm.token.value.trim();
  if (!token) {
    adminMessage.textContent = 'Vul eerst je admin token in.';
    adminMessage.className = 'form-message err';
    return;
  }

  const confirmed = window.confirm('Weet je zeker dat je alle RSVP testdata wilt verwijderen?');
  if (!confirmed) {
    return;
  }

  adminMessage.textContent = 'Bezig met resetten...';
  adminMessage.className = 'form-message';

  try {
    const response = await fetch(`/api/admin/reset?token=${encodeURIComponent(token)}`, {
      method: 'POST'
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Reset mislukt.');
    }

    rowsEl.innerHTML = '';
    summaryEl.innerHTML = `
      <p><strong>Totaal reacties:</strong> 0</p>
      <p><strong>Ja:</strong> 0 | <strong>Nee:</strong> 0 | <strong>Twijfel:</strong> 0</p>
      <p><strong>Totaal personen (alleen ja):</strong> 0</p>
    `;
    summaryCard.hidden = false;
    tableCard.hidden = false;
    adminMessage.textContent = 'Alle testdata is verwijderd.';
    adminMessage.className = 'form-message ok';
  } catch (error) {
    adminMessage.textContent = error.message || 'Reset mislukt.';
    adminMessage.className = 'form-message err';
  }
});
