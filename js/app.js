/* =============================================
   BSc Notes Platform - Main App JavaScript
   FIXED: GitHub Pages compatible paths
   ============================================= */

const CONFIG = {
  semesters: 6,
  subjects: ['physics', 'chemistry', 'botany', 'zoology', 'maths'],
  subjectLabels: {
    physics: 'Physics', chemistry: 'Chemistry',
    botany: 'Botany', zoology: 'Zoology', maths: 'Mathematics'
  },
  subjectEmojis: {
    physics: '⚡', chemistry: '🧪',
    botany: '🌿', zoology: '🦋', maths: '📐'
  },
  units: 5,
  semLabels: ['I','II','III','IV','V','VI'],
  semEmojis: ['📗','📘','📙','📕','📓','📒']
};

// ---- Utilities ----
function qs(sel, ctx = document) { return ctx.querySelector(sel); }

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key) || '';
}

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function showToast(msg, duration = 3000) {
  let el = qs('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ---- Background Blobs ----
function initBg() {
  if (!qs('.bg-mesh')) {
    const bg = document.createElement('div');
    bg.className = 'bg-mesh';
    document.body.prepend(bg);
  }
  ['blob-1','blob-2','blob-3'].forEach(cls => {
    if (!qs('.' + cls)) {
      const b = document.createElement('div');
      b.className = `blob ${cls}`;
      document.body.prepend(b);
    }
  });
}

// ---- Navbar Search ----
function initSearch() {
  const input   = qs('#nav-search-input');
  const results = qs('#search-results');
  if (!input || !results) return;

  // Pre-build search index
  const all = [];
  for (let s = 1; s <= CONFIG.semesters; s++) {
    CONFIG.subjects.forEach(sub => {
      for (let u = 1; u <= CONFIG.units; u++) {
        all.push({
          label: `${CONFIG.subjectLabels[sub]} Unit ${u}`,
          sub: `Semester ${s}`,
          url: `notes.html?sem=${s}&subject=${sub}&note=unit${u}`,
          icon: CONFIG.subjectEmojis[sub]
        });
      }
    });
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = 'none'; return; }
    const hits = all.filter(i =>
      i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)
    ).slice(0, 8);
    if (!hits.length) { results.style.display = 'none'; return; }
    results.innerHTML = hits.map(h => `
      <a href="${h.url}" class="search-result-item">
        <div class="search-result-icon">${h.icon}</div>
        <div>
          <div style="font-weight:600;color:var(--gray-800);font-size:13px">${h.label}</div>
          <div style="font-size:11px;color:var(--gray-400)">${h.sub}</div>
        </div>
      </a>
    `).join('');
    results.style.display = 'block';
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = 'none';
    }
  });

  // Keyboard: Escape closes
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { results.style.display = 'none'; input.blur(); }
  });
}

// ---- Semester Grid ----
function renderSemGrid(container) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= CONFIG.semesters; i++) {
    const card = document.createElement('a');
    card.href = `semester.html?sem=${i}`;
    card.className = 'sem-card glass-card';
    card.innerHTML = `
      <div class="sem-card-icon">${CONFIG.semEmojis[i-1]}</div>
      <div class="sem-card-title">Semester ${CONFIG.semLabels[i-1]}</div>
      <div class="sem-card-sub">5 Subjects · 5 Units</div>
    `;
    container.appendChild(card);
  }
}

// ---- Subject Grid ----
function renderSubjectGrid(container, sem) {
  if (!container) return;
  container.innerHTML = '';
  const bgs = ['bg-physics','bg-chemistry','bg-botany','bg-zoology','bg-maths'];

  CONFIG.subjects.forEach((sub, idx) => {
    const card = document.createElement('a');
    card.href = `subject.html?sem=${sem}&subject=${sub}`;
    card.className = 'subject-card glass-card';
    card.innerHTML = `
      <div class="subject-icon ${bgs[idx]}">${CONFIG.subjectEmojis[sub]}</div>
      <div class="subject-name">${CONFIG.subjectLabels[sub]}</div>
      <div class="subject-meta">5 Units &bull; Sem ${CONFIG.semLabels[sem-1]}</div>
      <div class="subject-arrow">›</div>
    `;
    container.appendChild(card);
  });
}

// ---- Unit List ----
function renderUnitList(container, sem, subject) {
  if (!container) return;
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'unit-list';

  for (let u = 1; u <= CONFIG.units; u++) {
    const item = document.createElement('a');
    item.href = `notes.html?sem=${sem}&subject=${subject}&note=unit${u}`;
    item.className = 'unit-item';
    item.innerHTML = `
      <div class="unit-num">${u}</div>
      <div class="unit-info">
        <div class="unit-title">Unit ${u}</div>
        <div class="unit-desc">${CONFIG.subjectLabels[subject]} &bull; Semester ${sem}</div>
      </div>
      <div class="unit-badge">Read →</div>
    `;
    list.appendChild(item);
  }
  container.appendChild(list);
}

// ---- Breadcrumb ----
function renderBreadcrumb(container, parts) {
  if (!container) return;
  container.innerHTML = parts.map((p, i) =>
    i < parts.length - 1
      ? `<a href="${p.url}">${p.label}</a><span>›</span>`
      : `<span class="current">${p.label}</span>`
  ).join('');
}

// ---- Init per page ----
document.addEventListener('DOMContentLoaded', () => {
  initBg();
  initSearch();

  const page = document.body.dataset.page;

  // ---------- HOME ----------
  if (page === 'home') {
    renderSemGrid(qs('#sem-grid'));
  }

  // ---------- SEMESTER ----------
  if (page === 'semester') {
    const sem = parseInt(getParam('sem')) || 1;
    renderSubjectGrid(qs('#subject-grid'), sem);
    renderSemGrid(qs('#sem-grid'));
    renderBreadcrumb(qs('#breadcrumb'), [
      { label: 'Home', url: 'index.html' },
      { label: `Semester ${CONFIG.semLabels[sem-1]}`, url: '#' }
    ]);
    const title = qs('.page-title');
    if (title) title.textContent = `Semester ${CONFIG.semLabels[sem-1]}`;
    document.title = `Semester ${sem} | BScNotes`;
  }

  // ---------- SUBJECT ----------
  if (page === 'subject') {
    const sem     = parseInt(getParam('sem')) || 1;
    const subject = getParam('subject') || 'physics';
    renderUnitList(qs('#unit-list'), sem, subject);
    renderBreadcrumb(qs('#breadcrumb'), [
      { label: 'Home', url: 'index.html' },
      { label: `Semester ${CONFIG.semLabels[sem-1]}`, url: `semester.html?sem=${sem}` },
      { label: CONFIG.subjectLabels[subject], url: '#' }
    ]);
    const title = qs('.page-title');
    if (title) title.innerHTML = `${CONFIG.subjectEmojis[subject]} ${CONFIG.subjectLabels[subject]}`;
    const subtitle = qs('.page-subtitle');
    if (subtitle) subtitle.textContent = `Semester ${CONFIG.semLabels[sem-1]} · 5 Units`;
    document.title = `${CONFIG.subjectLabels[subject]} | Sem ${sem} | BScNotes`;
  }
});
