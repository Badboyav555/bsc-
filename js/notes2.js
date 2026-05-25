/* =============================================
   BSc Notes Platform - Notes Page JavaScript
   FIXED: GitHub Pages path + fetch issues
   ============================================= */

// ---- Supabase Config ---- (User must fill these in)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;

function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined' &&
        SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch(e) {
    console.warn('Supabase not initialized:', e);
  }
}

// ---- GITHUB PAGES PATH FIX ----
// Automatically detects base path whether hosted on:
// - GitHub Pages: https://user.github.io/repo-name/
// - Netlify/Vercel: https://site.netlify.app/
// - Local: http://localhost:5500/
function getBasePath() {
  const scripts = document.querySelectorAll('script[src]');
  for (const s of scripts) {
    // Find notes.js src and derive root from it
    if (s.src && s.src.includes('js/notes.js')) {
      // e.g. https://user.github.io/bsc-notes/js/notes.js
      // -> https://user.github.io/bsc-notes/
      return s.src.replace('js/notes.js', '');
    }
  }
  // Fallback: use current page location minus the html file
  const loc = window.location.href;
  return loc.substring(0, loc.lastIndexOf('/') + 1);
}

// ---- Helpers ----
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key) || '';
}
function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

const CONFIG = {
  subjectLabels: {
    physics: 'Physics', chemistry: 'Chemistry',
    botany: 'Botany', zoology: 'Zoology', maths: 'Mathematics'
  },
  subjectEmojis: {
    physics: '⚡', chemistry: '🧪',
    botany: '🌿', zoology: '🦋', maths: '📐'
  },
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

// ---- Unlock helpers ----
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

// ---- Build TOC ----
function buildTOC(container) {
  const toc = qs('#toc-list');
  if (!toc) return;
  const headings = container.querySelectorAll('h2, h3');
  if (!headings.length) {
    const tocWrap = qs('.notes-toc');
    if (tocWrap) tocWrap.style.display = 'none';
    return;
  }
  toc.innerHTML = '';
  headings.forEach((h, i) => {
    if (!h.id) h.id = 'h-' + i;
    const li = document.createElement('li');
    li.className = 'toc-item ' + h.tagName.toLowerCase();
    li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
    toc.appendChild(li);
  });
  // Highlight on scroll
  const items = [...toc.querySelectorAll('.toc-item')];
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        items.forEach(i => i.classList.remove('active'));
        const match = items.find(i =>
          qs('a', i).getAttribute('href') === '#' + entry.target.id
        );
        if (match) match.classList.add('active');
      }
    });
  }, { rootMargin: '-25% 0px -65% 0px' });
  headings.forEach(h => obs.observe(h));
}

// ---- Copy buttons for code blocks ----
function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      const code = pre.querySelector('code');
      navigator.clipboard.writeText(code ? code.textContent : pre.textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ---- Wrap tables for horizontal scroll ----
function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

// ---- Image zoom ----
function initImageZoom() {
  const modal = qs('#img-modal');
  const modalImg = modal ? modal.querySelector('img') : null;
  const closeBtn = qs('#img-modal-close');
  if (!modal || !modalImg) return;

  document.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && e.target.closest('.notes-markdown')) {
      modalImg.src = e.target.src;
      modal.classList.add('open');
    }
  });
  closeBtn && closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

// ---- Render Markdown ----
function renderMarkdown(md, partial = false) {
  let content = md;
  if (partial) {
    const lines = md.split('\n');
    const cutoff = Math.max(12, Math.floor(lines.length * 0.30));
    content = lines.slice(0, cutoff).join('\n');
  }
  if (typeof marked === 'undefined') {
    return '<p style="color:red">marked.js not loaded. Check CDN.</p>';
  }
  marked.setOptions({ breaks: true, gfm: true });
  return marked.parse(content);
}

// ---- Display Content (with or without unlock wall) ----
function displayContent(md) {
  const body = qs('#notes-body');
  if (!body) return;
  state.rawMarkdown = md;

  if (isUnlocked()) {
    // Full content
    body.innerHTML = `<div class="notes-markdown" id="md-content">${renderMarkdown(md)}</div>`;
    addCopyButtons(body);
    wrapTables(body);
    buildTOC(body);
  } else {
    // 30% preview + unlock wall
    body.innerHTML = `
      <div class="content-preview">
        <div class="notes-markdown" id="md-content">${renderMarkdown(md, true)}</div>
        <div class="content-blur-overlay"></div>
      </div>
      <div class="unlock-popup">
        <div class="unlock-card">
          <div class="unlock-icon">🔓</div>
          <div class="unlock-title">Unlock Full Notes</div>
          <div class="unlock-desc">Enter your details to get instant access — no OTP, no password needed.</div>
          <div class="unlock-form">
            <div class="form-group">
              <label>Your Name</label>
              <input class="form-input" id="unlock-name" type="text" placeholder="Enter your name" />
            </div>
            <div class="form-group">
              <label>Mobile Number</label>
              <input class="form-input" id="unlock-mobile" type="tel" placeholder="10-digit number" maxlength="10" />
            </div>
            <button class="unlock-submit" id="unlock-btn">Unlock Full Notes →</button>
            <div class="unlock-note">🔒 Safe & private. No spam ever.</div>
          </div>
        </div>
      </div>
    `;
    addCopyButtons(body);
    wrapTables(body);
    qs('#unlock-btn').addEventListener('click', handleUnlock);
    qs('#unlock-mobile').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
  }
}

