const API = '';  // same origin

function getToken() { return localStorage.getItem('token'); }
function getRole()  { return localStorage.getItem('role'); }
function getUsername() { return localStorage.getItem('username'); }

function saveAuth(data) {
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('username', data.username);
}

function logout() {
  localStorage.clear();
  window.location.href = '/';
}

function authHeaders() {
  return { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: authHeaders(),
    ...opts,
  });
  if (res.status === 401) { logout(); return; }
  return res;
}

// ---- Toast ----
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ---- TTS (有道词典，在中国大陆可用) ----
function speak(text) {
  const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(text) + '&type=2';
  const audio = new Audio(url);
  audio.play();
}

// ---- Modal helpers ----
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// ---- Login page functions ----
async function doLogin() {
  const username = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl = document.getElementById('login-error');
  if (!username || !password) { errEl.textContent = '请填写用户名和密码'; return; }
  errEl.textContent = '';

  const res = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) { errEl.textContent = data.detail || '登录失败'; return; }

  saveAuth(data);
  window.location.href = data.role === 'teacher' ? '/teacher' : '/student';
}

async function doRegister() {
  const username = document.getElementById('reg-username')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const errEl = document.getElementById('reg-error');
  if (!username || !password) { errEl.textContent = '请填写用户名和密码'; return; }
  if (password.length < 4) { errEl.textContent = '密码至少4位'; return; }
  errEl.textContent = '';

  const res = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) { errEl.textContent = data.detail || '注册失败'; return; }

  saveAuth(data);
  window.location.href = '/teacher';
}

// ---- Auth guard ----
// Called on teacher/student pages to verify login
function requireAuth(expectedRole) {
  const token = getToken();
  const role = getRole();
  if (!token || role !== expectedRole) {
    window.location.href = '/';
  }
}
