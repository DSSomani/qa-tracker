const cbState = {};
let currentFilename = 'test-cases.md';
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
let scrollSyncSource = null;

function syncScroll(source, target) {
  if (scrollSyncSource && scrollSyncSource !== source) return;
  scrollSyncSource = source;

  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  const ratio = sourceRange > 0 ? source.scrollTop / sourceRange : 0;

  target.scrollTop = targetRange > 0 ? ratio * targetRange : 0;

  requestAnimationFrame(() => {
    if (scrollSyncSource === source) scrollSyncSource = null;
  });
}

editor.addEventListener('scroll', () => syncScroll(editor, preview));
preview.addEventListener('scroll', () => syncScroll(preview, editor));

/* ── File load via button ── */
document.getElementById('file-input').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) readFile(f);
  e.target.value = '';
});

/* ── Drag & drop ── */
const editorPane = document.getElementById('editor-pane');
const overlay = document.getElementById('drop-overlay');

editorPane.addEventListener('dragover', e => { e.preventDefault(); overlay.classList.add('active'); });
editorPane.addEventListener('dragleave', e => { if (!editorPane.contains(e.relatedTarget)) overlay.classList.remove('active'); });
editorPane.addEventListener('drop', e => {
  e.preventDefault();
  overlay.classList.remove('active');
  const f = e.dataTransfer.files[0];
  if (f) readFile(f);
});

function readFile(f) {
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('editor').value = ev.target.result;
    currentFilename = f.name;
    document.getElementById('filename-tag').textContent = f.name;
    render();
  };
  reader.readAsText(f);
}

/* ── Save ── */
function saveFile() {
  const md = document.getElementById('editor').value;
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentFilename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Render ── */
function getKey(li) {
  let t = '';
  for (const n of li.childNodes) {
    if (n.nodeType === 3) t += n.textContent;
    else if (n.tagName && !['UL','OL'].includes(n.tagName)) t += n.textContent;
  }
  return t.trim().slice(0, 90);
}

function makeCbBtn(key, env) {
  const btn = document.createElement('label');
  btn.className = 'cb-btn ' + env;
  if (cbState[key]?.[env]) btn.classList.add('on');
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = !!cbState[key]?.[env];
  inp.addEventListener('change', e => {
    e.stopPropagation();
    if (!cbState[key]) cbState[key] = {};
    cbState[key][env] = inp.checked;
    btn.classList.toggle('on', inp.checked);
    updateStats();
  });
  btn.appendChild(inp);
  btn.appendChild(document.createTextNode(env === 'qa' ? 'QA' : 'PROD'));
  return btn;
}

function processLi(li) {
  const key = getKey(li);
  if (!key) return;
  const inline = [], nested = [];
  for (const n of [...li.childNodes]) {
    (n.tagName === 'UL' || n.tagName === 'OL') ? nested.push(n) : inline.push(n);
  }
  li.innerHTML = '';
  const dot = document.createElement('span');
  dot.className = 'li-dot'; dot.textContent = '›';
  li.appendChild(dot);
  const content = document.createElement('span');
  content.className = 'li-content';
  inline.forEach(n => content.appendChild(n));
  nested.forEach(n => content.appendChild(n));
  li.appendChild(content);
  const cbs = document.createElement('span');
  cbs.className = 'li-cbs';
  cbs.appendChild(makeCbBtn(key, 'qa'));
  cbs.appendChild(makeCbBtn(key, 'prod'));
  li.appendChild(cbs);
}

function colorCodes(preview) {
  preview.querySelectorAll('code').forEach(c => {
    const t = c.textContent.trim();
    const tl = t.toLowerCase();
    c.classList.remove('status-done','status-pending','status-error');
    if (tl === 'done') c.classList.add('status-done');
    else if (tl === 'pending' || tl === 'missing') c.classList.add('status-pending');
    else if (tl.startsWith('issue') || tl.startsWith('error')) c.classList.add('status-error');
    else c.classList.add('status-gray');
  });
}

function updateStats() {
  const preview = document.getElementById('preview');
  const allLis  = preview.querySelectorAll('li');
  const qaCbs   = preview.querySelectorAll('.cb-btn.qa.on');
  const prodCbs = preview.querySelectorAll('.cb-btn.prod.on');
  const doneCodes = preview.querySelectorAll('code.status-done');
  document.getElementById('st-total').textContent = allLis.length;
  document.getElementById('st-qa').textContent    = qaCbs.length;
  document.getElementById('st-prod').textContent  = prodCbs.length;
  document.getElementById('st-done').textContent  = doneCodes.length;
}

function render() {
  const md = editor.value;
  preview.innerHTML = marked.parse(md);
  preview.querySelectorAll('li').forEach(processLi);
  preview.querySelectorAll('ol').forEach(ol => {
    ol.querySelectorAll(':scope > li').forEach((li, i) => {
      const dot = li.querySelector('.li-dot');
      if (dot) dot.textContent = (i + 1) + '.';
    });
  });
  colorCodes(preview);
  updateStats();
  syncScroll(editor, preview);
}

editor.addEventListener('input', render);
marked.setOptions({ gfm: true, breaks: false });
render();
