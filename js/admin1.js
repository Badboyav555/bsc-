/* =============================================
   BSc Notes Platform - Admin Panel JavaScript
   ============================================= */

// ---- Supabase Config ----
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const ADMIN_PASSWORD = 'admin@bsc2024'; // Change this!

let supabase = null;
let allLeads = [];

function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch(e) { console.warn('Supabase init failed:', e); }
}

// ---- Auth ----
function isLoggedIn() { return sessionStorage.getItem('admin_auth') === 'true'; }

function checkAuth() {
  if (!isLoggedIn()) {
    qs('#admin-login').style.display = 'flex';
    qs('#admin-app').style.display = 'none';
  } else {
    qs('#admin-login').style.display = 'none';
    qs('#admin-app').style.display = 'grid';
    loadDashboard();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const pass = (qs('#admin-pass').value || '').trim();
  if (pass === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', 'true');
    qs('#login-error').style.display = 'none';
    checkAuth();
  } else {
    qs('#login-error').style.display = 'block';
    qs('#login-error').textContent = 'Incorrect password. Try again.';
  }
}

function handleLogout() {
  sessionStorage.removeItem('admin_auth');
  checkAuth();
}

// ---- Helpers ----
function qs(sel, ctx = document) { return ctx.querySelector(sel); }

function showToast(msg, duration = 2800) {
  let el = qs('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

const CONFIG = {
  subjects: ['physics','chemistry','botany','zoology','maths'],
  subjectLabels: { physics:'Physics', chemistry:'Chemistry', botany:'Botany', zoology:'Zoology', maths:'Mathematics' },
  semLabels: ['I','II','III','IV','V','VI']
};

// ---- Sidebar Navigation ----
function initSidebar() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.tab;
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      const panel = qs(`#panel-${target}`);
      if (panel) panel.classList.add('active');
      const title = qs('.topbar-title');
      if (title) title.textContent = item.textContent.trim();

      // Close mobile sidebar
      qs('.admin-sidebar').classList.remove('open');
      qs('.sidebar-overlay').classList.remove('show');
    });
  });

  // Mobile toggle
  const menuBtn = qs('#sidebar-toggle');
  const overlay = qs('.sidebar-overlay');
  const sidebar = qs('.admin-sidebar');

  if (menuBtn) menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// ---- Dashboard ----
async function loadDashboard() {
  await loadLeads();
  updateStats();
}

function updateStats() {
  const total = allLeads.length;
  const today = allLeads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const sems = [...new Set(allLeads.map(l => l.semester))].length;

  qs('#stat-total') && (qs('#stat-total').textContent = total);
  qs('#stat-today') && (qs('#stat-today').textContent = today);
  qs('#stat-sems') && (qs('#stat-sems').textContent = sems || 0);
  qs('#stat-subjects') && (qs('#stat-subjects').textContent = [...new Set(allLeads.map(l => l.subject))].length || 0);
}

// ---- Load Leads ----
async function loadLeads() {
  const tbody = qs('#leads-tbody');
  if (!tbody) return;

  if (!supabase) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading">⚠️ Supabase not configured. Set your URL and key in admin.js</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="7" class="table-loading"><div class="spinner" style="margin:0 auto 8px;width:24px;height:24px;border-width:2px"></div>Loading leads…</td></tr>`;

  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allLeads = data || [];
    renderLeadsTable(allLeads);
    updateStats();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#ef4444">Error loading leads: ${e.message}</td></tr>`;
  }
}

function renderLeadsTable(leads) {
  const tbody = qs('#leads-tbody');
  if (!tbody) return;
  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading">No leads yet. Share your notes links to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td style="color:var(--gray-400);font-size:12px">${i+1}</td>
      <td><div class="lead-name">${l.name || '—'}</div></td>
      <td><div class="lead-mobile">${l.mobile || '—'}</div></td>
      <td><span class="badge badge-blue">Sem ${l.semester || '?'}</span></td>
      <td><span class="badge badge-purple">${l.subject ? (CONFIG.subjectLabels[l.subject] || l.subject) : '—'}</span></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--gray-500)">${l.note_title || '—'}</td>
      <td style="font-size:11.5px;color:var(--gray-400);white-space:nowrap">${formatDate(l.created_at)}</td>
      <td>
        <button class="delete-btn" onclick="deleteLead('${l.id}', this)" title="Delete">✕</button>
      </td>
    </tr>
  `).join('');
}

// ---- Delete Lead ----
async function deleteLead(id, btn) {
  if (!confirm('Delete this lead?')) return;
  if (!supabase) { showToast('Supabase not configured'); return; }

  btn.disabled = true;
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    allLeads = allLeads.filter(l => l.id != id);
    renderLeadsTable(allLeads);
    updateStats();
    showToast('Lead deleted');
  } catch(e) {
    showToast('Error: ' + e.message);
    btn.disabled = false;
  }
}

// ---- Search Leads ----
function initLeadSearch() {
  const input = qs('#lead-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderLeadsTable(allLeads); return; }
    const filtered = allLeads.filter(l =>
      (l.name||'').toLowerCase().includes(q) ||
      (l.mobile||'').includes(q) ||
      (l.subject||'').includes(q) ||
      String(l.semester||'').includes(q)
    );
    renderLeadsTable(filtered);
  });
}

// ---- Export CSV ----
function exportCSV() {
  if (!allLeads.length) { showToast('No leads to export'); return; }
  const headers = ['Name','Mobile','Semester','Subject','Note','Date'];
  const rows = allLeads.map(l => [
    l.name, l.mobile, l.semester, l.subject, l.note_title, formatDate(l.created_at)
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`));
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bsc-leads-${Date.now()}.csv`;
  a.click();
  showToast('CSV exported!');
}

// ---- Markdown Preview Editor ----
function initEditor() {
  const editor = qs('#md-editor');
  const preview = qs('#md-preview');
  if (!editor || !preview) return;

  function updatePreview() {
    if (typeof marked !== 'undefined') {
      preview.innerHTML = marked.parse(editor.value || '');
    }
  }

  editor.addEventListener('input', updatePreview);
  updatePreview();

  // Tab key support
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      const val = editor.value;
      editor.value = val.slice(0,s) + '  ' + val.slice(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 2;
      updatePreview();
    }
  });

  // Template insert
  const templateBtn = qs('#insert-template');
  if (templateBtn) {
    templateBtn.addEventListener('click', () => {
      const sem = qs('#gen-sem').value || '1';
      const sub = qs('#gen-sub').value || 'physics';
      const unit = qs('#gen-unit').value || '1';
      const subLabel = CONFIG.subjectLabels[sub] || sub;

      editor.value = `# ${subLabel} - Unit ${unit}

