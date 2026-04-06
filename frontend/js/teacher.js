requireAuth('teacher');
document.getElementById('header-username').textContent = getUsername() + ' 老师';

let currentListId = null;
let allStudents = [];
let currentListWords = [];

// ===== Init =====
loadSidebar();

async function loadSidebar() {
  const res = await apiFetch('/api/wordlists');
  if (!res) return;
  const lists = await res.json();

  const el = document.getElementById('wordlist-sidebar');
  if (!lists.length) {
    el.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-light)">还没有单词列表，点击上方新建</p>';
    return;
  }

  el.innerHTML = lists.map(l => `
    <button class="sidebar-item ${l.id === currentListId ? 'active' : ''}" onclick="selectList(${l.id})">
      <span class="item-name">${escHtml(l.name)}</span>
      <span class="item-count">${l.word_count}</span>
    </button>
  `).join('');
}

async function selectList(id) {
  currentListId = id;
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick') === `selectList(${id})`);
  });
  await renderListDetail(id);
}

async function renderListDetail(id) {
  const res = await apiFetch(`/api/wordlists/${id}`);
  if (!res || !res.ok) return;
  const list = await res.json();
  currentListWords = list.words;

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <h2 class="page-title" style="margin-bottom:0">${escHtml(list.name)}</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="showTextImportModal()">📋 文本导入</button>
        <button class="btn btn-outline btn-sm" onclick="showOCRModal()">📷 扫描图片</button>
        <button class="btn btn-ghost btn-sm" onclick="showAssignModal()">📤 布置给学生</button>
        <button class="btn btn-danger btn-sm" onclick="deleteList(${id})">删除列表</button>
      </div>
    </div>

    <!-- Add word row -->
    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:15px;margin-bottom:14px;color:var(--text-light)">手动添加单词</h3>
      <div class="add-word-row">
        <div class="form-group">
          <label>英文</label>
          <input type="text" id="new-english" placeholder="English word" />
        </div>
        <div class="form-group">
          <label>中文</label>
          <input type="text" id="new-chinese" placeholder="中文翻译" />
        </div>
        <button class="btn btn-ghost btn-sm" onclick="translateNewWord()" title="AI翻译">🤖 AI翻译</button>
        <button class="btn btn-primary" onclick="addWord()">添加</button>
      </div>
    </div>

    <!-- Word table -->
    ${currentListWords.length === 0 ? `
      <div class="empty-state"><div class="icon">📭</div><p>还没有单词，请添加或扫描图片</p></div>
    ` : `
      <div class="card">
        <div class="word-table-wrap">
          <table class="word-table">
            <thead>
              <tr>
                <th>#</th>
                <th>英文</th>
                <th>中文</th>
                <th>点读</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="word-tbody">
              ${currentListWords.map((w, i) => wordRow(w, i)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;
}

function wordRow(w, i) {
  return `
    <tr id="word-row-${w.id}">
      <td style="color:var(--text-light);font-size:13px">${i + 1}</td>
      <td><span class="word-english">${escHtml(w.english)}</span></td>
      <td><span class="word-chinese">${escHtml(w.chinese || '—')}</span></td>
      <td><button class="speak-btn" onclick="speak('${escAttr(w.english)}')" title="点读">🔊</button></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="editWord(${w.id}, '${escAttr(w.english)}', '${escAttr(w.chinese || '')}')">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteWord(${w.id})">删除</button>
        </div>
      </td>
    </tr>
  `;
}

// ===== Create List =====
function showCreateListModal() {
  document.getElementById('new-list-name').value = '';
  document.getElementById('create-list-error').textContent = '';
  openModal('modal-create-list');
  setTimeout(() => document.getElementById('new-list-name').focus(), 100);
}

async function createList() {
  const name = document.getElementById('new-list-name').value.trim();
  const errEl = document.getElementById('create-list-error');
  if (!name) { errEl.textContent = '请输入列表名称'; return; }

  const res = await apiFetch('/api/wordlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) { errEl.textContent = data.detail || '创建失败'; return; }

  closeModal('modal-create-list');
  showToast('创建成功', 'success');
  await loadSidebar();
  selectList(data.id);
}

// ===== Delete List =====
async function deleteList(id) {
  if (!confirm('确认删除这个单词列表？此操作不可恢复。')) return;
  const res = await apiFetch(`/api/wordlists/${id}`, { method: 'DELETE' });
  if (res.ok) {
    currentListId = null;
    document.getElementById('main-content').innerHTML = `
      <div class="empty-state"><div class="icon">📝</div><p>请从左侧选择或新建一个单词列表</p></div>
    `;
    await loadSidebar();
    showToast('已删除', 'success');
  }
}

// ===== Add Word =====
async function translateNewWord() {
  const english = document.getElementById('new-english').value.trim();
  if (!english) { showToast('请先输入英文单词', 'error'); return; }

  const btn = event.target;
  btn.textContent = '翻译中…';
  btn.disabled = true;

  const res = await apiFetch('/api/translate', {
    method: 'POST',
    body: JSON.stringify({ text: english }),
  });

  btn.textContent = '🤖 AI翻译';
  btn.disabled = false;

  if (res && res.ok) {
    const data = await res.json();
    document.getElementById('new-chinese').value = data.translation;
  } else {
    showToast('翻译失败，请手动输入', 'error');
  }
}

async function addWord() {
  const english = document.getElementById('new-english').value.trim();
  const chinese = document.getElementById('new-chinese').value.trim();
  if (!english) { showToast('请输入英文单词', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/${currentListId}/words`, {
    method: 'POST',
    body: JSON.stringify({ english, chinese: chinese || null }),
  });

  if (res && res.ok) {
    document.getElementById('new-english').value = '';
    document.getElementById('new-chinese').value = '';
    showToast('已添加', 'success');
    await renderListDetail(currentListId);
    await loadSidebar();
  } else {
    showToast('添加失败', 'error');
  }
}

