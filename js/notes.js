/* =============================================
   BScNotes — notes.js  (Stable Final Version)
   No CDN waiting, no loading race conditions
   ============================================= */

// ── Supabase (optional) ───────────────────────
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
let _sb = null;
function initSupabase() {
  try {
    if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
      _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch(e) {}
}

// ── Helpers ───────────────────────────────────
const $   = (sel, ctx) => (ctx || document).querySelector(sel);
const getP = k => new URLSearchParams(location.search).get(k) || '';
const cap  = s => s ? s[0].toUpperCase() + s.slice(1) : '';

// ── Config ────────────────────────────────────
const LABELS = {
  physics:'Physics', chemistry:'Chemistry',
  botany:'Botany',   zoology:'Zoology', maths:'Mathematics'
};
const SEMS = ['I','II','III','IV','V','VI'];

// ── Page state ────────────────────────────────
const S = {
  sem  : parseInt(getP('sem'))  || 1,
  sub  : getP('subject')        || 'physics',
  note : getP('note')           || 'unit1',
  lang : 'en',
  md   : '',
  title: ''
};

// ── Unlock helpers ────────────────────────────
// Global unlock — ek baar form fill = sabhi notes unlock
const GLOBAL_UNLOCK_KEY = 'bscnotes_unlocked';
const unlocked  = () => localStorage.getItem(GLOBAL_UNLOCK_KEY) === '1';
const setUnlock = () => localStorage.setItem(GLOBAL_UNLOCK_KEY, '1');

// ── Base path ─────────────────────────────────
// Works on GitHub Pages, Netlify, localhost
function basePath() {
  const p = location.pathname.replace(/\/[^/]*$/, '/');
  return location.origin + p;
}

// ── Safe markdown render ───────────────────────
// Works even if marked.js hasn't loaded yet
function mdToHTML(src, partial) {
  if (partial) {
    const lines = src.split('\n');
    src = lines.slice(0, Math.max(12, Math.floor(lines.length * 0.3))).join('\n');
  }

  // Try marked.js first
  if (typeof marked !== 'undefined') {
    try {
      marked.setOptions({ breaks: true, gfm: true });
      return marked.parse(src);
    } catch(e) {}
  }

  // Fallback — plain text display (no markdown parsing)
  // This makes SOMETHING always visible regardless of CDN
  return `<pre style="white-space:pre-wrap;font-size:14px;line-height:1.7;
    font-family:inherit;color:inherit">${
    src.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }</pre>`;
}

// ── Enhance rendered HTML ─────────────────────
function enhance(wrap) {
  // Copy buttons on <pre> blocks
  wrap.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;
    const btn = document.createElement('button');
    btn.className   = 'copy-code-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      const code = pre.querySelector('code');
      navigator.clipboard.writeText((code || pre).textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  // Wrap tables for horizontal scroll
  wrap.querySelectorAll('table').forEach(t => {
    if (t.parentElement.classList.contains('table-wrap')) return;
    const w = document.createElement('div');
    w.className = 'table-wrap';
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });
}

// ── Build TOC ─────────────────────────────────
function buildTOC(wrap) {
  const toc = $('#toc-list');
  if (!toc) return;
  const hs = wrap.querySelectorAll('h2, h3');
  if (!hs.length) { const tw=$('.notes-toc'); if(tw) tw.style.display='none'; return; }
  toc.innerHTML = '';
  hs.forEach((h, i) => {
    h.id = h.id || 'h' + i;
    const li = document.createElement('li');
    li.className = 'toc-item ' + h.tagName.toLowerCase();
    li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
    toc.appendChild(li);
  });
}

// ── Render content into #notes-body ───────────
function renderContent(md) {
  const body = $('#notes-body');
  if (!body) return;

  if (unlocked()) {
    // Full notes
    body.innerHTML = `<div class="notes-markdown" id="md-content">${mdToHTML(md)}</div>`;
    enhance(body);
    buildTOC(body);

    // If marked wasn't ready yet, retry render after 500ms
    if (typeof marked === 'undefined') {
      setTimeout(() => {
        const mc = $('#md-content');
        if (mc) { mc.innerHTML = mdToHTML(md); enhance(body); buildTOC(body); }
      }, 600);
    }

  } else {
    // 30% preview + unlock form
    body.innerHTML = `
      <div class="content-preview">
        <div class="notes-markdown">${mdToHTML(md, true)}</div>
        <div class="content-blur-overlay"></div>
      </div>
      <div class="unlock-popup">
        <div class="unlock-card">
          <div class="unlock-icon">🔓</div>
          <div class="unlock-title">Unlock Full Notes</div>
          <div class="unlock-desc">
            Enter your details for instant access —<br>no OTP or password needed.
          </div>
          <div class="unlock-form">
            <div class="form-group">
              <label>Your Name</label>
              <input class="form-input" id="uname" type="text" placeholder="Enter your name" />
            </div>
            <div class="form-group">
              <label>Mobile Number</label>
              <input class="form-input" id="umob" type="tel" placeholder="10-digit number" maxlength="10" />
            </div>
            <button class="unlock-submit" id="ubtn">Unlock Full Notes →</button>
            <div class="unlock-note">🔒 Safe &amp; private. No spam ever.</div>
          </div>
        </div>
      </div>`;

    $('#umob').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });

    $('#ubtn').addEventListener('click', async () => {
      const name = ($('#uname').value || '').trim();
      const mob  = ($('#umob').value  || '').trim();
      if (!name)                    { toast('Please enter your name');           return; }
      if (!/^\d{10}$/.test(mob))   { toast('Enter valid 10-digit mobile number'); return; }
      $('#ubtn').disabled    = true;
      $('#ubtn').textContent = 'Unlocking…';
      try {
        if (_sb) await _sb.from('leads').insert([{
          name, mobile: mob,
          semester: S.sem, subject: S.sub,
          note_title: S.title || S.note
        }]);
      } catch(e) {}
      setUnlock();
      toast('Notes unlocked! 🎉');
      renderContent(S.md);
    });
  }
}

