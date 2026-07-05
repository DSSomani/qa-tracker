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
  // Add issue button to every li that contains a status-error code
  preview.querySelectorAll('li').forEach(li => {
    if (li.querySelector('code.status-error') && !li.querySelector('.issue-btn')) {
      const key   = li.querySelector('.li-content')?.textContent.trim().slice(0, 90) || '';
      const title = li.querySelector('.li-content')?.textContent.trim() || '';
      addIssueBtn(li, key, title);
    }
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

/* ── Settings ── */
function openSettings() {
  loadSettingsIntoForm();
  document.getElementById('modal-overlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('modal-overlay').classList.remove('open');
}
function saveSettings() {
  const cfg = {
    gh: { owner: document.getElementById('gh-owner').value.trim(), repo: document.getElementById('gh-repo').value.trim(), token: document.getElementById('gh-token').value.trim() },
    jira: { domain: document.getElementById('jira-domain').value.trim(), email: document.getElementById('jira-email').value.trim(), token: document.getElementById('jira-token').value.trim(), project: document.getElementById('jira-project').value.trim() }
  };
  localStorage.setItem('qa-tracker-cfg', JSON.stringify(cfg));
  closeSettings();
}
function loadSettingsIntoForm() {
  const cfg = JSON.parse(localStorage.getItem('qa-tracker-cfg') || '{}');
  if (cfg.gh) {
    document.getElementById('gh-owner').value  = cfg.gh.owner  || '';
    document.getElementById('gh-repo').value   = cfg.gh.repo   || '';
    document.getElementById('gh-token').value  = cfg.gh.token  || '';
  }
  if (cfg.jira) {
    document.getElementById('jira-domain').value  = cfg.jira.domain  || '';
    document.getElementById('jira-email').value   = cfg.jira.email   || '';
    document.getElementById('jira-token').value   = cfg.jira.token   || '';
    document.getElementById('jira-project').value = cfg.jira.project || '';
  }
}
function getCfg() { return JSON.parse(localStorage.getItem('qa-tracker-cfg') || '{}'); }

/* ── Issue link state ── */
const issueLinks = {}; // key -> { gh: {url, num}, jira: {url, key} }

/* ── Popover ── */
let activePopover = null;
function closePopover() { if (activePopover) { activePopover.remove(); activePopover = null; } }
document.addEventListener('click', e => { if (activePopover && !activePopover.contains(e.target)) closePopover(); });

function openIssuePopover(btn, key, title) {
  closePopover();
  const pop = document.createElement('div');
  pop.className = 'popover';

  const links = issueLinks[key] || {};
  const cfg   = getCfg();
  const ghOk  = cfg.gh?.owner && cfg.gh?.repo && cfg.gh?.token;
  const jiraOk = cfg.jira?.domain && cfg.jira?.email && cfg.jira?.token && cfg.jira?.project;

  pop.innerHTML = `
    <h4>🔗 Link Issue</h4>
    <div class="pop-title">${title.slice(0, 80)}${title.length > 80 ? '…' : ''}</div>

    <button class="pop-btn gh" id="pop-gh-btn" ${!ghOk ? 'disabled title="Configure GitHub in Settings first"' : ''}>
      <span>●</span> ${links.gh ? 'Re-create on GitHub' : 'Create GitHub Issue'}
    </button>
    <button class="pop-btn jira" id="pop-jira-btn" ${!jiraOk ? 'disabled title="Configure Jira in Settings first"' : ''}>
      <span>◆</span> ${links.jira ? 'Re-create on Jira' : 'Create Jira Ticket'}
    </button>

    <div class="pop-divider"></div>
    <div style="font-size:9px;color:#5a6275;margin-bottom:5px;">Or paste an existing issue URL:</div>
    <div class="pop-link-row">
      <input id="pop-link-input" placeholder="https://github.com/... or https://jira...">
      <button onclick="linkExisting('${key.replace(/'/g,"\'")}')">Link</button>
    </div>
    <div class="pop-status" id="pop-status"></div>
  `;

  document.body.appendChild(pop);
  activePopover = pop;

  // Position below button
  const rect = btn.getBoundingClientRect();
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';

  pop.querySelector('#pop-gh-btn').addEventListener('click', () => createGithubIssue(key, title));
  pop.querySelector('#pop-jira-btn').addEventListener('click', () => createJiraIssue(key, title));
  pop.addEventListener('click', e => e.stopPropagation());
}

function setPopStatus(msg, type) {
  const el = document.getElementById('pop-status');
  if (!el) return;
  el.className = 'pop-status ' + type;
  el.textContent = msg;
}

/* ── GitHub create ── */
async function createGithubIssue(key, title) {
  const cfg = getCfg().gh;
  if (!cfg?.owner) return;
  setPopStatus('Creating GitHub issue…', 'loading');
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/issues`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({ title: title.trim(), body: `**QA Tracker issue**\n\n${title}`, labels: ['bug'] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.status);
    if (!issueLinks[key]) issueLinks[key] = {};
    issueLinks[key].gh = { url: data.html_url, num: '#' + data.number };
    setPopStatus('✓ GitHub issue created: ' + data.number, 'ok');
    refreshIssueBtns();
    setTimeout(closePopover, 1800);
  } catch(e) {
    setPopStatus('Error: ' + e.message, 'err');
  }
}

/* ── Jira create ── */
async function createJiraIssue(key, title) {
  const cfg = getCfg().jira;
  if (!cfg?.domain) return;
  setPopStatus('Creating Jira ticket…', 'loading');
  const auth = btoa(`${cfg.email}:${cfg.token}`);
  try {
    const res = await fetch(`https://${cfg.domain}.atlassian.net/rest/api/2/issue`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { project: { key: cfg.project }, summary: title.trim(), description: `QA Tracker issue:\n${title}`, issuetype: { name: 'Bug' } } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.errors || data.errorMessages || res.status));
    if (!issueLinks[key]) issueLinks[key] = {};
    const jiraUrl = `https://${cfg.domain}.atlassian.net/browse/${data.key}`;
    issueLinks[key].jira = { url: jiraUrl, key: data.key };
    setPopStatus('✓ Jira ticket created: ' + data.key, 'ok');
    refreshIssueBtns();
    setTimeout(closePopover, 1800);
  } catch(e) {
    setPopStatus('Error: ' + e.message, 'err');
  }
}

/* ── Link existing URL ── */
function linkExisting(key) {
  const input = document.getElementById('pop-link-input');
  const url = input?.value.trim();
  if (!url) return;
  if (!issueLinks[key]) issueLinks[key] = {};
  if (url.includes('github.com')) {
    const num = url.split('/').pop();
    issueLinks[key].gh = { url, num: '#' + num };
    setPopStatus('✓ Linked GitHub issue', 'ok');
  } else if (url.includes('atlassian.net')) {
    const k = url.split('/browse/')[1] || url.split('/').pop();
    issueLinks[key].jira = { url, key: k };
    setPopStatus('✓ Linked Jira ticket', 'ok');
  } else {
    issueLinks[key].gh = { url, num: 'link' };
    setPopStatus('✓ Linked', 'ok');
  }
  refreshIssueBtns();
  setTimeout(closePopover, 1500);
}

/* ── Refresh issue buttons in preview (without full re-render) ── */
function refreshIssueBtns() {
  document.querySelectorAll('.issue-btn').forEach(btn => {
    const key = btn.dataset.key;
    const links = issueLinks[key] || {};
    btn.classList.toggle('has-link', !!(links.gh || links.jira));
    // Update badges in li-cbs
    const cbs = btn.closest('.li-cbs');
    if (!cbs) return;
    cbs.querySelectorAll('.linked-badge').forEach(b => b.remove());
    if (links.gh)   cbs.appendChild(makeBadge(links.gh.url,   links.gh.num,  'gh'));
    if (links.jira) cbs.appendChild(makeBadge(links.jira.url, links.jira.key, 'jira'));
  });
}

function makeBadge(url, label, type) {
  const a = document.createElement('a');
  a.className = 'linked-badge ' + type;
  a.href = url;
  a.target = '_blank';
  a.textContent = (type === 'gh' ? '⊙ ' : '◆ ') + label;
  return a;
}

/* ── Add issue btn to error li ── */
function addIssueBtn(li, key, title) {
  const cbs = li.querySelector('.li-cbs');
  if (!cbs) return;
  const btn = document.createElement('button');
  btn.className = 'issue-btn';
  btn.dataset.key = key;
  btn.textContent = '⊕ Issue';
  const links = issueLinks[key] || {};
  if (links.gh || links.jira) btn.classList.add('has-link');
  btn.addEventListener('click', e => { e.stopPropagation(); openIssuePopover(btn, key, title); });
  cbs.appendChild(btn);
  if (links.gh)   cbs.appendChild(makeBadge(links.gh.url,   links.gh.num,  'gh'));
  if (links.jira) cbs.appendChild(makeBadge(links.jira.url, links.jira.key, 'jira'));
}

render();