// ===== Edit Word =====
function editWord(id, english, chinese) {
  const row = document.getElementById(`word-row-${id}`);
  if (!row) return;
  row.innerHTML = `
    <td style="color:var(--text-light);font-size:13px">✏️</td>
    <td><input type="text" value="${escAttr(english)}" id="edit-en-${id}" style="font-size:15px" /></td>
    <td>
      <div style="display:flex;gap:6px">
        <input type="text" value="${escAttr(chinese)}" id="edit-zh-${id}" style="font-size:15px;flex:1" />
        <button class="btn btn-ghost btn-sm" onclick="translateEditWord(${id})">🤖</button>
      </div>
    </td>
    <td></td>
    <td>
      <div style="display:flex;gap:6px">
        <button class="btn btn-success btn-sm" onclick="saveWord(${id})">保存</button>
        <button class="btn btn-ghost btn-sm" onclick="renderListDetail(${currentListId})">取消</button>
      </div>
    </td>
  `;
  document.getElementById(`edit-en-${id}`).focus();
}

async function translateEditWord(id) {
  const english = document.getElementById(`edit-en-${id}`).value.trim();
  if (!english) return;
  const res = await apiFetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: english }) });
  if (res && res.ok) {
    const data = await res.json();
    document.getElementById(`edit-zh-${id}`).value = data.translation;
  }
}

async function saveWord(id) {
  const english = document.getElementById(`edit-en-${id}`).value.trim();
  const chinese = document.getElementById(`edit-zh-${id}`).value.trim();
  if (!english) return;

  const res = await apiFetch(`/api/wordlists/${currentListId}/words/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ english, chinese: chinese || null }),
  });
  if (res && res.ok) {
    showToast('已保存', 'success');
    await renderListDetail(currentListId);
  }
}

// ===== Delete Word =====
async function deleteWord(id) {
  const res = await apiFetch(`/api/wordlists/${currentListId}/words/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('已删除', 'success');
    await renderListDetail(currentListId);
    await loadSidebar();
  }
}

// ===== Students Modal =====
async function showStudentsModal() {
  document.getElementById('new-student-username').value = '';
  document.getElementById('new-student-password').value = '';
  document.getElementById('student-error').textContent = '';
  await refreshStudentList();
  openModal('modal-students');
}

async function refreshStudentList() {
  const res = await apiFetch('/api/users/students');
  if (!res || !res.ok) return;
  allStudents = await res.json();

  const el = document.getElementById('student-list-modal');
  if (!allStudents.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-light)">还没有学生账号</p>';
    return;
  }
  el.innerHTML = allStudents.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:8px">
      <span>👤 ${escHtml(s.username)}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})">删除</button>
    </div>
  `).join('');
}

async function createStudent() {
  const username = document.getElementById('new-student-username').value.trim();
  const password = document.getElementById('new-student-password').value;
  const errEl = document.getElementById('student-error');
  if (!username || !password) { errEl.textContent = '请填写用户名和密码'; return; }

  const res = await apiFetch('/api/users/students', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) { errEl.textContent = data.detail || '创建失败'; return; }

  errEl.textContent = '';
  document.getElementById('new-student-username').value = '';
  document.getElementById('new-student-password').value = '';
  showToast('学生账号已创建', 'success');
  await refreshStudentList();
}

async function deleteStudent(id) {
  if (!confirm('确认删除此学生账号？')) return;
  const res = await apiFetch(`/api/users/students/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('已删除', 'success');
    await refreshStudentList();
  }
}

