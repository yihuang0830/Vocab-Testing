requireAuth('student');
document.getElementById('header-username').textContent = getUsername() + ' 同学';

let currentListId = null;
let currentListSource = null;
let currentWords = [];
let currentMode = null;  // 'browse' | 'flashcard' | 'spelling'

// ===== Init =====
loadSidebar();

async function loadSidebar() {
  const res = await apiFetch('/api/wordlists/student/mine');
  if (!res) return;
  const lists = await res.json();
  const assignedLists = lists.filter(l => l.source !== 'personal');
  const personalLists = lists.filter(l => l.source === 'personal');

  const el = document.getElementById('wordlist-sidebar');
  if (!lists.length) {
    el.innerHTML = `
      <p style="padding:16px;font-size:13px;color:var(--text-light)">老师还没有布置单词，你也可以先建立自己的单词本。</p>
      <div style="padding:0 8px 8px">
        <button class="btn btn-primary btn-sm" style="width:100%" onclick="showCreatePersonalList()">+ 自建单词本</button>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    ${sidebarSection('老师布置', assignedLists)}
    ${sidebarSection('我的自建', personalLists)}
    <div style="padding:8px">
      <button class="btn btn-primary btn-sm" style="width:100%" onclick="showCreatePersonalList()">+ 自建单词本</button>
    </div>
  `;
}

function sidebarSection(title, lists) {
  return `
    <div style="padding:10px 12px 4px;font-size:12px;font-weight:700;color:var(--text-light)">${title}</div>
    ${lists.length ? lists.map(l => `
      <button class="sidebar-item ${l.id === currentListId ? 'active' : ''}" onclick="selectList(${l.id}, '${escAttr(l.name)}', '${escAttr(l.source || '')}')">
        <span class="item-name">${escHtml(l.name)}</span>
        <span class="item-count">${l.word_count}</span>
      </button>
    `).join('') : `<p style="padding:8px 12px 12px;font-size:13px;color:var(--text-light)">暂无</p>`}
  `;
}

async function selectList(id, name, source = '') {
  currentListId = id;
  currentListSource = source;
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick').includes(`selectList(${id},`));
  });

  const res = await apiFetch(`/api/wordlists/${id}`);
  if (!res || !res.ok) return;
  const list = await res.json();
  currentWords = list.words;
  currentMode = null;
  renderModeSelector(list.name);
}