// ---- Handle Unlock ----
async function handleUnlock() {
  const name   = (qs('#unlock-name')?.value   || '').trim();
  const mobile = (qs('#unlock-mobile')?.value || '').trim();
  const btn    = qs('#unlock-btn');

  if (!name)                        { showToast('Please enter your name'); return; }
  if (!/^\d{10}$/.test(mobile))    { showToast('Enter valid 10-digit mobile'); return; }

  btn.disabled    = true;
  btn.textContent = 'Unlocking…';

  try {
    if (supabase) {
      await supabase.from('leads').insert([{
        name, mobile,
        semester:   state.sem,
        subject:    state.subject,
        note_title: state.noteTitle || state.note
      }]);
    }
  } catch(e) { console.warn('Supabase save error:', e); }

  saveUnlock();
  showToast('Notes unlocked! 🎉');
  displayContent(state.rawMarkdown);
}

// ---- Toast ----
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

// ---- MAIN: Load Markdown with GitHub Pages fix ----
async function loadNotes(lang = 'en') {
  const body = qs('#notes-body');
  if (!body) return;

  // Build absolute path — works on GitHub Pages, Netlify, localhost
  const base     = getBasePath();
  const filePath = `notes/sem${state.sem}/${state.subject}/${state.note}-${lang}.md`;
  const fullURL  = base + filePath;

  console.log('[BScNotes] Fetching:', fullURL); // debug — visible in F12 console

  body.innerHTML = `
    <div class="notes-loading">
      <div class="spinner"></div>
      <div class="loading-text">Loading notes…</div>
    </div>
  `;

  try {
    const res = await fetch(fullURL, {
      method: 'GET',
      headers: { 'Accept': 'text/plain, text/markdown, */*' },
      cache: 'no-cache'
    });

    if (!res.ok) {
      throw new Error(`File not found (HTTP ${res.status}) — ${fullURL}`);
    }

    const md = await res.text();

    if (!md || md.trim().length < 5) {
      throw new Error('File is empty');
    }

    // Extract first heading as title
    const titleMatch = md.match(/^#\s+(.+)/m);
    state.noteTitle  = titleMatch ? titleMatch[1] : `${cap(state.subject)} ${state.note}`;
    const titleEl    = qs('#notes-title');
    if (titleEl) titleEl.textContent = state.noteTitle;
    document.title   = `${state.noteTitle} | BScNotes`;

    displayContent(md);

  } catch(e) {
    console.error('[BScNotes] Fetch error:', e.message);
    const unitNum = state.note.replace('unit', '');
    body.innerHTML = `
      <div class="notes-error">
        <div class="error-icon">📄</div>
        <div class="error-title">Notes Not Found</div>
        <div class="error-desc">
          Could not load <strong>${CONFIG.subjectLabels[state.subject] || state.subject} — Unit ${unitNum}</strong>.<br><br>
          <strong>Possible reasons:</strong><br>
          • File not uploaded to GitHub yet<br>
          • Wrong filename (must be <code>unit${unitNum}-en.md</code>)<br>
          • Wrong folder path<br><br>
          Expected file location:<br>
          <code style="font-size:12px;background:#f0f2f7;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px">
            notes/sem${state.sem}/${state.subject}/unit${unitNum}-${lang}.md
          </code>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn-primary" onclick="loadNotes('${lang}')">↺ Retry</button>
          <a href="subject.html?sem=${state.sem}&subject=${state.subject}" class="btn btn-ghost">← Back to Units</a>
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

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initBg();
  initSupabase();
  initProgressBar();
  initImageZoom();
  initLangToggle();

  const semLabel = CONFIG.semLabels[state.sem - 1] || state.sem;
  const subLabel = CONFIG.subjectLabels[state.subject] || state.subject;
  const unitNum  = state.note.replace('unit', '');

  // Breadcrumb
  const bc = qs('#breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">Home</a><span>›</span>
    <a href="semester.html?sem=${state.sem}">Semester ${semLabel}</a><span>›</span>
    <a href="subject.html?sem=${state.sem}&subject=${state.subject}">${subLabel}</a><span>›</span>
    <span class="current">Unit ${unitNum}</span>
  `;

  // Meta tags
  const metaEl = qs('#notes-meta');
  if (metaEl) metaEl.innerHTML = `
    <span class="meta-tag">Sem ${semLabel}</span>
    <span class="meta-tag">${subLabel}</span>
    <span class="meta-tag">Unit ${unitNum}</span>
  `;

  document.title = `${subLabel} Unit ${unitNum} | Sem ${semLabel} | BScNotes`;

  loadNotes('en');
});