// ===== Assign Modal =====
async function showAssignModal() {
  if (!currentListId) return;

  const [studentsRes, assignedRes] = await Promise.all([
    apiFetch('/api/users/students'),
    apiFetch(`/api/wordlists/${currentListId}/assigned-students`),
  ]);

  allStudents = await studentsRes.json();
  const assigned = await assignedRes.json();
  const assignedSet = new Set(assigned);

  const el = document.getElementById('assign-student-list');
  if (!allStudents.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-light)">还没有学生账号，请先在"管理学生账号"中创建</p>';
  } else {
    el.innerHTML = allStudents.map(s => `
      <label class="student-check-item">
        <input type="checkbox" value="${s.id}" ${assignedSet.has(s.id) ? 'checked' : ''} />
        <span class="student-name">👤 ${escHtml(s.username)}</span>
      </label>
    `).join('');
  }

  openModal('modal-assign');
}

async function saveAssignment() {
  const checked = Array.from(document.querySelectorAll('#assign-student-list input[type=checkbox]:checked'));
  const student_ids = checked.map(c => parseInt(c.value));

  const res = await apiFetch(`/api/wordlists/${currentListId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ student_ids }),
  });

  if (res && res.ok) {
    closeModal('modal-assign');
    showToast('布置成功', 'success');
  }
}

// ===== OCR Modal =====
let ocrFile = null;

function showOCRModal() {
  if (!currentListId) return;
  ocrFile = null;
  document.getElementById('ocr-step1').style.display = 'block';
  document.getElementById('ocr-step2').style.display = 'none';
  document.getElementById('ocr-preview-wrap').style.display = 'none';
  document.getElementById('ocr-scan-btn').style.display = 'none';
  document.getElementById('ocr-file-input').value = '';
  openModal('modal-ocr');

  // Drag and drop
  const zone = document.getElementById('ocr-drop-zone');
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadOCRPreview(file);
  };
}

function handleOCRFile(input) {
  const file = input.files[0];
  if (file) loadOCRPreview(file);
}

function loadOCRPreview(file) {
  ocrFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ocr-preview-img').src = e.target.result;
    document.getElementById('ocr-preview-wrap').style.display = 'block';
    document.getElementById('ocr-scan-btn').style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

async function runOCR() {
  if (!ocrFile) return;
  const btn = document.getElementById('ocr-scan-btn');
  btn.innerHTML = '<span class="spinner"></span> 识别中…';
  btn.disabled = true;

  const form = new FormData();
  form.append('file', ocrFile);

  const res = await fetch('/api/ocr/scan', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: form,
  });

  btn.innerHTML = '开始扫描';
  btn.disabled = false;

  if (!res.ok) {
    const err = await res.json();
    showToast(err.detail || 'OCR失败，请重试', 'error');
    return;
  }

  const data = await res.json();
  renderOCRWords(data.words);
  document.getElementById('ocr-step1').style.display = 'none';
  document.getElementById('ocr-step2').style.display = 'block';
}

function renderOCRWords(words) {
  const el = document.getElementById('ocr-word-list');
  el.innerHTML = words.map((w, i) => ocrWordRow(i, w, '')).join('');
}

function ocrWordRow(i, english, chinese) {
  return `
    <div class="ocr-word-row" id="ocr-row-${i}">
      <input type="text" value="${escAttr(english)}" id="ocr-en-${i}" class="ocr-word-english" style="max-width:180px" placeholder="英文" />
      <input type="text" value="${escAttr(chinese)}" id="ocr-zh-${i}" style="flex:1" placeholder="中文翻译（可不填）" />
      <button class="btn btn-ghost btn-sm" onclick="translateOCRRow(${i})" title="AI翻译">🤖</button>
      <button class="btn btn-danger btn-icon-sm" onclick="document.getElementById('ocr-row-${i}').remove()" title="删除">✕</button>
    </div>
  `;
}

function ocrAddRow() {
  const el = document.getElementById('ocr-word-list');
  const i = Date.now();
  const div = document.createElement('div');
  div.innerHTML = ocrWordRow(i, '', '');
  el.appendChild(div.firstElementChild);
}

async function translateOCRRow(i) {
  const english = document.getElementById(`ocr-en-${i}`).value.trim();
  if (!english) return;
  const res = await apiFetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: english }) });
  if (res && res.ok) {
    const data = await res.json();
    document.getElementById(`ocr-zh-${i}`).value = data.translation;
  }
}

async function ocrTranslateAll() {
  const rows = document.querySelectorAll('.ocr-word-row');
  const btn = event.target;
  btn.textContent = '翻译中…';
  btn.disabled = true;

  for (const row of rows) {
    const id = row.id.replace('ocr-row-', '');
    const enEl = document.getElementById(`ocr-en-${id}`);
    const zhEl = document.getElementById(`ocr-zh-${id}`);
    if (!enEl || !zhEl || !enEl.value.trim() || zhEl.value.trim()) continue;
    const res = await apiFetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: enEl.value.trim() }) });
    if (res && res.ok) {
      const data = await res.json();
      zhEl.value = data.translation;
    }
  }

  btn.textContent = '全部AI翻译';
  btn.disabled = false;
}

async function saveOCRWords() {
  const rows = document.querySelectorAll('.ocr-word-row');
  const words = [];
  for (const row of rows) {
    const id = row.id.replace('ocr-row-', '');
    const english = document.getElementById(`ocr-en-${id}`)?.value.trim();
    const chinese = document.getElementById(`ocr-zh-${id}`)?.value.trim() || null;
    if (english) words.push({ english, chinese });
  }

  if (!words.length) { showToast('没有可保存的单词', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/${currentListId}/words/bulk`, {
    method: 'POST',
    body: JSON.stringify({ words }),
  });

  if (res && res.ok) {
    closeModal('modal-ocr');
    showToast(`已保存 ${words.length} 个单词`, 'success');
    await renderListDetail(currentListId);
    await loadSidebar();
  } else {
    showToast('保存失败', 'error');
  }
}