// ===== Mode Selector =====
function renderModeSelector(listName) {
  const personalTools = currentListSource === 'personal' ? `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <h3 style="font-size:15px;color:var(--text-light);margin:0">管理我的单词</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="togglePersonalTextImport()">📋 批量导入</button>
          <button class="btn btn-danger btn-sm" onclick="deletePersonalList()">删除词表</button>
        </div>
      </div>
      <div class="add-word-row">
        <div class="form-group">
          <label>英文</label>
          <input type="text" id="personal-new-english" placeholder="English word" />
        </div>
        <div class="form-group">
          <label>中文</label>
          <input type="text" id="personal-new-chinese" placeholder="中文翻译" />
        </div>
        <button class="btn btn-ghost btn-sm" onclick="translatePersonalNewWord()" title="AI翻译">🤖 AI翻译</button>
        <button class="btn btn-primary" onclick="addPersonalWord()">添加</button>
      </div>
      <div id="personal-text-import" style="display:none;margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
        <div class="form-group">
          <label>批量粘贴</label>
          <textarea id="personal-text-import-input" rows="6" placeholder="例如：&#10;Break 读音&#10;Lifeguard 救生员&#10;Fat - 胖，非常贬义的一个词"></textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="savePersonalTextImport()">保存导入</button>
          <button class="btn btn-ghost btn-sm" onclick="togglePersonalTextImport()">取消</button>
        </div>
      </div>
      ${personalWordPreview()}
    </div>
  ` : '';

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
      <h2 class="page-title" style="margin-bottom:0">${escHtml(listName)}</h2>
      ${currentListSource === 'personal' ? '<span style="font-size:12px;color:var(--primary);background:rgba(79,110,247,0.1);padding:3px 8px;border-radius:999px">自建</span>' : ''}
    </div>
    <p style="color:var(--text-light);font-size:14px;margin-bottom:20px">共 ${currentWords.length} 个单词，选择练习方式：</p>
    ${personalTools}
    <div class="mode-selector">
      <div class="mode-card" onclick="startMode('browse')">
        <div class="mode-icon">📖</div>
        <div class="mode-label">单词列表</div>
        <div class="mode-desc">浏览所有单词</div>
      </div>
      <div class="mode-card" onclick="startMode('flashcard')">
        <div class="mode-icon">🃏</div>
        <div class="mode-label">翻卡片</div>
        <div class="mode-desc">翻转查看中文</div>
      </div>
      <div class="mode-card" onclick="startMode('spelling')">
        <div class="mode-icon">✍️</div>
        <div class="mode-label">拼写测试</div>
        <div class="mode-desc">看中文写英文</div>
      </div>
    </div>
  `;
}

function personalWordPreview() {
  if (!currentWords.length) {
    return `
      <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px">
        <h4 style="font-size:14px;color:var(--text-light);margin-bottom:10px">当前单词</h4>
        <p style="font-size:13px;color:var(--text-light);padding:14px;background:var(--bg);border-radius:8px">还没有添加单词。</p>
      </div>
    `;
  }

  return `
    <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <h4 style="font-size:14px;color:var(--text-light);margin:0">当前单词（${currentWords.length} 个）</h4>
        <span style="font-size:12px;color:var(--text-light)">添加后会立即显示在这里</span>
      </div>
      <div class="word-table-wrap" style="max-height:280px;overflow:auto;border:1px solid var(--border);border-radius:8px">
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
          <tbody>
            ${currentWords.map((w, i) => `
              <tr id="student-word-row-${w.id}">
                <td style="color:var(--text-light);font-size:13px">${i + 1}</td>
                <td><span class="word-english">${escHtml(w.english)}</span></td>
                <td><span class="word-chinese">${escHtml(w.chinese || '—')}</span></td>
                <td><button class="speak-btn" onclick="speak('${escAttr(w.english)}')" title="点读">🔊</button></td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-ghost btn-sm" onclick="editPersonalWord(${w.id}, '${escAttr(w.english)}', '${escAttr(w.chinese || '')}')">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePersonalWord(${w.id})">删除</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function startMode(mode) {
  currentMode = mode;
  if (mode === 'browse') renderBrowse();
  else if (mode === 'flashcard') renderFlashcard();
  else if (mode === 'spelling') renderSpelling();
}

// ===== Personal Word Lists =====
function showCreatePersonalList() {
  currentListId = null;
  currentListSource = null;
  currentWords = [];
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="max-width:520px;margin:0 auto">
      <h2 class="page-title">自建单词本</h2>
      <p style="color:var(--text-light);font-size:14px;margin-bottom:18px">可以放课堂外自己想背的单词，只有你自己能看到。</p>
      <div class="form-group">
        <label>单词本名称</label>
        <input type="text" id="personal-list-name" placeholder="例如：我的错题词 / 旅行英语" />
      </div>
      <p class="error-msg" id="personal-list-error"></p>
      <button class="btn btn-primary" style="width:100%" onclick="createPersonalList()">创建</button>
    </div>
  `;
  setTimeout(() => document.getElementById('personal-list-name')?.focus(), 100);
}

async function createPersonalList() {
  const name = document.getElementById('personal-list-name').value.trim();
  const errEl = document.getElementById('personal-list-error');
  if (!name) { errEl.textContent = '请输入单词本名称'; return; }

  const res = await apiFetch('/api/wordlists/student/personal', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) { errEl.textContent = data.detail || '创建失败'; return; }

  showToast('已创建', 'success');
  await loadSidebar();
  selectList(data.id, data.name, 'personal');
}

async function deletePersonalList() {
  if (!currentListId || currentListSource !== 'personal') return;
  if (!confirm('确认删除这个自建单词本？此操作不可恢复。')) return;

  const res = await apiFetch(`/api/wordlists/student/personal/${currentListId}`, { method: 'DELETE' });
  if (res && res.ok) {
    currentListId = null;
    currentListSource = null;
    currentWords = [];
    document.getElementById('main-content').innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <p>已删除。可以从左侧选择其他单词表，或重新自建。</p>
      </div>
    `;
    await loadSidebar();
    showToast('已删除', 'success');
  }
}

async function translatePersonalNewWord() {
  const english = document.getElementById('personal-new-english').value.trim();
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
    document.getElementById('personal-new-chinese').value = data.translation;
  } else {
    showToast('翻译失败，请手动输入', 'error');
  }
}

async function addPersonalWord() {
  if (!currentListId || currentListSource !== 'personal') return;
  const english = document.getElementById('personal-new-english').value.trim();
  const chinese = document.getElementById('personal-new-chinese').value.trim();
  if (!english) { showToast('请输入英文单词', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/student/personal/${currentListId}/words`, {
    method: 'POST',
    body: JSON.stringify({ english, chinese: chinese || null }),
  });

  if (res && res.ok) {
    document.getElementById('personal-new-english').value = '';
    document.getElementById('personal-new-chinese').value = '';
    await selectList(currentListId, document.querySelector('.sidebar-item.active .item-name')?.textContent || '', 'personal');
    await loadSidebar();
    showToast('已添加', 'success');
  } else {
    showToast('添加失败', 'error');
  }
}

function togglePersonalTextImport() {
  const panel = document.getElementById('personal-text-import');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') {
    setTimeout(() => document.getElementById('personal-text-import-input')?.focus(), 80);
  }
}

async function savePersonalTextImport() {
  const text = document.getElementById('personal-text-import-input').value;
  const words = parseWordText(text);
  if (!words.length) { showToast('未能解析出单词，请检查格式', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/student/personal/${currentListId}/words/bulk`, {
    method: 'POST',
    body: JSON.stringify({ words: words.map(w => ({ english: w.english, chinese: w.chinese || null })) }),
  });

  if (res && res.ok) {
    showToast(`已导入 ${words.length} 个单词`, 'success');
    await selectList(currentListId, document.querySelector('.sidebar-item.active .item-name')?.textContent || '', 'personal');
    await loadSidebar();
  } else {
    showToast('导入失败', 'error');
  }
}

// ===== Browse Mode =====
function renderBrowse() {
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';
  const canEdit = currentListSource === 'personal';

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <h2 class="page-title" style="margin-bottom:0">${escHtml(listName)}</h2>
      <button class="btn btn-ghost btn-sm" onclick="renderModeSelector('${escAttr(listName)}')">← 返回</button>
    </div>
    <div class="card">
      <div class="word-table-wrap">
        <table class="word-table">
          <thead>
            <tr>
              <th>#</th>
              <th>英文</th>
              <th>中文</th>
              <th>点读</th>
              ${canEdit ? '<th>操作</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${currentWords.map((w, i) => `
              <tr id="student-word-row-${w.id}">
                <td style="color:var(--text-light);font-size:13px">${i + 1}</td>
                <td><span class="word-english">${escHtml(w.english)}</span></td>
                <td><span class="word-chinese">${escHtml(w.chinese || '—')}</span></td>
                <td><button class="speak-btn" onclick="speak('${escAttr(w.english)}')" title="点读">🔊</button></td>
                ${canEdit ? `
                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn btn-ghost btn-sm" onclick="editPersonalWord(${w.id}, '${escAttr(w.english)}', '${escAttr(w.chinese || '')}')">编辑</button>
                      <button class="btn btn-danger btn-sm" onclick="deletePersonalWord(${w.id})">删除</button>
                    </div>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== Flashcard Mode =====
let fcIndex = 0;
let fcKnown = 0;
let fcUnknown = 0;
let fcFlipped = false;
let fcWords = [];
let fcUnknownWords = [];
let fcCountdownTimer = null;
let fcCountdownEnabled = false;

function renderFlashcard() {
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

  // Show settings screen first
  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <h2 class="page-title" style="margin-bottom:0">翻卡片</h2>
      <button class="btn btn-ghost btn-sm" onclick="renderModeSelector('${escAttr(listName)}')">← 返回</button>
    </div>
    <div class="card" style="max-width:480px;margin:0 auto;padding:28px">
      <h3 style="font-size:16px;margin-bottom:20px;color:var(--text-light)">练习设置</h3>

      <div class="form-group">
        <label>卡片顺序</label>
        <div style="display:flex;gap:10px;margin-top:8px">
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:2px solid var(--border);border-radius:8px;cursor:pointer" id="order-seq-label">
            <input type="radio" name="fc-order" value="seq" checked onchange="updateOrderLabel()" /> 按顺序
          </label>
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:2px solid var(--border);border-radius:8px;cursor:pointer" id="order-rand-label">
            <input type="radio" name="fc-order" value="rand" onchange="updateOrderLabel()" /> 随机顺序
          </label>
        </div>
      </div>

      <div class="form-group" style="margin-top:16px">
        <label>5秒倒计时</label>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:14px;border:1px solid var(--border);border-radius:8px">
          <label class="toggle-switch" style="position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0">
            <input type="checkbox" id="fc-countdown-toggle" style="opacity:0;width:0;height:0" />
            <span style="position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:26px;transition:.3s" id="toggle-track"></span>
            <span style="position:absolute;cursor:pointer;left:3px;top:3px;width:20px;height:20px;background:white;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)" id="toggle-thumb"></span>
          </label>
          <span style="font-size:14px;color:var(--text-light)">每张卡片显示5秒倒计时，帮助练习反应速度（时间到后仍由你自己决定会不会）</span>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" style="width:100%;margin-top:24px" onclick="startFlashcard()">开始练习</button>
    </div>
  `;

  // Toggle switch visual
  const toggle = document.getElementById('fc-countdown-toggle');
  const track = document.getElementById('toggle-track');
  const thumb = document.getElementById('toggle-thumb');
  toggle.addEventListener('change', () => {
    track.style.background = toggle.checked ? 'var(--primary)' : '#ccc';
    thumb.style.left = toggle.checked ? '25px' : '3px';
  });
}

function updateOrderLabel() {
  const val = document.querySelector('input[name="fc-order"]:checked')?.value;
  document.getElementById('order-seq-label').style.borderColor = val === 'seq' ? 'var(--primary)' : 'var(--border)';
  document.getElementById('order-rand-label').style.borderColor = val === 'rand' ? 'var(--primary)' : 'var(--border)';
}

function startFlashcard() {
  const order = document.querySelector('input[name="fc-order"]:checked')?.value || 'seq';
  fcCountdownEnabled = document.getElementById('fc-countdown-toggle').checked;
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

  fcWords = [...currentWords];
  if (order === 'rand') fcWords.sort(() => Math.random() - 0.5);
  fcIndex = 0;
  fcKnown = 0;
  fcUnknown = 0;
  fcUnknownWords = [];

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <h2 class="page-title" style="margin-bottom:0">翻卡片</h2>
      <button class="btn btn-ghost btn-sm" onclick="stopCountdown();renderModeSelector('${escAttr(listName)}')">← 返回</button>
    </div>
    <div class="flashcard-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:500px">
        <div class="flashcard-progress" id="fc-progress"></div>
        <div id="fc-countdown" style="font-size:22px;font-weight:700;color:var(--primary);min-width:32px;text-align:right"></div>
      </div>
      <div class="flashcard" id="flashcard" onclick="flipCard()">
        <div class="flashcard-inner" id="fc-inner">
          <div class="flashcard-front" id="fc-front">
            <div class="flashcard-word" id="fc-word-en"></div>
            <button class="speak-btn" style="position:absolute;top:12px;right:12px" onclick="event.stopPropagation();speak(document.getElementById('fc-word-en').textContent)" title="点读">🔊</button>
            <div class="flashcard-hint">点击翻转查看中文</div>
          </div>
          <div class="flashcard-back" id="fc-back">
            <div class="flashcard-word" id="fc-word-zh"></div>
            <div class="flashcard-hint">再点一次翻回正面</div>
          </div>
        </div>
      </div>
      <div class="flashcard-actions" id="fc-actions" style="display:none">
        <button class="btn btn-danger" onclick="fcMark(false)">😕 还不会</button>
        <button class="btn btn-success" onclick="fcMark(true)">✅ 会了</button>
      </div>
    </div>
  `;

  showCard(fcIndex);
}

function showCard(i) {
  fcFlipped = false;
  stopCountdown();
  if (i >= fcWords.length) {
    showFCResult();
    return;
  }
  const w = fcWords[i];
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('fc-word-en').textContent = w.english;
  document.getElementById('fc-word-zh').textContent = w.chinese || '（无翻译）';
  document.getElementById('fc-progress').textContent = `${i + 1} / ${fcWords.length}`;
  document.getElementById('fc-actions').style.display = 'none';

  if (fcCountdownEnabled) startCountdown();
}

function startCountdown() {
  let sec = 5;
  const el = document.getElementById('fc-countdown');
  if (!el) return;
  el.textContent = sec;
  el.style.color = 'var(--primary)';
  fcCountdownTimer = setInterval(() => {
    sec--;
    if (!document.getElementById('fc-countdown')) { clearInterval(fcCountdownTimer); return; }
    if (sec <= 0) {
      clearInterval(fcCountdownTimer);
      const cdEl = document.getElementById('fc-countdown');
      if (cdEl) { cdEl.textContent = '⏰'; cdEl.style.color = 'var(--danger)'; }
      // Auto-flip to show the word and let student decide
      if (!fcFlipped) flipCard();
    } else {
      el.textContent = sec;
      if (sec <= 2) el.style.color = 'var(--danger)';
      else if (sec <= 3) el.style.color = 'var(--warning)';
    }
  }, 1000);
}

function stopCountdown() {
  if (fcCountdownTimer) { clearInterval(fcCountdownTimer); fcCountdownTimer = null; }
  const el = document.getElementById('fc-countdown');
  if (el) el.textContent = '';
}

function flipCard() {
  fcFlipped = !fcFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', fcFlipped);
  if (fcFlipped) {
    stopCountdown();
    document.getElementById('fc-actions').style.display = 'flex';
  }
}

function fcMark(known) {
  if (known) {
    fcKnown++;
  } else {
    fcUnknown++;
    fcUnknownWords.push(fcWords[fcIndex]);
  }
  fcIndex++;
  showCard(fcIndex);
}

function showFCResult() {
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';
  const unknownSection = fcUnknownWords.length > 0 ? `
    <div style="margin:20px 0;text-align:left">
      <h4 style="font-size:14px;color:var(--danger);margin-bottom:12px;display:flex;align-items:center;gap:6px">
        😕 还不会的单词（${fcUnknownWords.length} 个）
      </h4>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        ${fcUnknownWords.map((w, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
            <div>
              <span style="font-weight:600;color:var(--primary)">${escHtml(w.english)}</span>
              ${w.chinese ? `<span style="color:var(--text-light);margin-left:10px;font-size:14px">${escHtml(w.chinese)}</span>` : ''}
            </div>
            <button class="speak-btn" onclick="speak('${escAttr(w.english)}')" title="点读">🔊</button>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-warning" style="width:100%;margin-top:12px" onclick="practiceUnknownOnly()">
        🔁 只背这 ${fcUnknownWords.length} 个不会的
      </button>
    </div>
  ` : `<p style="color:var(--success);font-size:15px;margin-bottom:20px">🎊 全部掌握！太棒了！</p>`;

  document.getElementById('main-content').querySelector('.flashcard-wrap').innerHTML = `
    <div class="card" style="padding:32px;max-width:540px;margin:0 auto">
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <h3 style="font-size:22px;margin-bottom:12px">练习完成！</h3>
        <p style="font-size:16px;color:var(--text-light);margin-bottom:8px">共 ${fcWords.length} 个单词</p>
        <p style="font-size:16px;color:var(--success);margin-bottom:4px">✅ 会了：${fcKnown} 个</p>
        <p style="font-size:16px;color:var(--danger);margin-bottom:16px">😕 还不会：${fcUnknown} 个</p>
      </div>
      ${unknownSection}
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="renderFlashcard()">再练全部</button>
        <button class="btn btn-ghost" onclick="renderModeSelector('${escAttr(listName)}')">返回选择</button>
      </div>
    </div>
  `;
}

function practiceUnknownOnly() {
  stopCountdown();
  // Start a new flashcard session with only the unknown words
  const unknownSnapshot = [...fcUnknownWords];
  fcWords = unknownSnapshot;
  fcIndex = 0;
  fcKnown = 0;
  fcUnknown = 0;
  fcUnknownWords = [];
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <h2 class="page-title" style="margin-bottom:0">翻卡片 — 不会的单词</h2>
      <button class="btn btn-ghost btn-sm" onclick="renderModeSelector('${escAttr(listName)}')">← 返回</button>
    </div>
    <div class="flashcard-wrap" id="flashcard-wrap">
      <div class="flashcard-progress" id="fc-progress"></div>
      <div class="flashcard" id="flashcard" onclick="flipCard()">
        <div class="flashcard-inner" id="fc-inner">
          <div class="flashcard-front" id="fc-front">
            <div class="flashcard-word" id="fc-word-en"></div>
            <button class="speak-btn" style="position:absolute;top:12px;right:12px" onclick="event.stopPropagation();speak(document.getElementById('fc-word-en').textContent)" title="点读">🔊</button>
            <div class="flashcard-hint">点击翻转查看中文</div>
          </div>
          <div class="flashcard-back" id="fc-back">
            <div class="flashcard-word" id="fc-word-zh"></div>
            <div class="flashcard-hint">再点一次翻回正面</div>
          </div>
        </div>
      </div>
      <div class="flashcard-actions" id="fc-actions" style="display:none">
        <button class="btn btn-danger" onclick="fcMark(false)">😕 还不会</button>
        <button class="btn btn-success" onclick="fcMark(true)">✅ 会了</button>
      </div>
    </div>
  `;
  showCard(0);
}

// ===== Spelling Mode =====
let spIndex = 0;
let spCorrect = 0;
let spWrong = 0;
let spWords = [];
let spAnswered = false;

function renderSpelling() {
  spWords = [...currentWords].sort(() => Math.random() - 0.5);
  spIndex = 0;
  spCorrect = 0;
  spWrong = 0;
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <h2 class="page-title" style="margin-bottom:0">拼写测试</h2>
      <button class="btn btn-ghost btn-sm" onclick="renderModeSelector('${escAttr(listName)}')">← 返回</button>
    </div>
    <div class="spelling-wrap" id="spelling-wrap"></div>
  `;

  showSpelling(spIndex);
}

function showSpelling(i) {
  spAnswered = false;
  if (i >= spWords.length) {
    showSpellingResult();
    return;
  }
  const w = spWords[i];

  document.getElementById('spelling-wrap').innerHTML = `
    <div class="spelling-question">
      <div class="chinese-word">${escHtml(w.chinese || '（无翻译）')} </div>
      <div class="hint">看中文，写出对应的英文单词</div>
    </div>
    <div class="spelling-score">第 ${i + 1} 题 / 共 ${spWords.length} 题 &nbsp;|&nbsp; 正确 ${spCorrect} / 错误 ${spWrong}</div>
    <div class="spelling-input-row">
      <input type="text" id="spell-input" placeholder="请输入英文..." autocomplete="off" autocapitalize="none" />
      <button class="btn btn-primary" onclick="checkSpelling()">确认</button>
    </div>
    <div id="spell-feedback"></div>
    <div id="spell-next" style="display:none;text-align:center">
      <button class="btn btn-primary" onclick="spIndex++;showSpelling(spIndex)">下一题 →</button>
    </div>
  `;

  const inp = document.getElementById('spell-input');
  inp.focus();
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!spAnswered) checkSpelling();
      else { spIndex++; showSpelling(spIndex); }
    }
  });
}

function checkSpelling() {
  if (spAnswered) return;
  spAnswered = true;

  const w = spWords[spIndex];
  const input = document.getElementById('spell-input').value.trim();
  const correct = w.english.trim().toLowerCase();
  const isCorrect = input.toLowerCase() === correct;

  if (isCorrect) spCorrect++; else spWrong++;

  const fbEl = document.getElementById('spell-feedback');
  if (isCorrect) {
    fbEl.className = 'spelling-feedback correct';
    fbEl.innerHTML = '✅ 正确！';
    speak(w.english);
  } else {
    fbEl.className = 'spelling-feedback wrong';
    fbEl.innerHTML = `❌ 错误！正确答案是：<strong>${escHtml(w.english)}</strong>`;
    speak(w.english);
  }

  document.getElementById('spell-input').disabled = true;
  document.getElementById('spell-next').style.display = 'block';
}

function showSpellingResult() {
  const total = spWords.length;
  const pct = Math.round(spCorrect / total * 100);
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

  document.getElementById('spelling-wrap').innerHTML = `
    <div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
      <h3 style="font-size:22px;margin-bottom:12px">测试完成！</h3>
      <p style="font-size:32px;font-weight:700;color:var(--primary);margin-bottom:8px">${pct}%</p>
      <p style="font-size:15px;color:var(--text-light);margin-bottom:8px">共 ${total} 题</p>
      <p style="font-size:16px;color:var(--success);margin-bottom:4px">✅ 正确：${spCorrect} 题</p>
      <p style="font-size:16px;color:var(--danger);margin-bottom:24px">❌ 错误：${spWrong} 题</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="renderSpelling()">再测一遍</button>
        <button class="btn btn-ghost" onclick="renderModeSelector('${escAttr(listName)}')">返回选择</button>
      </div>
    </div>
  `;
}

// ===== Personal Word Editing =====
function editPersonalWord(id, english, chinese) {
  const row = document.getElementById(`student-word-row-${id}`);
  if (!row) return;
  row.innerHTML = `
    <td style="color:var(--text-light);font-size:13px">✏️</td>
    <td><input type="text" value="${escAttr(english)}" id="personal-edit-en-${id}" style="font-size:15px" /></td>
    <td>
      <div style="display:flex;gap:6px">
        <input type="text" value="${escAttr(chinese)}" id="personal-edit-zh-${id}" style="font-size:15px;flex:1" />
        <button class="btn btn-ghost btn-sm" onclick="translatePersonalEditWord(${id})">🤖</button>
      </div>
    </td>
    <td></td>
    <td>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-success btn-sm" onclick="savePersonalWord(${id})">保存</button>
        <button class="btn btn-ghost btn-sm" onclick="renderBrowse()">取消</button>
      </div>
    </td>
  `;
  document.getElementById(`personal-edit-en-${id}`).focus();
}

async function translatePersonalEditWord(id) {
  const english = document.getElementById(`personal-edit-en-${id}`).value.trim();
  if (!english) return;
  const res = await apiFetch('/api/translate', {
    method: 'POST',
    body: JSON.stringify({ text: english }),
  });
  if (res && res.ok) {
    const data = await res.json();
    document.getElementById(`personal-edit-zh-${id}`).value = data.translation;
  }
}

async function savePersonalWord(id) {
  const returnToBrowse = currentMode === 'browse';
  const english = document.getElementById(`personal-edit-en-${id}`).value.trim();
  const chinese = document.getElementById(`personal-edit-zh-${id}`).value.trim();
  if (!english) { showToast('英文不能为空', 'error'); return; }

  const res = await apiFetch(`/api/wordlists/student/personal/${currentListId}/words/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ english, chinese: chinese || null }),
  });

  if (res && res.ok) {
    showToast('已保存', 'success');
    await selectList(currentListId, document.querySelector('.sidebar-item.active .item-name')?.textContent || '', 'personal');
    if (returnToBrowse) renderBrowse();
  } else {
    showToast('保存失败', 'error');
  }
}

async function deletePersonalWord(id) {
  const returnToBrowse = currentMode === 'browse';
  if (!confirm('确认删除这个单词？')) return;
  const res = await apiFetch(`/api/wordlists/student/personal/${currentListId}/words/${id}`, {
    method: 'DELETE',
  });
  if (res && res.ok) {
    showToast('已删除', 'success');
    await selectList(currentListId, document.querySelector('.sidebar-item.active .item-name')?.textContent || '', 'personal');
    if (returnToBrowse) renderBrowse();
    await loadSidebar();
  } else {
    showToast('删除失败', 'error');
  }
}

// ===== Utils =====
function parseWordText(text) {
  const lines = text.trim().split('\n');
  const words = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dashMatch = trimmed.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if (dashMatch) {
      words.push({ english: dashMatch[1].trim(), chinese: dashMatch[2].trim() });
      continue;
    }

    const cjkMatch = trimmed.match(/^([a-zA-Z()',.·\s]+?)\s+([\u4e00-\u9fff\uff00-\uffef（(【].*)$/);
    if (cjkMatch) {
      words.push({ english: cjkMatch[1].trim(), chinese: cjkMatch[2].trim() });
      continue;
    }

    if (/^[a-zA-Z\s'(),.]+$/.test(trimmed)) {
      words.push({ english: trimmed, chinese: '' });
    }
  }
  return words;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s ?? '').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
