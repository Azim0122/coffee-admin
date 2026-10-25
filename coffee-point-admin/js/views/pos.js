/* Касса */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};
  let root, cat = 'all', q = '', cart = [], discPct = 0, discFix = 0, pay = 'cash', customer = null, useBonus = false;

  const totals = () => {
    const sub = H.sum(cart, i => i.price * i.qty);
    const disc = Math.min(sub, discFix || Math.round(sub * discPct / 100 / 100) * 100);
    const cust = customer && H.customer(customer);
    const bonus = useBonus && cust ? Math.min(cust.bonus, sub - disc) : 0;
    return { sub, disc, bonus, total: sub - disc - bonus, qty: H.sum(cart, i => i.qty) };
  };

  function render(el) {
    root = el;
    const sh = App.openShift();
    App.setSub(sh ? `Смена №${sh.no} · ${H.esc(H.staff(sh.staff).name)} · кассир: ${H.esc(App.user.name)}` : 'Смена не открыта');
    const held = App.state().held || [];
    App.setActions(`<button class="btn" id="heldBtn">${icon('pause')}<span class="hide-sm">Отложенные</span>${held.length ? `<span class="count-badge">${held.length}</span>` : ''}</button>`);
    $('#heldBtn').onclick = heldModal;
    if (!sh) {
      el.innerHTML = `<div class="card closed-shift"><div class="big">🔒</div><h2>Смена закрыта</h2><p>Чтобы продавать, открой смену и укажи, сколько наличных в кассе.</p><button class="btn btn-primary btn-lg" id="openSh">Открыть смену</button></div>`;
      $('#openSh').onclick = () => App.openShiftModal(() => App.go('pos'));
      return;
    }
    el.innerHTML = `
      <div class="pos">
        <div class="pos-left">
          <div class="pos-tools">
            <div class="search">${icon('search')}<input class="input" id="posQ" placeholder="Поиск или штрихкод…  (F2)" value="${H.esc(q)}" autocomplete="off"></div>
            <div class="scan-hint hide-sm">${icon('barcode')} сканер готов</div>
          </div>
          <div class="chips" id="posCats"></div>
          <div class="products" id="posGrid"></div>
        </div>
        <aside class="card cart" id="cart">
          <div class="cart-head" id="cartHead">
            <div><div class="card-title">Чек</div><div class="card-sub" id="cartCount"></div></div>
            <div class="cart-head-actions"><button class="btn btn-sm" id="holdBtn" title="Отложить чек">${icon('pause')}</button><button class="btn btn-sm btn-ghost-red" id="clearBtn">Очистить</button></div>
          </div>
          <button class="cust-pick" id="custBtn"></button>
          <div class="cart-items" id="cartItems"></div>
          <div class="cart-foot">
            <div class="discounts" id="disc"></div>
            <div class="sums" id="sums"></div>
            <div class="pay-methods" id="payM">${App.PAY.map(p => `<button data-pay="${p.id}" class="${pay === p.id ? 'active' : ''}"><span>${p.icon}</span>${p.name}</button>`).join('')}</div>
            <button class="btn btn-primary checkout" id="payBtn">Оплатить</button>
          </div>
        </aside>
        <div class="cart-backdrop" id="cartBg"></div>
        <button class="cart-fab" id="fab" hidden></button>
      </div>`;
    drawCats(); drawGrid(); drawCart();

    el.oninput = e => { if (e.target.id === 'posQ') { q = e.target.value; drawGrid(); } };
    el.onkeydown = e => {
      if (e.target.id === 'posQ' && e.key === 'Enter') {
        const v = e.target.value.trim(); const p = App.state().products.find(x => x.barcode && x.barcode === v);
        if (p) { add(p.id); e.target.value = q = ''; drawGrid(); }
        else { const list = filtered(); if (list.length === 1) { add(list[0].id); e.target.value = q = ''; drawGrid(); } }
      }
    };
    el.onclick = e => {
      const t = e.target;
      const a = t.closest('[data-add]'); if (a) { add(a.dataset.add); a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); return; }
      const c = t.closest('#posCats [data-cat]'); if (c) { cat = c.dataset.cat; drawCats(); drawGrid(); return; }
      const inc = t.closest('[data-inc]'); if (inc) return add(inc.dataset.inc, 1);
      const dec = t.closest('[data-dec]'); if (dec) return add(dec.dataset.dec, -1);
      const rm = t.closest('[data-rm]'); if (rm) { cart = cart.filter(i => i.pid !== rm.dataset.rm); drawGrid(); drawCart(); return; }
      const d = t.closest('[data-d]'); if (d) { if (d.dataset.d === 'custom') return customDisc(); discPct = +d.dataset.d; discFix = 0; drawCart(); return; }
      const pm = t.closest('[data-pay]'); if (pm) { pay = pm.dataset.pay; $$('#payM button', root).forEach(x => x.classList.toggle('active', x === pm)); return; }
      if (t.closest('#clearBtn')) { clear(); return; }
      if (t.closest('#holdBtn')) { hold(); return; }
      if (t.closest('#custBtn')) { if (t.closest('[data-unset]')) { customer = null; useBonus = false; drawCart(); } else custModal(); return; }
      if (t.closest('#bonusT')) { useBonus = !useBonus; drawCart(); return; }
      if (t.closest('#payBtn')) { checkout(); return; }
      if (t.closest('#fab')) { setOpen(true); return; }
      if (t.closest('#cartBg') || (t.closest('#cartHead') && !t.closest('button'))) setOpen(false);
    };
  }

  const setOpen = on => { $('#cart', root)?.classList.toggle('open', on); $('#cartBg', root)?.classList.toggle('open', on); };
  const filtered = () => {
    const s = q.trim().toLowerCase();
    return App.state().products.filter(p => p.active && (cat === 'all' || (cat === 'fav' ? p.fav : p.cat === cat)) && (!s || p.name.toLowerCase().includes(s) || (p.barcode || '').includes(s)));
  };

  function drawCats() {
    const st = App.state(), counts = {};
    st.products.filter(p => p.active).forEach(p => counts[p.cat] = (counts[p.cat] || 0) + 1);
    const favs = st.products.filter(p => p.active && p.fav).length;
    $('#posCats', root).innerHTML = `<button class="chip ${cat === 'all' ? 'active' : ''}" data-cat="all">Все</button>` +
      (favs ? `<button class="chip ${cat === 'fav' ? 'active' : ''}" data-cat="fav">⭐ Избранное</button>` : '') +
      st.cats.filter(c => counts[c.id]).map(c => `<button class="chip ${cat === c.id ? 'active' : ''}" data-cat="${c.id}"><span class="chip-dot" style="background:${c.color}"></span>${c.name}<span class="count">${counts[c.id]}</span></button>`).join('');
  }

  function drawGrid() {
    const list = filtered();
    $('#posGrid', root).innerHTML = list.map(p => {
      const n = cart.find(i => i.pid === p.id)?.qty || 0, out = p.track && p.stock <= 0, low = p.track && p.min && p.stock <= p.min;
      return `<button class="product ${out ? 'out' : ''} ${n ? 'in' : ''}" data-add="${p.id}">
        ${H.imgTag(p)}
        ${n ? `<span class="in-cart num">${n}</span>` : ''}
        ${p.track ? `<span class="stock-pill ${low ? 'low' : ''}">${out ? 'нет' : p.stock + ' шт'}</span>` : ''}
        <div class="p-info"><div class="p-name">${H.esc(p.name)}</div><div class="p-price num">${H.nf(p.price)}</div></div>
      </button>`;
    }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>Ничего не найдено</div>';
  }

  function drawCart() {
    if (!root || !$('#cartItems', root)) return;
    const t = totals(), cust = customer && H.customer(customer);
    $('#cartItems', root).innerHTML = cart.length ? cart.map(i => {
      const p = H.product(i.pid);
      return `<div class="cart-item">${H.imgTag(p, 'sm')}<div class="meta"><div class="name">${H.esc(p.name)}</div><div class="sub num">${H.nf(p.price)} × ${i.qty}</div></div>
        <div class="ci-r"><div class="num b">${H.nf(p.price * i.qty)}</div><div class="qty"><button data-dec="${i.pid}">−</button><span class="num">${i.qty}</span><button data-inc="${i.pid}">+</button></div></div></div>`;
    }).join('') : `<div class="empty cart-empty"><div class="big">🛒</div>Нажми на товар или отсканируй штрихкод</div>`;
    $('#cartCount', root).textContent = t.qty ? `${t.qty} ${H.plural(t.qty, 'товар', 'товара', 'товаров')}` : 'пусто';
    $('#custBtn', root).innerHTML = cust
      ? `<span class="avatar" style="width:34px;height:34px;background:var(--accent-soft);color:var(--accent)">⭐</span><span class="cp-meta"><b>${H.esc(cust.name)}</b><span>${H.esc(cust.phone)} · бонусов: <b class="num">${H.nf(cust.bonus)}</b></span></span><span class="cp-x" data-unset>${icon('x')}</span>`
      : `<span class="avatar" style="width:34px;height:34px;background:var(--panel-2);color:var(--muted)">${icon('user')}</span><span class="cp-meta"><b>Добавить клиента</b><span>бонусы ${App.state().settings.cashback}% с покупки</span></span>`;
    const opts = [0, 5, 10, 15];
    $('#disc', root).innerHTML = opts.map(d => `<button data-d="${d}" class="${!discFix && discPct === d ? 'active' : ''}">${d ? '−' + d + '%' : '0%'}</button>`).join('') + `<button data-d="custom" class="${discFix ? 'active' : ''}">${discFix ? '−' + H.short(discFix) : 'Сумма'}</button>`;
    $('#sums', root).innerHTML = `
      <div class="sum-row"><span>Подытог</span><span class="num">${H.money(t.sub)}</span></div>
      ${t.disc ? `<div class="sum-row"><span>Скидка</span><span class="num down">−${H.money(t.disc)}</span></div>` : ''}
      ${cust && cust.bonus > 0 ? `<button class="sum-row bonus-toggle ${useBonus ? 'on' : ''}" id="bonusT"><span><i class="tgl"></i> Списать бонусы</span><span class="num">${useBonus ? '−' + H.money(t.bonus) : H.nf(cust.bonus) + ' доступно'}</span></button>` : ''}
      <div class="sum-row total"><span>Итого</span><span class="num">${H.money(t.total)}</span></div>
      ${App.isAdmin() && cart.length ? `<div class="sum-row cart-profit"><span>Прибыль с чека</span><span class="num up">+${H.money(t.total - H.sum(cart, i => H.product(i.pid).cost * i.qty))}</span></div>` : ''}`;
    const btn = $('#payBtn', root); btn.disabled = !cart.length; btn.innerHTML = cart.length ? `Оплатить <span class="num">${H.money(t.total)}</span> <kbd>F9</kbd>` : 'Оплатить';
    const fab = $('#fab', root); fab.hidden = !cart.length; fab.innerHTML = `<span>🛒 ${t.qty} · Открыть чек</span><span class="num">${H.money(t.total)}</span>`;
  }

  function add(pid, n = 1) {
    const p = H.product(pid); if (!p) return;
    const line = cart.find(i => i.pid === pid), next = (line?.qty || 0) + n;
    if (n > 0 && p.track && next > p.stock) { App.toast(`На складе только ${p.stock} шт «${H.esc(p.name)}»`, 'warn'); return; }
    if (line) { line.qty = next; if (line.qty <= 0) cart = cart.filter(i => i !== line); }
    else if (n > 0) cart.push({ pid, price: p.price, qty: n });
    drawGrid(); drawCart();
  }
  function clear() { cart = []; discPct = 0; discFix = 0; customer = null; useBonus = false; drawGrid(); drawCart(); }

  function customDisc() {
    const t = totals();
    const m = App.modal(`${App.head('Скидка суммой')}<div class="modal-body"><div class="field"><label>Сумма скидки (подытог ${H.money(t.sub)})</label><input class="input num big-input" id="cd" type="number" min="0" value="${discFix || ''}" autofocus></div></div>
      <div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="cdOk">Применить</button></div>`);
    const ok = () => { discFix = Math.max(0, Math.min(t.sub, +$('#cd', m).value || 0)); discPct = 0; m.close(); drawCart(); };
    $('#cdOk', m).onclick = ok; $('#cd', m).onkeydown = e => e.key === 'Enter' && ok();
  }

  function hold() {
    if (!cart.length) return App.toast('Чек пустой');
    const st = App.state(); st.held = st.held || [];
    st.held.push({ id: H.uid(), ts: Date.now(), cart: cart.map(i => ({ ...i })), customer, staff: App.user.id, total: totals().total });
    App.save(); clear(); App.toast('Чек отложен'); render(root);
  }
  function heldModal() {
    const st = App.state(), held = st.held || [];
    const m = App.modal(`${App.head('Отложенные чеки', 'вернуть чек в работу')}<div class="modal-body">${held.length ? held.map(h => `<div class="list-row"><div class="feed-imgs">${h.cart.slice(0, 3).map(i => H.imgTag(H.product(i.pid) || {}, 'xs')).join('')}</div><div class="meta"><div class="name">${h.cart.map(i => H.esc(H.product(i.pid)?.name || '?') + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ')}</div><div class="sub">${H.time(h.ts)} · ${H.esc(H.staff(h.staff).name)}</div></div><b class="num">${H.nf(h.total)}</b><button class="btn btn-sm btn-primary" data-restore="${h.id}">Вернуть</button><button class="icon-btn sm" data-del="${h.id}">${icon('trash')}</button></div>`).join('') : '<div class="empty"><div class="big">⏸️</div>Нет отложенных чеков</div>'}</div>`);
    m.onclick = e => {
      const r = e.target.closest('[data-restore]'), d = e.target.closest('[data-del]');
      if (r) { const h = held.find(x => x.id === r.dataset.restore); if (cart.length) hold(); cart = h.cart; customer = h.customer; st.held = st.held.filter(x => x !== h); App.save(); m.close(); App.go('pos'); }
      if (d) { st.held = st.held.filter(x => x.id !== d.dataset.del); App.save(); m.close(); heldModal(); render(root); }
    };
  }

  function custModal() {
    const st = App.state();
    const m = App.modal(`${App.head('Клиент', 'поиск по телефону или имени')}<div class="modal-body">
      <div class="search">${icon('search')}<input class="input" id="cq" placeholder="+998 90 … или имя" autofocus></div>
      <div id="cl" class="cust-list"></div>
      <div class="divider-text">или новый клиент</div>
      <div class="field-row"><input class="input" id="cn" placeholder="Имя"><input class="input" id="cp" placeholder="+998 __ ___-__-__"></div>
      <button class="btn" id="cAdd">${icon('plus')} Создать и выбрать</button>
    </div>`);
    const draw = () => {
      const s = $('#cq', m).value.trim().toLowerCase().replace(/\s|-/g, '');
      const list = st.customers.filter(c => !s || c.name.toLowerCase().includes(s) || c.phone.replace(/\s|-/g, '').includes(s)).sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0)).slice(0, 8);
      $('#cl', m).innerHTML = list.map(c => `<button class="list-row btnrow" data-c="${c.id}"><span class="avatar" style="width:36px;height:36px;background:var(--accent-soft);color:var(--accent)">${H.esc(H.initials(c.name))}</span><div class="meta"><div class="name">${H.esc(c.name)}</div><div class="sub">${H.esc(c.phone)} · ${c.visits} визитов</div></div><span class="tag amber num">⭐ ${H.nf(c.bonus)}</span></button>`).join('') || '<div class="empty" style="padding:16px">Не найден</div>';
    };
    draw();
    $('#cq', m).oninput = draw;
    m.onclick = e => { const b = e.target.closest('[data-c]'); if (b) { customer = b.dataset.c; useBonus = false; m.close(); drawCart(); } };
    $('#cAdd', m).onclick = () => {
      const name = $('#cn', m).value.trim(), phone = $('#cp', m).value.trim();
      if (!name || phone.replace(/\D/g, '').length < 9) return App.toast('Укажи имя и телефон', 'warn');
      const c = { id: H.uid(), name, phone, bonus: 0, spent: 0, visits: 0, created: Date.now() };
      st.customers.push(c); App.log(`Новый клиент: ${name}`); App.save(); customer = c.id; m.close(); drawCart();
    };
  }

  function checkout() {
    if (!cart.length) return;
    const t = totals();
    if (pay !== 'cash' || t.total === 0) return finish();
    const quick = [...new Set([t.total, Math.ceil(t.total / 5000) * 5000, Math.ceil(t.total / 10000) * 10000, Math.ceil(t.total / 50000) * 50000, Math.ceil(t.total / 100000) * 100000])].slice(0, 4);
    const m = App.modal(`${App.head('Оплата наличными')}<div class="modal-body">
      <div class="pay-total"><span>К оплате</span><b class="num">${H.money(t.total)}</b></div>
      <div class="field"><label>Получено от клиента</label><input class="input num big-input" id="ci" type="number" inputmode="numeric" value="${t.total}" autofocus></div>
      <div class="discounts">${quick.map(v => `<button data-q="${v}">${H.nf(v)}</button>`).join('')}</div>
      <div class="pay-total change"><span>Сдача</span><b class="num" id="ch"></b></div>
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary btn-lg" id="ok">Провести продажу</button></div>`);
    const inp = $('#ci', m);
    const upd = () => { const c = (+inp.value || 0) - t.total; $('#ch', m).textContent = c >= 0 ? H.money(c) : 'не хватает ' + H.money(-c); $('#ch', m).className = 'num ' + (c >= 0 ? 'up' : 'down'); $('#ok', m).disabled = c < 0; };
    inp.oninput = upd; upd();
    inp.onkeydown = e => { if (e.key === 'Enter' && !$('#ok', m).disabled) { m.close(); finish(+inp.value); } };
    m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { inp.value = b.dataset.q; upd(); });
    $('#ok', m).onclick = () => { m.close(); finish(+inp.value); };
  }

  function finish(received) {
    const st = App.state(), t = totals(), sh = App.openShift();
    if (!sh) { App.toast('Смена закрыта', 'warn'); return; }
    const items = cart.map(i => { const p = H.product(i.pid); if (p.track) p.stock -= i.qty; return { pid: p.id, name: p.name, img: p.img, cat: p.cat, price: p.price, cost: p.cost, qty: i.qty }; });
    const sale = { id: H.uid(), no: st.seq.sale++, ts: Date.now(), items, sub: t.sub, disc: t.disc, discPct: discFix ? 0 : discPct, bonusUsed: t.bonus, total: t.total, pay, staff: App.user.id, customer, shift: sh.id };
    if (received) sale.received = received;
    if (customer) {
      const c = H.customer(customer);
      c.bonus -= t.bonus;
      sale.bonusEarned = Math.round(t.total * (st.settings.cashback || 0) / 100 / 100) * 100;
      c.bonus += sale.bonusEarned; c.spent += t.total; c.visits++; c.lastVisit = sale.ts;
    }
    st.sales.push(sale);
    App.log(`Продажа #${sale.no} на ${H.money(sale.total)}`);
    App.save();
    clear(); setOpen(false); App.chrome();
    App.receipt(sale, true);
  }

  document.addEventListener('keydown', e => {
    if (App.current?.() !== 'pos' || document.querySelector('.modal-bg') || !root) return;
    if (e.key === 'F2' || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) { e.preventDefault(); $('#posQ', root)?.focus(); }
    if (e.key === 'F9') { e.preventDefault(); checkout(); }
  });
  // сканер штрихкодов работает как клавиатура: быстрые цифры + Enter
  let buf = '', last = 0;
  document.addEventListener('keydown', e => {
    if (App.current?.() !== 'pos' || document.querySelector('.modal-bg') || document.activeElement.tagName === 'INPUT') return;
    const now = Date.now(); if (now - last > 60) buf = ''; last = now;
    if (/^\d$/.test(e.key)) buf += e.key;
    else if (e.key === 'Enter' && buf.length >= 6) { const p = App.state().products.find(x => x.barcode === buf); if (p) add(p.id); else App.toast('Штрихкод не найден: ' + buf, 'warn'); buf = ''; }
  });

  App.views.pos = { render, refresh: () => render(root) };
})();