// ── Toast notification ────────────────────────
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
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Reading progress bar ──────────────────────
function initProgress() {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const nb = $('.notes-body');
    if (!nb) return;
    const scrolled = Math.max(0, -nb.getBoundingClientRect().top);
    const total    = Math.max(1, nb.offsetHeight - window.innerHeight);
    bar.style.width = Math.min(100, (scrolled / total) * 100) + '%';
  }, { passive: true });
}

// ── Image zoom modal ──────────────────────────
function initZoom() {
  const modal = $('#img-modal');
  const img   = modal && modal.querySelector('img');
  const close = $('#img-modal-close');
  if (!modal || !img) return;
  document.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && e.target.closest('.notes-markdown')) {
      img.src = e.target.src;
      modal.classList.add('open');
    }
  });
  close && close.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

// ── Background blobs ──────────────────────────
function initBg() {
  if (!$('.bg-mesh')) {
    const bg = document.createElement('div');
    bg.className = 'bg-mesh';
    document.body.prepend(bg);
  }
  ['blob-1', 'blob-2', 'blob-3'].forEach(c => {
    if (!$('.' + c)) {
      const b = document.createElement('div');
      b.className = 'blob ' + c;
      document.body.prepend(b);
    }
  });
}

// ── Language toggle ───────────────────────────
function initLang() {
  const en = $('#lang-en'), hi = $('#lang-hi');
  if (!en || !hi) return;
  en.addEventListener('click', () => {
    S.lang = 'en';
    en.classList.add('active'); hi.classList.remove('active');
    loadNotes('en');
  });
  hi.addEventListener('click', () => {
    S.lang = 'hi';
    hi.classList.add('active'); en.classList.remove('active');
    loadNotes('hi');
  });
}

// ── MAIN: Fetch + display notes ───────────────
async function loadNotes(lang) {
  lang = lang || 'en';
  const body = $('#notes-body');
  if (!body) return;

  const url = `${basePath()}notes/sem${S.sem}/${S.sub}/${S.note}-${lang}.md`;
  console.log('[BScNotes] loading:', url);

  // Show loading spinner
  body.innerHTML = `
    <div class="notes-loading">
      <div class="spinner"></div>
      <div class="loading-text">Loading notes…</div>
    </div>`;

  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    if (!md || !md.trim()) throw new Error('File is empty');

    // Save to state
    S.md   = md;
    S.lang = lang;

    // Set page title from first # heading
    const m = md.match(/^#\s+(.+)/m);
    S.title = m ? m[1] : `${LABELS[S.sub] || S.sub} ${S.note}`;
    const tel = $('#notes-title');
    if (tel) tel.textContent = S.title;
    document.title = S.title + ' | BScNotes';

    // Render — works even if marked.js not loaded yet
    renderContent(md);

  } catch(err) {
    console.error('[BScNotes] error:', err.message);
    const u = S.note.replace('unit', '');
    body.innerHTML = `
      <div class="notes-error">
        <div class="error-icon">📄</div>
        <div class="error-title">Notes Not Found</div>
        <div class="error-desc">
          <strong>${LABELS[S.sub] || S.sub} — Unit ${u}</strong> load nahi hui.<br><br>
          Expected file:<br>
          <code style="font-size:12px;background:#f0f2f7;padding:4px 10px;
                       border-radius:6px;display:inline-block;margin:6px 0;
                       word-break:break-all">
            notes/sem${S.sem}/${S.sub}/unit${u}-${lang}.md
          </code>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px">
          <button class="btn btn-primary" onclick="loadNotes('${lang}')">↺ Retry</button>
          <a href="subject.html?sem=${S.sem}&subject=${S.sub}" class="btn btn-ghost">← Back</a>
        </div>
      </div>`;
  }
}

// ── DOMContentLoaded ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBg();
  initSupabase();
  initProgress();
  initZoom();
  initLang();

  const semL = SEMS[S.sem - 1] || S.sem;
  const subL = LABELS[S.sub]   || S.sub;
  const uNum = S.note.replace('unit', '');

  // Breadcrumb
  const bc = $('#breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">Home</a><span>›</span>
    <a href="semester.html?sem=${S.sem}">Semester ${semL}</a><span>›</span>
    <a href="subject.html?sem=${S.sem}&subject=${S.sub}">${subL}</a><span>›</span>
    <span class="current">Unit ${uNum}</span>`;

  // Meta tags
  const meta = $('#notes-meta');
  if (meta) meta.innerHTML = `
    <span class="meta-tag">Sem ${semL}</span>
    <span class="meta-tag">${subL}</span>
    <span class="meta-tag">Unit ${uNum}</span>`;

  document.title = `${subL} Unit ${uNum} | BScNotes`;

  // Load notes immediately — no waiting for marked
  // renderContent() handles the case where marked isn't ready yet
  loadNotes('en');
});
