requireAuth('student');
document.getElementById('header-username').textContent = getUsername() + ' 同学';

let currentListId = null;
let currentWords = [];
let currentMode = null;  // 'browse' | 'flashcard' | 'spelling'

// ===== Init =====
loadSidebar();

async function loadSidebar() {
  const res = await apiFetch('/api/wordlists/student/mine');
  if (!res) return;
  const lists = await res.json();

  const el = document.getElementById('wordlist-sidebar');
  if (!lists.length) {
    el.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-light)">老师还没有布置单词</p>';
    return;
  }

  el.innerHTML = lists.map(l => `
    <button class="sidebar-item ${l.id === currentListId ? 'active' : ''}" onclick="selectList(${l.id}, '${escAttr(l.name)}')">
      <span class="item-name">${escHtml(l.name)}</span>
      <span class="item-count">${l.word_count}</span>
    </button>
  `).join('');
}

async function selectList(id, name) {
  currentListId = id;
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
  document.getElementById('main-content').innerHTML = `
    <h2 class="page-title">${escHtml(listName)}</h2>
    <p style="color:var(--text-light);font-size:14px;margin-bottom:20px">共 ${currentWords.length} 个单词，选择练习方式：</p>
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

function startMode(mode) {
  currentMode = mode;
  if (mode === 'browse') renderBrowse();
  else if (mode === 'flashcard') renderFlashcard();
  else if (mode === 'spelling') renderSpelling();
}

// ===== Browse Mode =====
function renderBrowse() {
  const listName = document.querySelector('.sidebar-item.active .item-name')?.textContent || '';

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
            </tr>
          </thead>
          <tbody>
            ${currentWords.map((w, i) => `
              <tr>
                <td style="color:var(--text-light);font-size:13px">${i + 1}</td>
                <td><span class="word-english">${escHtml(w.english)}</span></td>
                <td><span class="word-chinese">${escHtml(w.chinese || '—')}</span></td>
                <td><button class="speak-btn" onclick="speak('${escAttr(w.english)}')" title="点读">🔊</button></td>
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

// ===== Utils =====
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s ?? '').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