## Overview

Brief introduction to the topic covered in Unit ${unit}.

## Key Concepts

### Concept 1
Explanation of the first key concept.

### Concept 2
Explanation of the second key concept.

## Important Definitions

| Term | Definition |
|------|-----------|
| Term 1 | Definition here |
| Term 2 | Definition here |

## Summary

Key takeaways from Unit ${unit}.

## Practice Questions

1. Question one
2. Question two
3. Question three
`;
      updatePreview();
      showToast('Template inserted!');
    });
  }

  // Save to file button (simulated download)
  const saveBtn = qs('#save-md');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const sem = qs('#gen-sem').value || '1';
      const sub = qs('#gen-sub').value || 'physics';
      const unit = qs('#gen-unit').value || '1';
      const lang = qs('#gen-lang').value || 'en';
      const content = editor.value;
      if (!content.trim()) { showToast('Nothing to save'); return; }
      const blob = new Blob([content], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `unit${unit}-${lang}.md`;
      a.click();
      showToast(`Saved as unit${unit}-${lang}.md — place it in notes/sem${sem}/${sub}/`);
    });
  }
}

// ---- Link Generator ----
function initLinkGen() {
  const genBtn = qs('#gen-links-btn');
  const output = qs('#links-output');
  if (!genBtn || !output) return;

  genBtn.addEventListener('click', () => {
    const sem = qs('#link-sem').value;
    const sub = qs('#link-sub').value;
    const base = window.location.href.replace('admin.html','');

    const links = [];

    if (sub === 'all') {
      CONFIG.subjects.forEach(s => {
        for (let u = 1; u <= 5; u++) {
          links.push({ label: `${CONFIG.subjectLabels[s]} Unit ${u}`, url: `${base}notes.html?sem=${sem}&subject=${s}&note=unit${u}` });
        }
      });
    } else {
      for (let u = 1; u <= 5; u++) {
        links.push({ label: `${CONFIG.subjectLabels[sub]||sub} Unit ${u}`, url: `${base}notes.html?sem=${sem}&subject=${sub}&note=unit${u}` });
      }
    }

    output.innerHTML = links.map(l => `
      <div class="link-card">
        <div style="font-size:11.5px;font-weight:600;color:var(--gray-600);min-width:160px">${l.label}</div>
        <div class="link-url">${l.url}</div>
        <button class="copy-link-btn" onclick="copyLink(this, '${l.url}')">Copy</button>
      </div>
    `).join('');
  });
}

function copyLink(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

// ---- Init Selects ----
function initSelects() {
  // Populate sem selects
  document.querySelectorAll('.sem-select').forEach(sel => {
    sel.innerHTML = CONFIG.semLabels.map((l,i) => `<option value="${i+1}">Semester ${l}</option>`).join('');
  });

  // Populate subject selects
  document.querySelectorAll('.sub-select').forEach(sel => {
    const hasAll = sel.dataset.all === 'true';
    sel.innerHTML = (hasAll ? `<option value="all">All Subjects</option>` : '') +
      CONFIG.subjects.map(s => `<option value="${s}">${CONFIG.subjectLabels[s]}</option>`).join('');
  });

  // Unit selects
  document.querySelectorAll('.unit-select').forEach(sel => {
    sel.innerHTML = [1,2,3,4,5].map(u => `<option value="${u}">Unit ${u}</option>`).join('');
  });
}

// ---- Background ----
function initBg() {
  const bg = document.createElement('div');
  bg.className = 'bg-mesh';
  document.body.prepend(bg);
  ['blob-1','blob-2','blob-3'].forEach(cls => {
    const b = document.createElement('div');
    b.className = `blob ${cls}`;
    document.body.prepend(b);
  });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initBg();
  initSupabase();
  checkAuth();

  // Login form
  const loginBtn = qs('#login-btn');
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  qs('#admin-pass') && qs('#admin-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin(e);
  });

  // Logout
  const logoutBtn = qs('#logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  initSidebar();
  initSelects();
  initLeadSearch();
  initEditor();
  initLinkGen();

  // CSV export
  const csvBtn = qs('#export-csv');
  if (csvBtn) csvBtn.addEventListener('click', exportCSV);

  // Refresh leads
  const refreshBtn = qs('#refresh-leads');
  if (refreshBtn) refreshBtn.addEventListener('click', loadLeads);
});
