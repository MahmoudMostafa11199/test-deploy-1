// ── API ──
const API = `${window.location.origin}/api`;
let token = localStorage.getItem('token');

// TODO: remove getData/saveData once collections use individual routes
async function getData() {
  const res = await fetch(`${API}/data`);
  return res.json();
}

async function saveData(data) {
  const res = await fetch(`${API}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    showToast(err.error || 'Save failed');
    throw new Error(err.error);
  }
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showToast(data.error || 'Request failed');
    throw new Error(data.error);
  }
  return data;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText =
    'position:fixed;bottom:1.5rem;right:1.5rem;background:#ef4444;color:#fff;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.88rem;z-index:999;animation:cardEnter 300ms ease';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── State ──
let currentCollection = null; // null = "All Bookmarks"
let allCollections = []; // cached for move-to dropdown
let searchQuery = '';
let tagFilter = '';

// ── DOM Refs ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const authScreen = $('#auth-screen');
const mainScreen = $('#main-screen');
const loginForm = $('#login-form');
const signupForm = $('#signup-form');
const authError = $('#auth-error');
const userInfo = $('#user-info');
const bookmarkList = $('#bookmark-list');
const collectionList = $('#collection-list');
const bookmarkForm = $('#bookmark-form');
const searchInput = $('#search-input');
const tagFilterInput = $('#tag-filter');

// ── Auth ──
$$('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loginForm.classList.toggle('hidden', tab.dataset.tab !== 'login');
    signupForm.classList.toggle('hidden', tab.dataset.tab !== 'signup');
    authError.textContent = '';
  }),
);

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(loginForm);
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    });
    token = data.token;
    localStorage.setItem('token', token);
    showMain(data.user);
  } catch (err) {
    authError.textContent = err.message;
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(signupForm);
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    });
    token = data.token;
    localStorage.setItem('token', token);
    showMain(data.user);
  } catch (err) {
    authError.textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
});

async function showMain(user) {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');

  if (!user) {
    try {
      const data = await api('/auth/me');
      user = data.user;
    } catch {
      token = null;
      localStorage.removeItem('token');
      authScreen.classList.remove('hidden');
      mainScreen.classList.add('hidden');
      return;
    }
  }

  userInfo.textContent = user.username;
  renderCollections();
  renderBookmarks();
}

// ── Collections ──
async function renderCollections() {
  const collections = await api('/collections');
  allCollections = collections;

  collectionList.innerHTML =
    `<li class="${!currentCollection ? 'active' : ''}" data-id="">All Bookmarks</li>` +
    collections
      .map(
        (c) =>
          `<li class="${currentCollection === c.id ? 'active' : ''}" data-id="${c.id}">
            <span>${c.name}</span>
            <span class="col-actions">
              <button data-delete-col="${c.id}" title="Delete">&times;</button>
            </span>
          </li>`,
      )
      .join('');

  // Click to select
  collectionList.querySelectorAll('li').forEach((li) =>
    li.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      currentCollection = li.dataset.id || null;
      renderCollections();
      renderBookmarks();
    }),
  );

  // Delete collection
  collectionList.querySelectorAll('[data-delete-col]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this collection?')) return;
      await api(`/collections/${btn.dataset.deleteCol}`, { method: 'DELETE' });
      if (currentCollection === btn.dataset.deleteCol) currentCollection = null;
      renderCollections();
      renderBookmarks();
    }),
  );
}

// ── Bookmarks ──
async function renderBookmarks() {
  // Server-side filtering
  const params = new URLSearchParams();
  if (searchQuery) params.set('q', searchQuery);
  if (tagFilter) params.set('tag', tagFilter);
  if (currentCollection) params.set('collectionId', currentCollection);
  const query = params.toString();
  const filtered = await api(`/bookmarks${query ? `?${query}` : ''}`);

  // // Client-side filtering (replaced by server-side above)
  // const bookmarks = await api("/bookmarks");
  // let filtered = currentCollection
  //   ? bookmarks.filter((b) => b.collectionId === currentCollection)
  //   : bookmarks;
  //
  // if (searchQuery) {
  //   const q = searchQuery.toLowerCase();
  //   filtered = filtered.filter((b) => b.title.toLowerCase().includes(q));
  // }
  //
  // if (tagFilter) {
  //   const tags = tagFilter.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
  //   filtered = filtered.filter((b) =>
  //     tags.some((tag) => b.tags.some((t) => t.toLowerCase().includes(tag)))
  //   );
  // }

  bookmarkList.innerHTML = filtered.length
    ? filtered
        .map((b) => {
          const col = allCollections.find((c) => c.id === b.collectionId);
          return `<li class="bookmark-item">
            <div class="bookmark-info">
              <h3><a href="${b.url}" target="_blank">${b.title}</a></h3>
              <div class="url">${b.url}</div>
              <div class="tags">${b.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
              ${col ? `<div class="url">in: ${col.name}</div>` : ''}
            </div>
            <div class="bookmark-actions">
              <select data-move="${b.id}" class="move-select" title="Move to collection">
                <option value="">Move to...</option>
                <option value="none" ${!b.collectionId ? 'disabled' : ''}>No collection</option>
                ${allCollections.map((c) => `<option value="${c.id}" ${b.collectionId === c.id ? 'disabled' : ''}>${c.name}</option>`).join('')}
              </select>
              <button class="delete-btn" data-delete="${b.id}">&times;</button>
            </div>
          </li>`;
        })
        .join('')
    : '<li style="padding:2rem;color:#999;text-align:center">No bookmarks yet</li>';

  // Move to collection
  bookmarkList.querySelectorAll('[data-move]').forEach((select) =>
    select.addEventListener('change', async () => {
      if (!select.value) return;
      const collectionId = select.value === 'none' ? null : select.value;
      await api(`/bookmarks/${select.dataset.move}`, {
        method: 'PUT',
        body: JSON.stringify({ collectionId }),
      });
      renderBookmarks();
    }),
  );

  // Delete
  bookmarkList.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await api(`/bookmarks/${btn.dataset.delete}`, { method: 'DELETE' });
      renderBookmarks();
    }),
  );
}

// ── Add Bookmark ──
bookmarkForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(bookmarkForm);
  try {
    await api('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({
        url: fd.get('url'),
        title: fd.get('title'),
        tags: fd.get('tags')
          ? fd
              .get('tags')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        collectionId: currentCollection || null,
      }),
    });
    bookmarkForm.reset();
    renderBookmarks();
  } catch {
    // toast already shown by api()
  }
});

// ── New Collection ──
$('#new-collection-btn').addEventListener('click', () => {
  $('#new-collection-form').classList.toggle('hidden');
});

$('#save-collection-btn').addEventListener('click', async () => {
  const name = $('#collection-name').value.trim();
  if (!name) return;
  await api('/collections', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  $('#collection-name').value = '';
  $('#new-collection-form').classList.add('hidden');
  renderCollections();
});

// ── Search & Filter ──
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim();
    renderBookmarks();
  }, 300);
});

tagFilterInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    tagFilter = tagFilterInput.value.trim();
    renderBookmarks();
  }, 300);
});

// ── Init ──
if (token) {
  showMain();
} else {
  authScreen.classList.remove('hidden');
}
