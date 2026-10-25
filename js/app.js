/* Каркас: вход, навигация, роли */
(() => {
  const { $, $$, icon, H } = App;
  App.views = App.views || {};

  const ROUTES = [
    { group: 'Работа' },
    { id: 'dashboard', title: 'Дашборд', icon: 'dashboard', admin: true },
    { id: 'pos', title: 'Касса', icon: 'pos' },
    { id: 'sales', title: 'Продажи', icon: 'sales' },
    { id: 'daily', title: 'Итоги дня', icon: 'daily', admin: true },
    { id: 'shifts', title: 'Смены', icon: 'shifts' },
    { group: 'Каталог' },
    { id: 'products', title: 'Товары', icon: 'products', admin: true },
    { id: 'stock', title: 'Склад', icon: 'stock', admin: true },
    { group: 'Бизнес' },
    { id: 'customers', title: 'Клиенты', icon: 'customers' },
    { id: 'expenses', title: 'Расходы', icon: 'expenses', admin: true },
    { id: 'reports', title: 'Отчёты', icon: 'reports', admin: true },
    { group: 'Система' },
    { id: 'staff', title: 'Сотрудники', icon: 'staff', admin: true },
    { id: 'log', title: 'Журнал действий', icon: 'log', admin: true },
    { id: 'settings', title: 'Настройки', icon: 'settings', admin: true },
  ];
  const isAdmin = () => App.user?.role === 'admin';
  const allowed = (r) => r.id && (!r.admin || isAdmin());
  App.isAdmin = isAdmin;

  /* ---------- login ---------- */
  let pinUser = null, pin = '';
  function showLogin() {
    App.user = null;
    try { localStorage.removeItem('cafe.user'); } catch (e) {}
    $('#app').hidden = true; $('#login').hidden = false;
    $('#loginStaff').hidden = false; $('#loginPin').hidden = true;
    $$('[data-cafe-name]').forEach(el => el.textContent = App.state().settings.name);
    document.querySelector('.login-hint').hidden = App.sync.enabled;
    $('#loginStaffList').innerHTML = App.state().staff.filter(s => !s.disabled).map(s => `<button class="login-person" data-uid="${s.id}">${App.avatar(s, 56)}<b>${H.esc(s.name)}</b><span>${s.role === 'admin' ? 'Администратор' : 'Кассир'}</span></button>`).join('');
  }
  $('#loginStaffList').addEventListener('click', e => {
    const b = e.target.closest('[data-uid]'); if (!b) return;
    pinUser = H.staff(b.dataset.uid); pin = '';
    $('#loginStaff').hidden = true; $('#loginPin').hidden = false;
    $('#loginWho').innerHTML = `${App.avatar(pinUser, 64)}<b>${H.esc(pinUser.name)}</b><span>Введите PIN-код</span>`;
    drawPin();
  });
  $('#loginBack').onclick = () => { $('#loginStaff').hidden = false; $('#loginPin').hidden = true; };
  $('#pinPad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? `<button data-k="${k}">${k}</button>` : '<span></span>').join('');
  function drawPin(err) {
    $$('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
    $('#pinDots').classList.toggle('err', !!err);
  }
  function pinKey(k) {
    if ($('#loginPin').hidden) return;
    if (k === '⌫' || k === 'Backspace') pin = pin.slice(0, -1); else if (/^\d$/.test(k) && pin.length < 4) pin += k;
    drawPin();
    if (pin.length === 4) {
      if (pin === pinUser.pin) setTimeout(() => login(pinUser), 120);
      else { drawPin(true); setTimeout(() => { pin = ''; drawPin(); }, 500); }
    }
  }
  $('#pinPad').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) pinKey(b.dataset.k); });
  document.addEventListener('keydown', e => { if (!$('#login').hidden) pinKey(e.key); });

  function login(u) {
    App.user = u;
    try { localStorage.setItem('cafe.user', u.id); } catch (e) {}
    App.log(`Вход в систему: ${u.name}`); App.save();
    $('#login').hidden = true; $('#app').hidden = false;
    let start = isAdmin() ? 'dashboard' : 'pos';
    try { const v = localStorage.getItem('cafe.view'); const r = ROUTES.find(x => x.id === v); if (r && allowed(r)) start = v; } catch (e) {}
    go(start);
  }

  /* ---------- nav ---------- */
  let current = null;
  function renderChrome() {
    const st = App.state();
    const low = H.lowStock().length;
    const badges = { stock: low };
    const visible = ROUTES.filter((r, i) => r.group ? allowed(ROUTES.slice(i + 1).find(x => x.group || allowed(x)) || {}) : allowed(r));
    $('#nav').innerHTML = visible.map(r => r.group
      ? `<div class="nav-group">${r.group}</div>`
      : `<button class="nav-item ${r.id === current ? 'active' : ''}" data-go="${r.id}">${icon(r.icon)}<span>${r.title}</span>${badges[r.id] ? `<span class="nav-badge">${badges[r.id]}</span>` : ''}</button>`).join('');
    const mob = isAdmin() ? ['dashboard', 'pos', 'daily', 'products'] : ['pos', 'sales', 'shifts', 'customers'];
    $('#mobileNav').innerHTML = mob.map(id => { const r = ROUTES.find(x => x.id === id); return `<button class="nav-item ${id === current ? 'active' : ''}" data-go="${id}">${icon(r.icon)}<span>${r.title}</span></button>`; }).join('') + `<button class="nav-item" data-menu>${icon('menu')}<span>Ещё</span></button>`;
    $$('[data-cafe-name]').forEach(el => el.textContent = st.settings.name);
    const sh = App.openShift();
    const shRev = sh ? H.sum(st.sales.filter(s => s.shift === sh.id && !s.refunded), s => s.total) : 0;
    $('#shiftMini').innerHTML = sh
      ? `<div class="label">Смена №${sh.no} · ${H.esc(H.staff(sh.staff).name)}</div><div class="value num">${H.money(shRev)}</div><div class="live"><span class="live-dot"></span> открыта с ${H.time(sh.openTs)}</div>`
      : `<div class="label">Смена</div><div class="value" style="font-size:15px">закрыта</div><button class="btn btn-sm btn-primary" data-go="shifts" style="margin-top:8px;width:100%">Открыть смену</button>`;
    const u = App.user;
    $('#me').innerHTML = `${App.avatar(u, 36)}<div class="me-meta"><b>${H.esc(u.name)}</b><span>${u.role === 'admin' ? 'Администратор' : 'Кассир'}</span></div><button class="icon-btn sm" data-lock title="Выйти">${icon('logout')}</button>`;
  }

  function go(id, opts) {
    const r = ROUTES.find(x => x.id === id);
    if (!r || !allowed(r)) id = isAdmin() ? 'dashboard' : 'pos';
    current = id;
    const route = ROUTES.find(x => x.id === id);
    try { localStorage.setItem('cafe.view', id); } catch (e) {}
    $('#pageTitle').textContent = route.title;
    $('#pageSub').textContent = '';
    $('#topActions').innerHTML = '';
    $('#content').scrollTop = 0;
    document.body.dataset.view = id;
    closeMenu();
    renderChrome();
    const v = App.views[id];
    const root = $('#view'); root.className = 'view view-' + id; root.innerHTML = '';
    root.onclick = root.oninput = root.onchange = root.onkeydown = null;
    if (v) v.render(root, opts || {});
    App.animateIn(root);
  }
  App.go = go;
  App.refresh = () => { renderChrome(); const v = App.views[current]; if (v && v.refresh) v.refresh(); else go(current); };
  App.chrome = renderChrome;
  App.current = () => current;
  App.setSub = (t) => { $('#pageSub').innerHTML = t; };
  App.setActions = (html) => { $('#topActions').innerHTML = html; };

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g && !e.target.closest('.modal-bg')) { go(g.dataset.go); return; }
    if (e.target.closest('[data-lock]')) { App.log(`Выход: ${App.user.name}`); App.save(); showLogin(); }
    if (e.target.closest('[data-menu]')) openMenu();
  });
  const openMenu = () => { $('#sidebar').classList.add('open'); $('#sidebarBg').classList.add('open'); };
  const closeMenu = () => { $('#sidebar').classList.remove('open'); $('#sidebarBg').classList.remove('open'); };
  $('#sidebarBg').onclick = closeMenu;
  $('#menuBtn').innerHTML = icon('menu'); $('#menuBtn').onclick = openMenu;
  $('#themeBtn').innerHTML = icon('moon');
  $('#lockBtn').innerHTML = icon('logout'); $('#lockBtn').setAttribute('data-lock', '');
  $('#themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('cafe.theme', next); } catch (e) {}
    if (current) go(current);
  };

  /* ---------- shifts helpers (используются в нескольких разделах) ---------- */
  App.openShift = () => App.state().shifts.find(s => !s.closeTs) || null;

  /* ---------- clock & resize ---------- */
  const tick = () => {
    const d = new Date();
    $('#clock').innerHTML = `${d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })} · <b>${H.time(d)}</b>`;
  };
  tick(); setInterval(tick, 15000);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const v = App.views[current]; if (v && v.onResize) v.onResize(); }, 150); });

  /* ---------- boot: сначала синхронизация с облаком (если подключено), потом вход по PIN ---------- */
  App.sync.boot(() => {
    let saved = null;
    try { saved = localStorage.getItem('cafe.user'); } catch (e) {}
    const u = saved && App.state().staff.find(s => s.id === saved && !s.disabled);
    if (u) { App.user = u; $('#app').hidden = false; let start = isAdmin() ? 'dashboard' : 'pos'; try { const v = localStorage.getItem('cafe.view'); const r = ROUTES.find(x => x.id === v); if (r && allowed(r)) start = v; } catch (e) {} go(start); }
    else showLogin();
  });
})();