// ===== Text Import =====
function showTextImportModal() {
  if (!currentListId) return;
  document.getElementById('text-import-input').value = '';
  document.getElementById('text-import-preview').style.display = 'none';
  openModal('modal-text-import');
  setTimeout(() => document.getElementById('text-import-input').focus(), 100);
}

function parseWordText(text) {
  const lines = text.trim().split('\n');
  const words = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: "English - Chinese" or "English – Chinese"
    const dashMatch = trimmed.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if (dashMatch) {
      words.push({ english: dashMatch[1].trim(), chinese: dashMatch[2].trim() });
      continue;
    }

    // Format: "English Chinese" — find first CJK character
    const cjkMatch = trimmed.match(/^([a-zA-Z()',.·\s]+?)\s+([\u4e00-\u9fff\uff00-\uffef（(【].*)$/);
    if (cjkMatch) {
      words.push({ english: cjkMatch[1].trim(), chinese: cjkMatch[2].trim() });
      continue;
    }

    // English only (no Chinese found)
    if (/^[a-zA-Z\s'(),.]+$/.test(trimmed)) {
      words.push({ english: trimmed, chinese: '' });
    }
  }
  return words;
}

function previewTextImport() {
  const text = document.getElementById('text-import-input').value;
  const words = parseWordText(text);

  if (!words.length) {
    showToast('未能解析出单词，请检查格式', 'error');
    return;
  }

  const tableEl = document.getElementById('text-import-table');
  tableEl.innerHTML = `
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
      <table class="word-table">
        <thead>
          <tr><th>#</th><th>英文</th><th>中文</th><th></th></tr>
        </thead>
        <tbody>
          ${words.map((w, i) => `
            <tr id="ti-row-${i}">
              <td style="color:var(--text-light);font-size:13px">${i + 1}</td>
              <td><input type="text" value="${escAttr(w.english)}" id="ti-en-${i}" style="font-size:14px" /></td>
              <td><input type="text" value="${escAttr(w.chinese)}" id="ti-zh-${i}" style="font-size:14px" placeholder="可不填" /></td>
              <td><button class="btn btn-danger btn-icon-sm" onclick="document.getElementById('ti-row-${i}').remove()">✕</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:12px;color:var(--text-light);margin-top:8px">共解析 ${words.length} 个单词，可直接在表格中修改后保存</p>
  `;
  document.getElementById('text-import-preview').style.display = 'block';
}

async function saveTextImport() {
  const rows = document.querySelectorAll('[id^="ti-row-"]');
  const words = [];
  for (const row of rows) {
    const i = row.id.replace('ti-row-', '');
    const english = document.getElementById(`ti-en-${i}`)?.value.trim();
    const chinese = document.getElementById(`ti-zh-${i}`)?.value.trim() || null;
    if (english) words.push({ english, chinese });
  }

  if (!words.length) { showToast('没有可保存的单词', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/${currentListId}/words/bulk`, {
    method: 'POST',
    body: JSON.stringify({ words }),
  });

  if (res && res.ok) {
    closeModal('modal-text-import');
    showToast(`已导入 ${words.length} 个单词`, 'success');
    await renderListDetail(currentListId);
    await loadSidebar();
  } else {
    showToast('保存失败', 'error');
  }
}

// ===== Utils =====
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s ?? '').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
