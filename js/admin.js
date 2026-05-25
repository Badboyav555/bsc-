/* =============================================
   BScNotes — admin.js (Fixed Blank Screen)
   ============================================= */

// ── Config ────────────────────────────────────
const SUPABASE_URL    = 'https://yiucvqmtumyslcblowop.supabase.co';
const SUPABASE_KEY    = 'sb_publishable_Oc2bWjEsfLDWCLU7dVuFAQ_Ofj5nrNq';
const ADMIN_PASSWORD  = 'admin@bsc2024';

let _sb      = null;
let allLeads = [];

// ── Helpers ───────────────────────────────────
const $   = sel => document.querySelector(sel);
const $$  = sel => [...document.querySelectorAll(sel)];
const qs  = $; // alias

function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

// ── Supabase ──────────────────────────────────
function initSupabase() {
  try {
    if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
      _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch(e) {}
}

// ── Auth ──────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem('admin_auth') === 'true';
}

function showLogin() {
  $('#admin-login').style.display = 'flex';
  $('#admin-app').style.display   = 'none';
}

function showApp() {
  $('#admin-login').style.display = 'none';
  $('#admin-app').style.display   = 'grid';
  loadDashboard();
}

function checkAuth() {
  isLoggedIn() ? showApp() : showLogin();
}

function handleLogin() {
  const pass = ($('#admin-pass').value || '').trim();
  if (pass === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', 'true');
    $('#login-error').style.display = 'none';
    showApp();
  } else {
    $('#login-error').style.display = 'block';
    $('#login-error').textContent   = 'Incorrect password. Try again.';
  }
}

function handleLogout() {
  sessionStorage.removeItem('admin_auth');
  showLogin();
}

// ── Config ────────────────────────────────────
const SUBJECTS = ['physics','chemistry','botany','zoology','maths'];
const SUB_LABELS = {
  physics:'Physics', chemistry:'Chemistry',
  botany:'Botany', zoology:'Zoology', maths:'Mathematics'
};
const SEM_LABELS = ['I','II','III','IV','V','VI'];

// ── Sidebar nav ───────────────────────────────
function initSidebar() {
  $$('.sidebar-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      $$('.sidebar-item').forEach(i => i.classList.remove('active'));
      $$('.admin-content').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      const panel = $(`#panel-${tab}`);
      if (panel) panel.classList.add('active');
      const title = $('.topbar-title');
      if (title) title.textContent = item.querySelector('span:last-child')?.textContent || tab;
      // close mobile sidebar
      $('.admin-sidebar')?.classList.remove('open');
      $('.sidebar-overlay')?.classList.remove('show');
    });
  });

  // Mobile toggle
  $('#sidebar-toggle')?.addEventListener('click', () => {
    $('.admin-sidebar')?.classList.toggle('open');
    $('.sidebar-overlay')?.classList.toggle('show');
  });
  $('.sidebar-overlay')?.addEventListener('click', () => {
    $('.admin-sidebar')?.classList.remove('open');
    $('.sidebar-overlay')?.classList.remove('show');
  });
}

// ── Dashboard ─────────────────────────────────
async function loadDashboard() {
  await loadLeads();
  updateStats();
}

function updateStats() {
  const total = allLeads.length;
  const today = allLeads.filter(l => {
    if (!l.created_at) return false;
    return new Date(l.created_at).toDateString() === new Date().toDateString();
  }).length;
  const sems  = new Set(allLeads.map(l => l.semester)).size;
  const subs  = new Set(allLeads.map(l => l.subject)).size;

  const set = (id, val) => { const el=$(id); if(el) el.textContent=val; };
  set('#stat-total',    total);
  set('#stat-today',    today);
  set('#stat-sems',     sems  || 0);
  set('#stat-subjects', subs  || 0);
}

