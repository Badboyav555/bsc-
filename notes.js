/* =============================================
   BSc Notes Platform - Notes Page JavaScript
   ============================================= */

// ---- Supabase Config ---- (User must fill these in)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;

function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch(e) {
    console.warn('Supabase not initialized:', e);
  }
}

// ---- Helpers ----
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key) || '';
}
function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

const CONFIG = {
  subjectLabels: { physics:'Physics', chemistry:'Chemistry', botany:'Botany', zoology:'Zoology', maths:'Mathematics' },
  subjectEmojis: { physics:'⚡', chemistry:'🧪', botany:'🌿', zoology:'🦋', maths:'📐' },
  semLabels: ['I','II','III','IV','V','VI']
};

// ---- State ----
const state = {
  sem: parseInt(getParam('sem')) || 1,
  subject: getParam('subject') || 'physics',
  note: getParam('note') || 'unit1',
  lang: 'en',
  unlocked: false,
  rawMarkdown: '',
  noteTitle: ''
};

// ---- Check unlock from localStorage ----
function getUnlockKey() {
  return `unlocked_sem${state.sem}_${state.subject}_${state.note}`;
}

function isUnlocked() {
  return localStorage.getItem(getUnlockKey()) === 'true';
}

function saveUnlock() {
  localStorage.setItem(getUnlockKey(), 'true');
  state.unlocked = true;
}

// ---- Reading Progress Bar ----
function initProgressBar() {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.id = 'reading-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const el = qs('.notes-body');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const totalH = el.offsetHeight;
    const scrolled = Math.max(0, -rect.top);
    const pct = Math.min(100, (scrolled / Math.max(1, totalH - window.innerHeight)) * 100);
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ---- Build TOC from rendered HTML ----
function buildTOC(content) {
  const toc = qs('#toc-list');
  if (!toc) return;
  const headings = content.querySelectorAll('h2, h3');
  if (!headings.length) { qs('.notes-toc') && (qs('.notes-toc').style.display = 'none'); return; }

  toc.innerHTML = '';
  headings.forEach((h, i) => {
    if (!h.id) h.id = `heading-${i}`;
    const li = document.createElement('li');
    li.className = `toc-item ${h.tagName.toLowerCase()}`;
    li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
    toc.appendChild(li);
  });

  // Highlight active
  const items = toc.querySelectorAll('.toc-item');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        items.forEach(i => i.classList.remove('active'));
        const match = [...items].find(i => qs('a', i).getAttribute('href') === '#' + entry.target.id);
        if (match) match.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  headings.forEach(h => obs.observe(h));
}

// ---- Add copy buttons to code blocks ----
function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      navigator.clipboard.writeText(code ? code.textContent : pre.textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ---- Wrap tables for scroll ----
function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    if (!table.parentElement.classList.contains('table-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
  });
}

// ---- Image zoom ----
function initImageZoom() {
  const modal = qs('#img-modal');
  const modalImg = qs('#img-modal img');
  const closeBtn = qs('#img-modal-close');
  if (!modal) return;

  document.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && e.target.closest('.notes-markdown')) {
      modalImg.src = e.target.src;
      modal.classList.add('open');
    }
  });

  closeBtn && closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

// ---- Render Markdown ----
function renderMarkdown(md, partial = false) {
  let content = md;

  if (partial) {
    // Show only ~30% of content
    const lines = md.split('\n');
    const cutoff = Math.max(10, Math.floor(lines.length * 0.30));
    content = lines.slice(0, cutoff).join('\n');
  }

  if (typeof marked === 'undefined') return `<p>${content}</p>`;

  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true
  });

  return marked.parse(content);
}

// ---- Display Content ----
function displayContent(md) {
  const body = qs('#notes-body');
  if (!body) return;

  state.rawMarkdown = md;
  const unlocked = isUnlocked();

  if (unlocked) {
    // Full content
    body.innerHTML = `<div class="notes-markdown" id="md-content">${renderMarkdown(md)}</div>`;
    const mdEl = qs('#md-content', body);
    addCopyButtons(body);
    wrapTables(body);
    buildTOC(body);
  } else {
    // Partial preview with unlock wall
    body.innerHTML = `
      <div class="content-preview">
        <div class="notes-markdown" id="md-content">${renderMarkdown(md, true)}</div>
        <div class="content-blur-overlay"></div>
      </div>
      <div class="unlock-popup">
        <div class="unlock-card">
          <div class="unlock-icon">🔓</div>
          <div class="unlock-title">Unlock Full Notes</div>
          <div class="unlock-desc">Enter your details to get instant access to the complete notes — no OTP, no password required.</div>
          <div class="unlock-form" id="unlock-form">
            <div class="form-group">
              <label>Your Name</label>
              <input class="form-input" id="unlock-name" type="text" placeholder="Enter your name" required />
            </div>
            <div class="form-group">
              <label>Mobile Number</label>
              <input class="form-input" id="unlock-mobile" type="tel" placeholder="Enter 10-digit number" required maxlength="10" />
            </div>
            <button class="unlock-submit" id="unlock-btn" type="button">Unlock Full Notes →</button>
            <div class="unlock-note">🔒 Your details are safe. No spam, ever.</div>
          </div>
        </div>
      </div>
    `;
    const mdEl = qs('#md-content', body);
    addCopyButtons(body);
    wrapTables(body);

    qs('#unlock-btn').addEventListener('click', handleUnlock);
    qs('#unlock-mobile').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g,'').slice(0,10);
    });
  }
}

