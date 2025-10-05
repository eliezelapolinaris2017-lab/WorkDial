// Clave de almacenamiento y versión (por si migras en el futuro)
const DB_KEY = 'bizflow-local/transactions/v1';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  items: load(),
};

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(state.items));
}

// Helpers
const fmtMoney = (n) =>
  (new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' })).format(n);

function render() {
  const tbody = $('#tx-body');
  tbody.innerHTML = '';

  const q = $('#q').value.trim().toLowerCase();
  const filtered = state.items.filter(it => it.note.toLowerCase().includes(q));

  if (!filtered.length) {
    $('#empty').style.display = 'block';
  } else {
    $('#empty').style.display = 'none';
    for (const it of filtered) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(it.createdAt).toLocaleString()}</td>
        <td><span class="badge ${it.type === 'INCOME' ? 'income' : 'expense'}">${it.type}</span></td>
        <td class="right">${fmtMoney(it.amount)}</td>
        <td>${escapeHtml(it.note || '')}</td>
        <td class="right">
          <button class="outline danger" data-del="${it.id}">Eliminar</button>
        </td>`;
      tbody.appendChild(tr);
    }
  }

  const income = state.items.filter(i => i.type === 'INCOME').reduce((a,b)=>a+b.amount,0);
  const expense = state.items.filter(i => i.type === 'EXPENSE').reduce((a,b)=>a+b.amount,0);
  $('#kpi-income').textContent = fmtMoney(income);
  $('#kpi-expense').textContent = fmtMoney(expense);
  $('#kpi-balance').textContent = fmtMoney(income - expense);
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

// Eventos
$('#tx-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = $('#type').value;
  const amount = parseFloat($('#amount').value);
  const note = $('#note').value.trim();
  if (!(amount > 0)) return alert('Monto inválido');

  state.items.unshift({
    id: crypto.randomUUID(),
    type,
    amount: Math.round(amount * 100) / 100,
    note,
    createdAt: new Date().toISOString(),
  });
  save();
  $('#tx-form').reset();
  render();
});

$('#tx-body').addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-del');
  if (!id) return;
  if (!confirm('¿Eliminar este movimiento?')) return;
  state.items = state.items.filter(x => x.id !== id);
  save();
  render();
});

$('#q').addEventListener('input', render);

$('#btn-clear').addEventListener('click', () => {
  if (!state.items.length) return;
  if (!confirm('Esto eliminará TODOS los datos guardados en este navegador.')) return;
  state.items = [];
  save();
  render();
});

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ items: state.items }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bizflow-local-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.items)) throw new Error('Formato inválido');
    if (!confirm('Importará y reemplazará los datos actuales.')) return;
    state.items = data.items;
    save();
    render();
    e.target.value = '';
  } catch (err) {
    alert('No se pudo importar: ' + err.message);
  }
});

// Primera carga
render();