// ── Leads ─────────────────────────────────────
async function loadLeads() {
  const tbody = $('#leads-tbody');
  if (!tbody) return;

  if (!_sb) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">
      ⚠️ Supabase not configured — set your URL and key in admin.js
    </td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8" class="table-loading">Loading…</td></tr>`;

  try {
    const { data, error } = await _sb
      .from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allLeads = data || [];
    renderLeads(allLeads);
    updateStats();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading" style="color:#ef4444">
      Error: ${e.message}
    </td></tr>`;
  }
}

function renderLeads(leads) {
  const tbody = $('#leads-tbody');
  if (!tbody) return;
  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No leads yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td style="color:var(--gray-400);font-size:12px">${i+1}</td>
      <td><strong>${l.name||'—'}</strong></td>
      <td style="font-family:monospace;font-size:12.5px">${l.mobile||'—'}</td>
      <td><span class="badge badge-blue">Sem ${l.semester||'?'}</span></td>
      <td><span class="badge badge-purple">${SUB_LABELS[l.subject]||l.subject||'—'}</span></td>
      <td style="font-size:12px;color:var(--gray-500);max-width:140px;overflow:hidden;
                 text-overflow:ellipsis;white-space:nowrap">${l.note_title||'—'}</td>
      <td style="font-size:11.5px;color:var(--gray-400);white-space:nowrap">
        ${formatDate(l.created_at)}
      </td>
      <td>
        <button class="delete-btn" onclick="deleteLead('${l.id}',this)">✕</button>
      </td>
    </tr>`).join('');
}

async function deleteLead(id, btn) {
  if (!confirm('Delete this lead?')) return;
  if (!_sb) { toast('Supabase not configured'); return; }
  btn.disabled = true;
  try {
    const { error } = await _sb.from('leads').delete().eq('id', id);
    if (error) throw error;
    allLeads = allLeads.filter(l => String(l.id) !== String(id));
    renderLeads(allLeads);
    updateStats();
    toast('Lead deleted');
  } catch(e) {
    toast('Error: ' + e.message);
    btn.disabled = false;
  }
}

function initLeadSearch() {
  const input = $('#lead-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderLeads(allLeads); return; }
    renderLeads(allLeads.filter(l =>
      (l.name||'').toLowerCase().includes(q) ||
      (l.mobile||'').includes(q) ||
      (l.subject||'').toLowerCase().includes(q) ||
      String(l.semester||'').includes(q)
    ));
  });
}