// ---- Handle Unlock ----
async function handleUnlock() {
  const name = (qs('#unlock-name').value || '').trim();
  const mobile = (qs('#unlock-mobile').value || '').trim();
  const btn = qs('#unlock-btn');

  if (!name) { showToast('Please enter your name'); qs('#unlock-name').focus(); return; }
  if (!/^\d{10}$/.test(mobile)) { showToast('Enter a valid 10-digit mobile number'); qs('#unlock-mobile').focus(); return; }

  btn.disabled = true;
  btn.textContent = 'Unlocking...';

  // Save lead to Supabase
  try {
    if (supabase) {
      await supabase.from('leads').insert([{
        name,
        mobile,
        semester: state.sem,
        subject: state.subject,
        note_title: state.noteTitle || state.note
      }]);
    }
  } catch(e) {
    console.warn('Supabase save error:', e);
  }

  // Unlock regardless
  saveUnlock();
  showToast('Notes unlocked! Enjoy reading 🎉');
  displayContent(state.rawMarkdown);
  buildTOC(qs('#notes-body'));
}

// ---- Show Toast ----
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

// ---- Load Markdown ----
async function loadNotes(lang = 'en') {
  const body = qs('#notes-body');
  const path = `notes/sem${state.sem}/${state.subject}/${state.note}-${lang}.md`;

  // Show loading
  body.innerHTML = `
    <div class="notes-loading">
      <div class="spinner"></div>
      <div class="loading-text">Loading notes…</div>
    </div>
  `;

  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    if (!md || md.trim().length < 10) throw new Error('Empty content');

    // Extract title from first # heading
    const titleMatch = md.match(/^#\s+(.+)/m);
    state.noteTitle = titleMatch ? titleMatch[1] : `${cap(state.subject)} ${state.note}`;
    const titleEl = qs('#notes-title');
    if (titleEl) titleEl.textContent = state.noteTitle;

    displayContent(md);
  } catch(e) {
    const unitNum = state.note.replace('unit','');
    body.innerHTML = `
      <div class="notes-error">
        <div class="error-icon">📄</div>
        <div class="error-title">Notes Not Available Yet</div>
        <div class="error-desc">
          The notes for <strong>${CONFIG.subjectLabels[state.subject] || state.subject} Unit ${unitNum}</strong>
          are being prepared. Check back soon!
        </div>
        <button class="btn btn-primary" onclick="loadNotes(state.lang)">↺ Retry</button>
        <div style="margin-top:12px">
          <a href="subject.html?sem=${state.sem}&subject=${state.subject}" class="btn btn-ghost btn-sm">← Back to Units</a>
        </div>
      </div>
    `;
  }
}

// ---- Language Toggle ----
function initLangToggle() {
  const enBtn = qs('#lang-en');
  const hiBtn = qs('#lang-hi');
  if (!enBtn || !hiBtn) return;

  enBtn.addEventListener('click', () => {
    state.lang = 'en';
    enBtn.classList.add('active');
    hiBtn.classList.remove('active');
    loadNotes('en');
  });

  hiBtn.addEventListener('click', () => {
    state.lang = 'hi';
    hiBtn.classList.add('active');
    enBtn.classList.remove('active');
    loadNotes('hi');
  });
}

// ---- Background blobs ----
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
  initProgressBar();
  initImageZoom();
  initLangToggle();

  // Set breadcrumb & meta tags
  const semLabel = CONFIG.semLabels[state.sem - 1] || state.sem;
  const subLabel = CONFIG.subjectLabels[state.subject] || state.subject;
  const unitNum = state.note.replace('unit','');

  const bc = qs('#breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">Home</a><span>›</span>
    <a href="semester.html?sem=${state.sem}">Semester ${semLabel}</a><span>›</span>
    <a href="subject.html?sem=${state.sem}&subject=${state.subject}">${subLabel}</a><span>›</span>
    <span class="current">Unit ${unitNum}</span>
  `;

  // Set meta tags in header card
  const metaEl = qs('#notes-meta');
  if (metaEl) metaEl.innerHTML = `
    <span class="meta-tag">Sem ${semLabel}</span>
    <span class="meta-tag">${subLabel}</span>
    <span class="meta-tag">Unit ${unitNum}</span>
  `;

  document.title = `${subLabel} Unit ${unitNum} | Sem ${semLabel} | BScNotes`;

  loadNotes('en');
});
