/* Клиенты и сотрудники */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};

  /* ================= КЛИЕНТЫ ================= */
  let cRoot, cQ = '', cSort = 'spent';
  const level = (spent) => spent >= 1500000 ? { n: 'Золото', c: '#f5c542', i: '🥇' } : spent >= 600000 ? { n: 'Серебро', c: '#c0c6d0', i: '🥈' } : { n: 'Бронза', c: '#cd8a52', i: '🥉' };

  function custRender(el) {
    cRoot = el;
    const st = App.state(), cs = st.customers;
    const active30 = cs.filter(c => c.lastVisit > Date.now() - 30 * H.DAY).length;
    const bonusTotal = H.sum(cs, c => c.bonus);
    const s30 = H.salesIn(H.sod() - 29 * H.DAY), withC = s30.filter(s => s.customer);
    App.setSub(`программа лояльности · кэшбэк ${st.settings.cashback}%`);
    App.setActions(`<button class="btn btn-primary" id="nc">${icon('plus')}<span class="hide-sm">Клиент</span></button>`);
    $('#nc').onclick = () => custModal();
    el.innerHTML = `
      <div class="kpis">
        <div class="card kpi"><div class="kpi-icon">👥</div><div class="kpi-label">Клиентов в базе</div><div class="kpi-value num">${cs.length}</div><div class="kpi-delta muted">${active30} активных за 30 дней</div></div>
        <div class="card kpi"><div class="kpi-icon">⭐</div><div class="kpi-label">Бонусов на счетах</div><div class="kpi-value num">${H.money(bonusTotal)}</div><div class="kpi-delta muted">обязательства перед клиентами</div></div>
        <div class="card kpi"><div class="kpi-icon">🔁</div><div class="kpi-label">Доля чеков с картой</div><div class="kpi-value num">${s30.length ? Math.round(withC.length / s30.length * 100) : 0}%</div><div class="kpi-delta muted">за 30 дней</div></div>
        <div class="card kpi"><div class="kpi-icon">💳</div><div class="kpi-label">Средний чек клиента</div><div class="kpi-value num">${H.money(withC.length ? H.sum(withC, s => s.total) / withC.length : 0)}</div><div class="kpi-delta muted">без карты: ${H.short((s30.length - withC.length) ? H.sum(s30.filter(s => !s.customer), s => s.total) / (s30.length - withC.length) : 0)}</div></div>
      </div>
      <div class="toolbar">
        <div class="search">${icon('search')}<input class="input" id="cq" placeholder="Имя или телефон" value="${H.esc(cQ)}"></div>
        <select class="select auto" id="cs"><option value="spent">По сумме покупок</option><option value="visits">По визитам</option><option value="bonus">По бонусам</option><option value="last">По последнему визиту</option><option value="new">Новые</option></select>
      </div>
      <div class="ccards" id="cl"></div>`;
    $('#cs', el).value = cSort;
    el.oninput = e => { if (e.target.id === 'cq') { cQ = e.target.value; draw(); } };
    el.onchange = e => { if (e.target.id === 'cs') { cSort = e.target.value; draw(); } };
    el.onclick = e => { const c = e.target.closest('[data-c]'); if (c) custView(H.customer(c.dataset.c)); };
    draw();
  }
  function draw() {
    const s = cQ.trim().toLowerCase().replace(/[\s-]/g, '');
    const list = App.state().customers.filter(c => !s || c.name.toLowerCase().includes(s) || c.phone.replace(/[\s-]/g, '').includes(s));
    list.sort({ spent: (a, b) => b.spent - a.spent, visits: (a, b) => b.visits - a.visits, bonus: (a, b) => b.bonus - a.bonus, last: (a, b) => (b.lastVisit || 0) - (a.lastVisit || 0), new: (a, b) => b.created - a.created }[cSort]);
    $('#cl', cRoot).innerHTML = list.map(c => {
      const lv = level(c.spent);
      return `<button class="ccard" data-c="${c.id}">
        <div class="ccard-top"><span class="avatar" style="width:44px;height:44px;background:${H.tint(lv.c, 22)};color:${lv.c};font-size:16px">${H.esc(H.initials(c.name))}</span><div class="meta"><div class="name">${H.esc(c.name)}</div><div class="sub">${H.esc(c.phone)}</div></div><span class="lvl" style="color:${lv.c}">${lv.i} ${lv.n}</span></div>
        <div class="ccard-stats"><div><span>Покупки</span><b class="num">${H.short(c.spent)}</b></div><div><span>Визиты</span><b class="num">${c.visits}</b></div><div><span>Бонусы</span><b class="num amber-t">${H.nf(c.bonus)}</b></div></div>
        <div class="sub">${c.lastVisit ? 'последний визит ' + H.dateTime(c.lastVisit) : 'ещё не покупал'}</div>
      </button>`;
    }).join('') || '<div class="card empty" style="grid-column:1/-1">Клиенты не найдены</div>';
  }

  function custView(c) {
    const st = App.state(), sales = st.sales.filter(s => s.customer === c.id && !s.refunded).sort((a, b) => b.ts - a.ts), lv = level(c.spent);
    const fav = new Map(); sales.forEach(s => s.items.forEach(i => fav.set(i.pid, (fav.get(i.pid) || 0) + i.qty)));
    const m = App.modal(`${App.head(H.esc(c.name), `${H.esc(c.phone)} · клиент с ${new Date(c.created).toLocaleDateString('ru-RU')}`)}<div class="modal-body">
      <div class="zgrid four"><div><span>Уровень</span><b style="color:${lv.c}">${lv.i} ${lv.n}</b></div><div><span>Покупки</span><b class="num">${H.money(c.spent)}</b></div><div><span>Визитов</span><b class="num">${c.visits}</b></div><div><span>Бонусы</span><b class="num amber-t">${H.nf(c.bonus)}</b></div></div>
      ${fav.size ? `<div class="card-title sm">Любимые товары</div><div class="ztop">${[...fav].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([pid, n]) => { const p = H.product(pid); return p ? `<div>${H.imgTag(p, 'xs')}<span>${H.esc(p.name)}</span><b class="num">${n}</b></div>` : ''; }).join('')}</div>` : ''}
      <div class="card-title sm">Последние покупки</div>
      ${sales.slice(0, 8).map(s => `<div class="list-row btnrow" data-sale="${s.id}"><div class="feed-imgs">${s.items.slice(0, 3).map(i => H.imgTag(H.product(i.pid) || i, 'xs')).join('')}</div><div class="meta"><div class="name">${s.items.map(i => H.esc(i.name)).join(', ')}</div><div class="sub">#${s.no} · ${H.dateTime(s.ts)}</div></div><b class="num">${H.nf(s.total)}</b></div>`).join('') || '<div class="empty" style="padding:14px">Покупок пока нет</div>'}
    </div><div class="modal-foot"><button class="btn" id="bn">${icon('gift')} Бонусы</button><button class="btn" id="ed">${icon('edit')} Изменить</button><button class="btn btn-primary" data-close>Закрыть</button></div>`, { wide: true });
    m.onclick = e => { const r = e.target.closest('[data-sale]'); if (r) App.receipt(st.sales.find(s => s.id === r.dataset.sale)); };
    $('#ed', m).onclick = () => { m.close(); custModal(c); };
    $('#bn', m).onclick = () => {
      const v = prompt(`Изменить бонусы ${c.name} (сейчас ${c.bonus}). Введи +5000 или -2000:`, '+5000'); if (!v) return;
      const n = parseInt(v.replace(/\s/g, ''), 10); if (!n) return;
      c.bonus = Math.max(0, c.bonus + n); App.log(`Бонусы ${c.name}: ${n > 0 ? '+' : ''}${n}`); App.save(); m.close(); custView(c); if (App.current() === 'customers') draw();
    };
  }

  function custModal(c) {
    const st = App.state(), isNew = !c;
    const m = App.modal(`${App.head(isNew ? 'Новый клиент' : 'Клиент')}<div class="modal-body">
      <div class="field"><label>Имя</label><input class="input" id="n" value="${H.esc(c?.name || '')}" autofocus></div>
      <div class="field"><label>Телефон</label><input class="input" id="p" value="${H.esc(c?.phone || '+998 ')}"></div>
    </div><div class="modal-foot">${isNew ? '' : `<button class="btn btn-ghost-red" id="del" style="margin-right:auto">${icon('trash')}</button>`}<button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Сохранить</button></div>`);
    $('#ok', m).onclick = () => {
      const name = $('#n', m).value.trim(), phone = $('#p', m).value.trim();
      if (!name || phone.replace(/\D/g, '').length < 9) return App.toast('Укажи имя и телефон', 'warn');
      if (st.customers.some(x => x.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') && x !== c)) return App.toast('Клиент с таким телефоном уже есть', 'warn');
      if (isNew) st.customers.push({ id: H.uid(), name, phone, bonus: 0, spent: 0, visits: 0, created: Date.now() }); else Object.assign(c, { name, phone });
      App.log(`${isNew ? 'Добавлен' : 'Изменён'} клиент ${name}`); App.save(); m.close(); App.toast('Сохранено', 'ok'); if (App.current() === 'customers') custRender(cRoot);
    };
    const d = $('#del', m);
    if (d) d.onclick = async () => { if (!await App.confirmBox(`Удалить клиента ${H.esc(c.name)}?`, { danger: true, ok: 'Удалить' })) return; st.customers = st.customers.filter(x => x !== c); App.save(); m.close(); custRender(cRoot); };
  }

  App.views.customers = { render: custRender, refresh: () => custRender(cRoot) };

  /* ================= СОТРУДНИКИ ================= */
  let sRoot;
  function staffRender(el) {
    sRoot = el;
    const st = App.state(), t30 = H.sod() - 29 * H.DAY;
    App.setSub('доступ по PIN-коду, роли и статистика');
    App.setActions(`<button class="btn btn-primary" id="ns">${icon('plus')}<span class="hide-sm">Сотрудник</span></button>`);
    $('#ns').onclick = () => staffModal();
    el.innerHTML = `<div class="scards">${st.staff.map(s => {
      const sales = H.salesIn(t30).filter(x => x.staff === s.id), rev = H.sum(sales, x => x.total);
      const shifts = st.shifts.filter(x => x.staff === s.id && x.openTs > t30).length;
      const days = Array.from({ length: 14 }, (_, i) => { const d = H.sod() - (13 - i) * H.DAY; return H.sum(sales.filter(x => x.ts >= d && x.ts < d + H.DAY), x => x.total); }), mx = Math.max(1, ...days);
      return `<div class="card scard ${s.disabled ? 'off' : ''}">
        <div class="scard-top">${App.avatar(s, 56)}<div class="meta"><div class="name">${H.esc(s.name)}${s.id === App.user.id ? ' <span class="tag">это вы</span>' : ''}</div><div class="sub">${s.role === 'admin' ? '👑 Администратор' : '🧑‍💼 Кассир'}${s.disabled ? ' · отключён' : ''}</div></div><button class="icon-btn sm" data-ed="${s.id}">${icon('edit')}</button></div>
        <div class="mini-bars">${days.map(v => `<i style="height:${Math.max(4, v / mx * 100)}%;background:${s.color}"></i>`).join('')}</div>
        <div class="zgrid"><div><span>Выручка 30д</span><b class="num">${H.short(rev)}</b></div><div><span>Чеков</span><b class="num">${sales.length}</b></div><div><span>Смен</span><b class="num">${shifts}</b></div><div><span>Средний чек</span><b class="num">${H.short(sales.length ? rev / sales.length : 0)}</b></div></div>
      </div>`;
    }).join('')}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-ed]'); if (b) staffModal(H.staff(b.dataset.ed)); };
  }

  function staffModal(s) {
    const st = App.state(), isNew = !s;
    const colors = ['#e8a35c', '#6aa8ff', '#5fd39a', '#b48cff', '#ff8fc7', '#f5c542', '#ff6b6b', '#4fd1c5'];
    let color = s?.color || colors[st.staff.length % colors.length];
    const m = App.modal(`${App.head(isNew ? 'Новый сотрудник' : 'Сотрудник')}<div class="modal-body">
      <div class="field"><label>Имя</label><input class="input" id="n" value="${H.esc(s?.name || '')}" autofocus></div>
      <div class="field-row"><div class="field"><label>Роль</label><select class="select" id="r"><option value="cashier">Кассир</option><option value="admin">Администратор</option></select></div>
      <div class="field"><label>PIN-код (4 цифры)</label><input class="input num" id="p" maxlength="4" inputmode="numeric" value="${H.esc(s?.pin || '')}"></div></div>
      <div class="field"><label>Цвет</label><div class="colors" id="cols">${colors.map(c => `<button class="cdot ${c === color ? 'on' : ''}" style="background:${c}" data-col="${c}"></button>`).join('')}</div></div>
      <div class="hint">Кассир видит: кассу, продажи своей смены, смены и клиентов. Администратор — всё.</div>
      ${isNew ? '' : `<label class="switch-row"><input type="checkbox" id="dis" ${s.disabled ? 'checked' : ''}><i class="tgl"></i><span><b>Отключить доступ</b><small>сотрудник не сможет войти</small></span></label>`}
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Сохранить</button></div>`);
    $('#r', m).value = s?.role || 'cashier';
    $('#cols', m).onclick = e => { const b = e.target.closest('[data-col]'); if (!b) return; color = b.dataset.col; $$('#cols button', m).forEach(x => x.classList.toggle('on', x === b)); };
    $('#ok', m).onclick = () => {
      const name = $('#n', m).value.trim(), pin = $('#p', m).value.trim(), role = $('#r', m).value, dis = $('#dis', m)?.checked || false;
      if (!name) return App.toast('Введи имя', 'warn');
      if (!/^\d{4}$/.test(pin)) return App.toast('PIN — ровно 4 цифры', 'warn');
      if (st.staff.some(x => x.pin === pin && x !== s)) return App.toast('Такой PIN уже занят', 'warn');
      if (s && s.role === 'admin' && (role !== 'admin' || dis) && st.staff.filter(x => x.role === 'admin' && !x.disabled).length === 1) return App.toast('Должен остаться хотя бы один администратор', 'warn');
      if (isNew) st.staff.push({ id: H.uid(), name, role, pin, color }); else Object.assign(s, { name, role, pin, color, disabled: dis });
      App.log(`${isNew ? 'Добавлен' : 'Изменён'} сотрудник ${name}`); App.save(); m.close(); App.toast('Сохранено', 'ok'); staffRender(sRoot); App.chrome();
    };
  }
  App.views.staff = { render: staffRender, refresh: () => staffRender(sRoot) };
})();