// ── Export CSV ────────────────────────────────
function exportCSV() {
  if (!allLeads.length) { toast('No leads to export'); return; }
  const headers = ['Name','Mobile','Semester','Subject','Note','Date'];
  const rows = allLeads.map(l => [
    l.name, l.mobile, l.semester, l.subject, l.note_title, formatDate(l.created_at)
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`));
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `bsc-leads-${Date.now()}.csv`;
  a.click();
  toast('CSV exported!');
}

// ── Markdown Editor ───────────────────────────
function initEditor() {
  const editor  = $('#md-editor');
  const preview = $('#md-preview');
  if (!editor || !preview) return;

  function updatePreview() {
    if (typeof marked !== 'undefined') {
      preview.innerHTML = marked.parse(editor.value || '');
    } else {
      preview.textContent = editor.value;
    }
  }

  editor.addEventListener('input', updatePreview);
  updatePreview();

  // Tab key support in editor
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value = editor.value.slice(0,s) + '  ' + editor.value.slice(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 2;
      updatePreview();
    }
  });

  // Load template
  $('#insert-template')?.addEventListener('click', () => {
    const sem = $('#gen-sem')?.value || '1';
    const sub = $('#gen-sub')?.value || 'physics';
    const unit= $('#gen-unit')?.value|| '1';
    editor.value = `# ${SUB_LABELS[sub]||sub} — Unit ${unit}\n\n## Overview\nBrief introduction to Unit ${unit}.\n\n---\n\n## Key Concepts\n\n### Concept 1\nExplanation here.\n\n### Concept 2\nExplanation here.\n\n## Important Definitions\n\n| Term | Definition |\n|------|------------|\n| Term 1 | Definition here |\n\n## Summary\nKey takeaways from Unit ${unit}.\n\n## Practice Questions\n\n1. Question one\n2. Question two\n3. Question three\n`;
    updatePreview();
    toast('Template loaded!');
  });

  // Download .md file
  $('#save-md')?.addEventListener('click', () => {
    const sem  = $('#gen-sem')?.value || '1';
    const sub  = $('#gen-sub')?.value || 'physics';
    const unit = $('#gen-unit')?.value|| '1';
    const lang = $('#gen-lang')?.value|| 'en';
    if (!editor.value.trim()) { toast('Nothing to save'); return; }
    const blob = new Blob([editor.value], { type:'text/markdown' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `unit${unit}-${lang}.md`;
    a.click();
    toast(`Saved! Place in: notes/sem${sem}/${sub}/`);
  });
}

// ── Link Generator ────────────────────────────
function initLinkGen() {
  $('#gen-links-btn')?.addEventListener('click', () => {
    const sem    = $('#link-sem')?.value || '1';
    const sub    = $('#link-sub')?.value || 'all';
    const base   = window.location.href.replace('admin.html','');
    const output = $('#links-output');
    if (!output) return;

    const links = [];
    const subs  = sub === 'all' ? SUBJECTS : [sub];
    subs.forEach(s => {
      for (let u = 1; u <= 5; u++) {
        links.push({
          label: `${SUB_LABELS[s]} Unit ${u}`,
          url: `${base}notes.html?sem=${sem}&subject=${s}&note=unit${u}`
        });
      }
    });

    output.innerHTML = links.map(l => `
      <div class="link-card">
        <div style="font-size:11.5px;font-weight:600;color:var(--gray-600);
                    min-width:150px;white-space:nowrap">${l.label}</div>
        <div class="link-url">${l.url}</div>
        <button class="copy-link-btn" onclick="
          navigator.clipboard.writeText('${l.url}');
          this.textContent='Copied!';
          setTimeout(()=>this.textContent='Copy',2000)
        ">Copy</button>
      </div>`).join('');
  });
}

// ── Populate selects ──────────────────────────
function initSelects() {
  $$('.sem-select').forEach(sel => {
    sel.innerHTML = SEM_LABELS.map((l,i) =>
      `<option value="${i+1}">Semester ${l}</option>`).join('');
  });
  $$('.sub-select').forEach(sel => {
    const hasAll = sel.dataset.all === 'true';
    sel.innerHTML = (hasAll ? `<option value="all">All Subjects</option>` : '') +
      SUBJECTS.map(s => `<option value="${s}">${SUB_LABELS[s]}</option>`).join('');
  });
  $$('.unit-select').forEach(sel => {
    sel.innerHTML = [1,2,3,4,5].map(u =>
      `<option value="${u}">Unit ${u}</option>`).join('');
  });
}

// ── Background blobs ──────────────────────────
function initBg() {
  if (!$('.bg-mesh')) {
    const bg = document.createElement('div');
    bg.className = 'bg-mesh';
    document.body.prepend(bg);
  }
  ['blob-1','blob-2','blob-3'].forEach(c => {
    if (!$('.'+c)) {
      const b = document.createElement('div');
      b.className = 'blob ' + c;
      document.body.prepend(b);
    }
  });
}

// ── Check mobile sidebar visibility ──────────
function checkMobile() {
  const btn = $('#sidebar-toggle');
  if (btn) btn.style.display = window.innerWidth <= 900 ? 'flex' : 'none';
}

// ── DOMContentLoaded ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBg();
  initSupabase();

  // Show correct screen first
  checkAuth();

  // Login events
  $('#login-btn')?.addEventListener('click', handleLogin);
  $('#admin-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Logout
  $('#logout-btn')?.addEventListener('click', handleLogout);

  // App init
  initSidebar();
  initSelects();
  initLeadSearch();
  initEditor();
  initLinkGen();

  // CSV buttons (all of them)
  $$('#export-csv, #export-csv2, #export-csv3').forEach(btn => {
    btn?.addEventListener('click', exportCSV);
  });

  // Refresh buttons
  $$('#refresh-leads, #refresh-leads2').forEach(btn => {
    btn?.addEventListener('click', loadLeads);
  });

  // Mobile
  checkMobile();
  window.addEventListener('resize', checkMobile);
});
