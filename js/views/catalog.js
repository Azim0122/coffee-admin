/* Товары и склад */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};

  /* ================= ТОВАРЫ ================= */
  let pRoot, pCat = 'all', pQ = '', pMode = 'grid', pSort = 'name';
  try { pMode = localStorage.getItem('cafe.pmode') || 'grid'; } catch (e) {}

  function productsRender(el) {
    pRoot = el;
    const st = App.state();
    App.setSub(`${st.products.length} ${H.plural(st.products.length, 'товар', 'товара', 'товаров')} · ${st.cats.length} категорий`);
    App.setActions(`<button class="btn" id="catsBtn">Категории</button><button class="btn btn-primary" id="newP">${icon('plus')}<span class="hide-sm">Товар</span></button>`);
    $('#catsBtn').onclick = catsModal;
    $('#newP').onclick = () => productModal();
    el.innerHTML = `
      <div class="toolbar">
        <div class="search">${icon('search')}<input class="input" id="pq" placeholder="Название или штрихкод…" value="${H.esc(pQ)}"></div>
        <select class="select auto" id="psort"><option value="name">По названию</option><option value="price">По цене</option><option value="margin">По марже</option><option value="sold">По продажам (30 дн)</option><option value="stock">По остатку</option></select>
        <div class="spacer"></div>
        <div class="seg" id="pmode"><button data-m="grid" class="${pMode === 'grid' ? 'active' : ''}">${icon('grid')}</button><button data-m="list" class="${pMode === 'list' ? 'active' : ''}">${icon('list')}</button></div>
      </div>
      <div class="chips mb" id="pcats"></div>
      <div id="plist"></div>`;
    $('#psort', el).value = pSort;
    el.oninput = e => { if (e.target.id === 'pq') { pQ = e.target.value; drawProducts(); } };
    el.onchange = e => { if (e.target.id === 'psort') { pSort = e.target.value; drawProducts(); } };
    el.onclick = e => {
      const c = e.target.closest('[data-cat]'); if (c) { pCat = c.dataset.cat; drawProducts(); return; }
      const m = e.target.closest('[data-m]'); if (m) { pMode = m.dataset.m; try { localStorage.setItem('cafe.pmode', pMode); } catch (er) {} $$('#pmode button', el).forEach(x => x.classList.toggle('active', x === m)); drawProducts(); return; }
      const f = e.target.closest('[data-fav]'); if (f) { const p = H.product(f.dataset.fav); p.fav = !p.fav; App.save(); drawProducts(); return; }
      const a = e.target.closest('[data-act]'); if (a) { const p = H.product(a.dataset.act); p.active = !p.active; App.log(`${p.active ? 'Включён' : 'Скрыт'} товар «${p.name}»`); App.save(); drawProducts(); return; }
      const ed = e.target.closest('[data-edit]'); if (ed) productModal(H.product(ed.dataset.edit));
    };
    drawProducts();
  }

  function soldMap(days = 30) {
    const m = {}; H.salesIn(H.sod() - (days - 1) * H.DAY).forEach(s => s.items.forEach(i => m[i.pid] = (m[i.pid] || 0) + i.qty)); return m;
  }

  function drawProducts() {
    const st = App.state(), counts = {};
    st.products.forEach(p => counts[p.cat] = (counts[p.cat] || 0) + 1);
    $('#pcats', pRoot).innerHTML = `<button class="chip ${pCat === 'all' ? 'active' : ''}" data-cat="all">Все <span class="count">${st.products.length}</span></button>` +
      `<button class="chip ${pCat === 'off' ? 'active' : ''}" data-cat="off">Скрытые <span class="count">${st.products.filter(p => !p.active).length}</span></button>` +
      st.cats.map(c => `<button class="chip ${pCat === c.id ? 'active' : ''}" data-cat="${c.id}"><span class="chip-dot" style="background:${c.color}"></span>${c.name}<span class="count">${counts[c.id] || 0}</span></button>`).join('');
    const sold = soldMap(), s = pQ.trim().toLowerCase();
    let list = st.products.filter(p => (pCat === 'all' || (pCat === 'off' ? !p.active : p.cat === pCat)) && (!s || p.name.toLowerCase().includes(s) || (p.barcode || '').includes(s)));
    const mg = p => p.price ? (p.price - p.cost) / p.price : 0;
    list.sort({ name: (a, b) => a.name.localeCompare(b.name, 'ru'), price: (a, b) => b.price - a.price, margin: (a, b) => mg(b) - mg(a), sold: (a, b) => (sold[b.id] || 0) - (sold[a.id] || 0), stock: (a, b) => (a.track ? a.stock : 1e9) - (b.track ? b.stock : 1e9) }[pSort]);
    if (!list.length) { $('#plist', pRoot).innerHTML = '<div class="card empty"><div class="big">📦</div>Товары не найдены</div>'; return; }
    if (pMode === 'grid') {
      $('#plist', pRoot).innerHTML = `<div class="pcards">${list.map(p => {
        const c = H.cat(p.cat), m = Math.round(mg(p) * 100), low = p.track && p.min && p.stock <= p.min;
        return `<div class="pcard ${p.active ? '' : 'off'}">
          <div class="pcard-img" data-edit="${p.id}">${H.imgTag(p)}<button class="fav ${p.fav ? 'on' : ''}" data-fav="${p.id}" title="В избранное кассы">${icon('star')}</button>${p.active ? '' : '<span class="off-badge">скрыт</span>'}</div>
          <div class="pcard-body">
            <div class="pcard-cat" style="color:${c.color}">${c.name}</div>
            <div class="pcard-name">${H.esc(p.name)}</div>
            <div class="unit-econ"><div><span>Закупка</span><b class="num">${H.nf(p.cost)}</b></div><i>→</i><div><span>Продажа</span><b class="num">${H.nf(p.price)}</b></div><i>=</i><div class="res"><span>Прибыль/шт</span><b class="num">+${H.nf(p.price - p.cost)}</b></div></div>
            <div class="pcard-price"><span class="muted sm">маржа</span><span class="tag ${m >= 40 ? 'green' : m >= 25 ? 'amber' : 'red'} num">${m}%</span></div>
            <div class="pcard-stats">
              <div><span>Остаток</span><b class="num ${low ? 'down' : ''}">${p.track ? p.stock + ' шт' : '∞'}</b></div>
              <div><span>Продано 30д</span><b class="num">${sold[p.id] || 0}</b></div>
              <div class="wide"><span>Заработано за 30 дней</span><b class="num up">${H.money((sold[p.id] || 0) * (p.price - p.cost))}</b></div>
            </div>
          </div>
          <div class="pcard-foot"><button class="btn btn-sm" data-edit="${p.id}">${icon('edit')} Изменить</button><button class="btn btn-sm" data-act="${p.id}">${p.active ? 'Скрыть' : 'Показать'}</button></div>
        </div>`;
      }).join('')}</div>`;
    } else {
      $('#plist', pRoot).innerHTML = `<div class="card flush"><div class="table-wrap"><table><thead><tr><th>Товар</th><th class="hide-sm">Категория</th><th class="hide-sm">Штрихкод</th><th class="r">Цена</th><th class="r hide-sm">Себест.</th><th class="r hide-sm">Маржа</th><th class="r">Остаток</th><th class="r hide-sm">Продано 30д</th><th></th></tr></thead><tbody>${list.map(p => {
        const c = H.cat(p.cat), m = Math.round(mg(p) * 100);
        return `<tr class="${p.active ? '' : 'dim'}"><td><div class="cell-prod">${H.imgTag(p, 'sm')}<div><b>${H.esc(p.name)}</b>${p.fav ? ' <span style="color:var(--accent)">★</span>' : ''}</div></div></td>
          <td class="hide-sm"><span class="tag" style="color:${c.color};background:${H.tint(c.color, 14)}">${c.name}</span></td>
          <td class="hide-sm num muted">${p.barcode || '—'}</td><td class="r num b">${H.nf(p.price)}</td><td class="r num muted hide-sm">${H.nf(p.cost)}</td>
          <td class="r hide-sm"><span class="tag ${m >= 40 ? 'green' : m >= 25 ? 'amber' : 'red'} num">${m}%</span></td>
          <td class="r num b">${p.track ? p.stock : '∞'}</td><td class="r num hide-sm">${sold[p.id] || 0}</td>
          <td class="r"><button class="btn btn-sm" data-edit="${p.id}">${icon('edit')}</button></td></tr>`;
      }).join('')}</tbody></table></div></div>`;
    }
  }

  function productModal(p) {
    const st = App.state(), isNew = !p;
    p = p || { name: '', cat: pCat !== 'all' && pCat !== 'off' ? pCat : st.cats[0].id, price: '', cost: '', stock: 0, min: st.settings.lowDefault, barcode: '', active: true, track: true };
    const lk0 = H.look(p);
    let pIcon = p.icon || (isNew ? '' : lk0.icon), pColor = p.color || (isNew ? '' : lk0.color);
    const m = App.modal(`${App.head(isNew ? 'Новый товар' : 'Редактирование товара', isNew ? '' : H.esc(p.name))}
      <div class="modal-body pm">
        <div class="pm-img">
          <div class="pm-preview" id="pv"></div>
          <div class="field"><label>Иконка</label><div class="icon-pick" id="ipk">${App.PICK_ICONS.map(n => `<button type="button" data-ic="${n}" title="${n}">${App.emo(n)}</button>`).join('')}</div></div>
          <div class="field"><label>Цвет плитки</label><div class="colors" id="cpk">${App.PICK_COLORS.map(c => `<button type="button" class="cdot" style="background:${c}" data-cl="${c}"></button>`).join('')}</div></div>
        </div>
        <div class="pm-fields">
          <div class="field"><label>Название</label><input class="input" id="fn" value="${H.esc(p.name)}" placeholder="Например, Капучино 0.3" ${isNew ? 'autofocus' : ''}></div>
          <div class="field-row">
            <div class="field"><label>Категория</label><select class="select" id="fc">${st.cats.map(c => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
            <div class="field"><label>Штрихкод</label><input class="input num" id="fb" value="${H.esc(p.barcode || '')}" placeholder="сканируй или введи"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Цена продажи</label><input class="input num" id="fp" type="number" min="0" value="${p.price}"></div>
            <div class="field"><label>Закупочная цена (себестоимость)</label><input class="input num" id="fco" type="number" min="0" value="${p.cost}"></div>
          </div>
          <div class="margin-line" id="mline"></div>
          <label class="switch-row"><input type="checkbox" id="ft" ${p.track ? 'checked' : ''}><i class="tgl"></i><span><b>Учитывать остаток</b><small>выключи для напитков, которые готовятся (кофе, чай)</small></span></label>
          <div class="field-row" id="stockRow">
            <div class="field"><label>Остаток, шт</label><input class="input num" id="fs" type="number" min="0" value="${p.stock}" ${isNew ? '' : 'disabled title="Меняется через приход, списание или инвентаризацию"'}></div>
            <div class="field"><label>Мин. остаток</label><input class="input num" id="fm" type="number" min="0" value="${p.min}"></div>
          </div>
        </div>
      </div>
      <div class="modal-foot">${isNew ? '' : `<button class="btn btn-ghost-red" id="del" style="margin-right:auto">${icon('trash')} Удалить</button>`}<button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="sv">Сохранить</button></div>`, { wide: true });
    const drawPv = () => {
      const lk = H.look({ cat: $('#fc', m).value, icon: pIcon, color: pColor });
      $('#pv', m).innerHTML = H.imgTag({ cat: $('#fc', m).value, icon: pIcon, color: pColor }) + `<div class="pv-name">${H.esc($('#fn', m).value || 'Новый товар')}</div>`;
      $$('#ipk [data-ic]', m).forEach(b => b.classList.toggle('on', b.dataset.ic === lk.icon));
      $$('#cpk [data-cl]', m).forEach(b => b.classList.toggle('on', b.dataset.cl === lk.color));
    };
    const drawM = () => { const pr = +$('#fp', m).value || 0, co = +$('#fco', m).value || 0; $('#mline', m).innerHTML = pr ? `<div class="unit-econ big"><div><span>Закупка</span><b class="num">${H.nf(co)}</b></div><i>→</i><div><span>Продажа</span><b class="num">${H.nf(pr)}</b></div><i>=</i><div class="res ${pr - co < 0 ? 'neg' : ''}"><span>Прибыль с 1 шт</span><b class="num">${pr - co >= 0 ? '+' : ''}${H.nf(pr - co)}</b></div></div><div class="sub" style="margin-top:6px">маржа <b class="num">${Math.round((pr - co) / pr * 100)}%</b> · наценка <b class="num">${co ? Math.round((pr - co) / co * 100) : 0}%</b> · продашь 10 шт — заработаешь <b class="num up">${H.money((pr - co) * 10)}</b></div>` : 'Укажи цену, чтобы увидеть прибыль'; };
    const drawT = () => { $('#stockRow', m).style.display = $('#ft', m).checked ? '' : 'none'; };
    drawPv(); drawM(); drawT();
    $('#fc', m).onchange = drawPv; $('#fp', m).oninput = drawM; $('#fco', m).oninput = drawM; $('#ft', m).onchange = drawT;
    $('#ipk', m).onclick = e => { const b = e.target.closest('[data-ic]'); if (b) { pIcon = b.dataset.ic; drawPv(); } };
    $('#cpk', m).onclick = e => { const b = e.target.closest('[data-cl]'); if (b) { pColor = b.dataset.cl; drawPv(); } };
    $('#fn', m).addEventListener('input', () => { const n = $('.pv-name', m); if (n) n.textContent = $('#fn', m).value || 'Новый товар'; });
    $('#sv', m).onclick = () => {
      const name = $('#fn', m).value.trim(), price = +$('#fp', m).value;
      if (!name) return App.toast('Введи название', 'warn');
      if (!(price > 0)) return App.toast('Укажи цену', 'warn');
      const bc = $('#fb', m).value.trim();
      if (bc && st.products.some(x => x.barcode === bc && x.id !== p.id)) return App.toast('Такой штрихкод уже есть у другого товара', 'warn');
      const data = { name, cat: $('#fc', m).value, price, cost: +$('#fco', m).value || 0, min: Math.max(0, +$('#fm', m).value || 0), icon: pIcon || undefined, color: pColor || undefined, barcode: bc, track: $('#ft', m).checked };
      if (isNew) { const np = { id: H.uid(), active: true, stock: data.track ? Math.max(0, +$('#fs', m).value || 0) : 0, ...data }; if (!np.track) np.stock = 0; st.products.push(np); App.log(`Добавлен товар «${name}»`); }
      else {
        if (p.price !== price) App.log(`Цена «${name}»: ${H.nf(p.price)} → ${H.nf(price)}`);
        Object.assign(p, data); App.log(`Изменён товар «${name}»`);
      }
      App.save(); m.close(); App.toast(isNew ? 'Товар добавлен' : 'Сохранено', 'ok'); App.chrome(); if (pRoot && App.current() === 'products') drawProducts();
    };
    const del = $('#del', m);
    if (del) del.onclick = async () => {
      if (!await App.confirmBox(`Удалить «${H.esc(p.name)}»? История продаж сохранится.`, { ok: 'Удалить', danger: true })) return;
      st.products = st.products.filter(x => x.id !== p.id); App.log(`Удалён товар «${p.name}»`); App.save(); m.close(); App.toast('Товар удалён'); App.chrome(); drawProducts();
    };
  }
  App.productModal = productModal;

  function catsModal() {
    const st = App.state();
    const colors = ['#e8a35c', '#5fd39a', '#6aa8ff', '#ff6b6b', '#b48cff', '#f5c542', '#ff8fc7', '#e07b4f', '#4fd1c5', '#a3a3a3'];
    const m = App.modal(`${App.head('Категории', 'порядок, название и цвет')}<div class="modal-body"><div id="cl"></div>
      <div class="field-row" style="grid-template-columns:60px 1fr auto"><input class="input" id="ni" placeholder="☕" maxlength="2"><input class="input" id="nn" placeholder="Новая категория"><button class="btn btn-primary" id="na">${icon('plus')}</button></div></div>`);
    const draw = () => {
      $('#cl', m).innerHTML = st.cats.map((c, i) => `<div class="list-row"><span class="kpi-icon sm" style="background:${H.tint(c.color, 20)}">${c.icon}</span><input class="input sm" data-name="${c.id}" value="${H.esc(c.name)}"><div class="colors">${colors.map(col => `<button class="cdot ${col === c.color ? 'on' : ''}" style="background:${col}" data-col="${c.id}|${col}"></button>`).join('')}</div><button class="icon-btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="icon-btn sm" data-delc="${c.id}">${icon('trash')}</button></div>`).join('');
    };
    draw();
    m.onchange = e => { const n = e.target.closest('[data-name]'); if (n) { st.cats.find(c => c.id === n.dataset.name).name = n.value.trim() || 'Без имени'; App.save(); } };
    m.onclick = async e => {
      const col = e.target.closest('[data-col]'); if (col) { const [id, c] = col.dataset.col.split('|'); st.cats.find(x => x.id === id).color = c; App.save(); draw(); }
      const up = e.target.closest('[data-up]'); if (up) { const i = +up.dataset.up; [st.cats[i - 1], st.cats[i]] = [st.cats[i], st.cats[i - 1]]; App.save(); draw(); }
      const d = e.target.closest('[data-delc]'); if (d) { const n = st.products.filter(p => p.cat === d.dataset.delc).length; if (n) return App.toast(`В категории ${n} товаров — сначала перенеси их`, 'warn'); st.cats = st.cats.filter(c => c.id !== d.dataset.delc); App.save(); draw(); }
      if (e.target.closest('#na')) { const name = $('#nn', m).value.trim(); if (!name) return; st.cats.push({ id: H.uid(), name, icon: $('#ni', m).value.trim() || '📦', color: colors[st.cats.length % colors.length] }); App.save(); $('#nn', m).value = ''; draw(); }
    };
    m.close = ((orig) => () => { orig(); if (App.current() === 'products') productsRender(pRoot); })(m.close);
  }

  App.views.products = { render: productsRender, refresh: () => productsRender(pRoot) };

  /* ================= СКЛАД ================= */
  let sRoot, sTab = 'stock', sQ = '', sFilter = 'all';
  const MOVE = { in: { name: 'Приход', cls: 'green', sign: '+' }, writeoff: { name: 'Списание', cls: 'red', sign: '−' }, inventory: { name: 'Инвентаризация', cls: 'blue', sign: '±' } };

  function stockRender(el, opts = {}) {
    sRoot = el; if (opts.tab) sTab = opts.tab;
    const st = App.state(), tracked = st.products.filter(p => p.track);
    const value = H.sum(tracked, p => p.stock * p.cost), retail = H.sum(tracked, p => p.stock * p.price);
    const low = H.lowStock(), out = tracked.filter(p => p.stock <= 0).length;
    const sold = soldMap(14);
    App.setSub('остатки, приходы, списания и инвентаризация');
    App.setActions(`<button class="btn" id="woBtn">Списание</button><button class="btn" id="invBtn">Инвентаризация</button><button class="btn btn-primary" id="inBtn">${icon('plus')}<span class="hide-sm">Приход</span></button>`);
    $('#inBtn').onclick = () => App.restock([]); $('#woBtn').onclick = writeoffModal; $('#invBtn').onclick = inventoryModal;
    el.innerHTML = `
      <div class="kpis">
        <div class="card kpi"><div class="kpi-icon">🏷️</div><div class="kpi-label">Склад по себестоимости</div><div class="kpi-value num">${H.money(value)}</div><div class="kpi-delta muted">${tracked.length} позиций на учёте</div></div>
        <div class="card kpi"><div class="kpi-icon">💎</div><div class="kpi-label">Склад по цене продажи</div><div class="kpi-value num">${H.money(retail)}</div><div class="kpi-delta up">потенциальная прибыль ${H.short(retail - value)}</div></div>
        <div class="card kpi"><div class="kpi-icon">⚠️</div><div class="kpi-label">Заканчивается</div><div class="kpi-value num">${low.length}</div><div class="kpi-delta ${low.length ? 'down' : 'muted'}">${out} нет в наличии</div></div>
        <div class="card kpi"><div class="kpi-icon">🚚</div><div class="kpi-label">Приходы за 30 дней</div><div class="kpi-value num">${H.money(H.sum(st.moves.filter(m => m.type === 'in' && m.ts > Date.now() - 30 * H.DAY), m => m.total))}</div><div class="kpi-delta muted">${st.moves.filter(m => m.type === 'in' && m.ts > Date.now() - 30 * H.DAY).length} накладных</div></div>
      </div>
      <div class="toolbar">
        <div class="seg" id="stab"><button data-t="stock" class="${sTab === 'stock' ? 'active' : ''}">Остатки</button><button data-t="moves" class="${sTab === 'moves' ? 'active' : ''}">Движения</button></div>
        ${sTab === 'stock' ? `<div class="search">${icon('search')}<input class="input" id="sq" placeholder="Поиск…" value="${H.esc(sQ)}"></div><div class="seg" id="sf"><button data-f="all" class="${sFilter === 'all' ? 'active' : ''}">Все</button><button data-f="low" class="${sFilter === 'low' ? 'active' : ''}">Мало</button><button data-f="out" class="${sFilter === 'out' ? 'active' : ''}">Нет</button></div>` : ''}
        <div class="spacer"></div>
        ${sTab === 'stock' && low.length ? `<button class="btn" id="orderLow">${icon('plus')} Заказать всё, что заканчивается</button>` : ''}
      </div>
      <div id="sbody"></div>`;
    el.onclick = e => {
      const t = e.target.closest('[data-t]'); if (t) { sTab = t.dataset.t; stockRender(el); return; }
      const f = e.target.closest('[data-f]'); if (f) { sFilter = f.dataset.f; stockRender(el); return; }
      const rs = e.target.closest('[data-restock]'); if (rs) { App.restock([rs.dataset.restock]); return; }
      if (e.target.closest('#orderLow')) { App.restock(H.lowStock().map(p => p.id)); return; }
      const mv = e.target.closest('[data-move]'); if (mv) moveView(st.moves.find(x => x.id === mv.dataset.move));
    };
    el.oninput = e => { if (e.target.id === 'sq') { sQ = e.target.value; drawStockTable(sold); } };
    if (sTab === 'stock') drawStockTable(sold); else drawMoves();
  }

  function drawStockTable(sold) {
    const st = App.state(), s = sQ.trim().toLowerCase();
    const list = st.products.filter(p => p.track && (!s || p.name.toLowerCase().includes(s)) && (sFilter === 'all' || (sFilter === 'low' ? p.min && p.stock <= p.min : p.stock <= 0))).sort((a, b) => (a.stock / (a.min || 1)) - (b.stock / (b.min || 1)));
    $('#sbody', sRoot).innerHTML = `<div class="card flush"><div class="table-wrap"><table><thead><tr><th>Товар</th><th class="r">Остаток</th><th class="hide-sm">Уровень</th><th class="r hide-sm">Продаётся в день</th><th class="r">Хватит на</th><th class="r hide-sm">Сумма</th><th></th></tr></thead><tbody>${list.map(p => {
      const perDay = (sold[p.id] || 0) / 14, days = perDay ? p.stock / perDay : Infinity;
      const col = p.stock <= 0 ? 'var(--red)' : p.min && p.stock <= p.min ? 'var(--accent)' : 'var(--green)';
      const ratio = Math.min(1, p.stock / Math.max(1, (p.min || 5) * 3));
      return `<tr><td><div class="cell-prod">${H.imgTag(p, 'sm')}<div><b>${H.esc(p.name)}</b><div class="sub">${H.cat(p.cat).name} · мин. ${p.min}</div></div></div></td>
        <td class="r"><b class="num" style="color:${col};font-size:15px">${p.stock}</b> <span class="muted">шт</span></td>
        <td class="hide-sm"><div class="level"><i style="width:${ratio * 100}%;background:${col}"></i></div></td>
        <td class="r num hide-sm">${perDay ? perDay.toFixed(1).replace('.', ',') : '—'}</td>
        <td class="r">${days === Infinity ? '<span class="muted">—</span>' : `<span class="tag ${days < 3 ? 'red' : days < 7 ? 'amber' : 'green'} num">${days < 1 ? '< 1 дн' : Math.round(days) + ' дн'}</span>`}</td>
        <td class="r num muted hide-sm">${H.nf(p.stock * p.cost)}</td>
        <td class="r"><button class="btn btn-sm" data-restock="${p.id}">${icon('plus')} Приход</button></td></tr>`;
    }).join('') || '<tr><td colspan="7"><div class="empty">Нет позиций</div></td></tr>'}</tbody></table></div></div>`;
  }

  function drawMoves() {
    const st = App.state(), list = [...st.moves].sort((a, b) => b.ts - a.ts);
    $('#sbody', sRoot).innerHTML = `<div class="card flush"><div class="table-wrap"><table><thead><tr><th>№</th><th>Дата</th><th>Тип</th><th class="hide-sm">Контрагент / причина</th><th class="hide-sm">Позиции</th><th class="r">Сумма</th><th class="hide-sm">Кто</th></tr></thead><tbody>${list.map(m => {
      const t = MOVE[m.type];
      return `<tr class="clickable" data-move="${m.id}"><td class="num muted">${m.no}</td><td>${H.dateTime(m.ts)}</td><td><span class="tag ${t.cls}">${t.name}</span></td><td class="hide-sm">${H.esc(m.supplier || m.reason || m.note || '—')}</td>
        <td class="hide-sm"><div class="feed-imgs">${m.lines.slice(0, 5).map(l => H.imgTag(H.product(l.pid) || { cat: '' }, 'xs')).join('')}${m.lines.length > 5 ? `<span class="more">+${m.lines.length - 5}</span>` : ''}</div></td>
        <td class="r num b">${t.sign}${H.nf(Math.abs(m.total))}</td><td class="hide-sm">${H.esc(H.staff(m.staff).name)}</td></tr>`;
    }).join('') || '<tr><td colspan="7"><div class="empty">Движений пока нет</div></td></tr>'}</tbody></table></div></div>`;
  }

  function moveView(mv) {
    const t = MOVE[mv.type];
    App.modal(`${App.head(`${t.name} №${mv.no}`, `${H.dateTime(mv.ts)} · ${H.esc(H.staff(mv.staff).name)}`)}<div class="modal-body">
      ${mv.supplier ? `<div class="kv"><span>Поставщик</span><b>${H.esc(mv.supplier)}</b></div>` : ''}${mv.reason ? `<div class="kv"><span>Причина</span><b>${H.esc(mv.reason)}</b></div>` : ''}${mv.note ? `<div class="kv"><span>Комментарий</span><b>${H.esc(mv.note)}</b></div>` : ''}
      <div>${mv.lines.map(l => `<div class="list-row">${H.imgTag(H.product(l.pid) || { cat: '' }, 'sm')}<div class="meta"><div class="name">${H.esc(l.name)}</div><div class="sub num">${mv.type === 'inventory' ? `было ${l.was} → стало ${l.now}` : `${l.qty} шт × ${H.nf(l.cost)}`}</div></div><b class="num">${mv.type === 'inventory' ? (l.qty > 0 ? '+' : '') + l.qty + ' шт' : H.nf(l.qty * l.cost)}</b></div>`).join('')}</div>
      <div class="pay-total"><span>Итого</span><b class="num">${H.money(Math.abs(mv.total))}</b></div></div>`);
  }

  // общий редактор строк для прихода / списания
  function linesEditor(m, lines, { withCost = true } = {}) {
    const st = App.state();
    const draw = () => {
      $('#lines', m).innerHTML = lines.length ? lines.map((l, i) => { const p = H.product(l.pid); return `<div class="line-row">${H.imgTag(p, 'sm')}<div class="meta"><div class="name">${H.esc(p.name)}</div><div class="sub">сейчас ${p.stock} шт</div></div><input class="input sm num" type="number" min="1" data-q="${i}" value="${l.qty}" title="Количество">${withCost ? `<input class="input sm num" type="number" min="0" data-c="${i}" value="${l.cost}" title="Цена закупки">` : ''}<button class="icon-btn sm" data-rm="${i}">${icon('x')}</button></div>`; }).join('') : '<div class="empty" style="padding:18px">Добавь товары через поиск выше</div>';
      $('#ltotal', m).textContent = H.money(H.sum(lines, l => l.qty * l.cost));
    };
    const drawFind = () => {
      const s = $('#lq', m).value.trim().toLowerCase();
      $('#lfind', m).innerHTML = s ? st.products.filter(p => p.track && (p.name.toLowerCase().includes(s) || (p.barcode || '') === s)).slice(0, 6).map(p => `<button class="find-item" data-addl="${p.id}">${H.imgTag(p, 'xs')}<span>${H.esc(p.name)}</span><span class="muted num">${p.stock} шт</span></button>`).join('') : '';
    };
    $('#lq', m).oninput = drawFind;
    $('#lq', m).onkeydown = e => { if (e.key === 'Enter') { const b = $('#lfind [data-addl]', m); if (b) b.click(); } };
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-addl]'); if (a) { const p = H.product(a.dataset.addl); const ex = lines.find(l => l.pid === p.id); if (ex) ex.qty += Math.max(6, p.min); else lines.push({ pid: p.id, name: p.name, qty: Math.max(6, p.min * 2), cost: p.cost }); $('#lq', m).value = ''; drawFind(); draw(); }
      const r = e.target.closest('[data-rm]'); if (r) { lines.splice(+r.dataset.rm, 1); draw(); }
    });
    m.addEventListener('input', e => {
      const q = e.target.closest('[data-q]'); if (q) { lines[+q.dataset.q].qty = Math.max(0, Math.floor(+q.value || 0)); $('#ltotal', m).textContent = H.money(H.sum(lines, l => l.qty * l.cost)); }
      const c = e.target.closest('[data-c]'); if (c) { lines[+c.dataset.c].cost = Math.max(0, +c.value || 0); $('#ltotal', m).textContent = H.money(H.sum(lines, l => l.qty * l.cost)); }
    });
    draw();
  }

  App.restock = (pids = []) => {
    const st = App.state();
    const lines = pids.map(id => H.product(id)).filter(Boolean).map(p => ({ pid: p.id, name: p.name, qty: Math.max(6, p.min * 3 - p.stock), cost: p.cost }));
    const suppliers = [...new Set(st.moves.filter(x => x.supplier).map(x => x.supplier))];
    const m = App.modal(`${App.head('Приход товара', 'накладная от поставщика')}<div class="modal-body">
      <div class="field-row"><div class="field"><label>Поставщик</label><input class="input" id="sup" list="supl" placeholder="Например, Coca-Cola Uzbekistan"><datalist id="supl">${suppliers.map(s => `<option value="${H.esc(s)}">`).join('')}</datalist></div><div class="field"><label>Комментарий</label><input class="input" id="note" placeholder="№ накладной, оплата…"></div></div>
      <div class="search">${icon('search')}<input class="input" id="lq" placeholder="Найти товар или отсканировать штрихкод" ${lines.length ? '' : 'autofocus'}></div>
      <div class="find" id="lfind"></div>
      <div class="lines-head"><span>Товар</span><span>Кол-во</span><span>Цена закупки</span></div>
      <div id="lines"></div>
      <div class="pay-total"><span>Сумма накладной</span><b class="num" id="ltotal"></b></div>
      <label class="switch-row"><input type="checkbox" id="asExp"><i class="tgl"></i><span><b>Записать как расход</b><small>оплата поставщику попадёт в расходы</small></span></label>
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Провести приход</button></div>`, { wide: true });
    linesEditor(m, lines);
    $('#ok', m).onclick = () => {
      const ls = lines.filter(l => l.qty > 0); if (!ls.length) return App.toast('Добавь хотя бы один товар', 'warn');
      ls.forEach(l => { const p = H.product(l.pid); p.stock += l.qty; p.cost = l.cost; });
      const total = H.sum(ls, l => l.qty * l.cost), sup = $('#sup', m).value.trim();
      const mv = { id: H.uid(), no: st.seq.move++, ts: Date.now(), type: 'in', staff: App.user.id, supplier: sup, note: $('#note', m).value.trim(), lines: ls, total };
      st.moves.push(mv);
      if ($('#asExp', m).checked) st.expenses.push({ id: H.uid(), ts: Date.now(), cat: 'Закупка товара', amount: total, note: sup || `Приход №${mv.no}`, staff: App.user.id });
      App.log(`Приход №${mv.no}: ${ls.length} поз. на ${H.money(total)}`);
      App.save(); m.close(); App.toast(`Приход проведён: +${H.sum(ls, l => l.qty)} шт`, 'ok'); App.refresh();
    };
  };

  function writeoffModal() {
    const st = App.state(), lines = [];
    const m = App.modal(`${App.head('Списание', 'просрочка, брак, бой, личное потребление')}<div class="modal-body">
      <div class="field"><label>Причина</label><div class="discounts" id="rs">${['Просрочка', 'Брак', 'Бой / разлив', 'Для персонала', 'Другое'].map((r, i) => `<button data-r="${r}" class="${i ? '' : 'active'}">${r}</button>`).join('')}</div></div>
      <div class="search">${icon('search')}<input class="input" id="lq" placeholder="Найти товар" autofocus></div>
      <div class="find" id="lfind"></div>
      <div id="lines"></div>
      <div class="pay-total"><span>Убыток по себестоимости</span><b class="num down" id="ltotal"></b></div>
      <input class="input" id="note" placeholder="Комментарий (необязательно)">
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-red" id="ok">Списать</button></div>`, { wide: true });
    let reason = 'Просрочка';
    $('#rs', m).onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; reason = b.dataset.r; $$('#rs button', m).forEach(x => x.classList.toggle('active', x === b)); };
    linesEditor(m, lines, { withCost: false });
    $('#ok', m).onclick = () => {
      const ls = lines.filter(l => l.qty > 0); if (!ls.length) return App.toast('Добавь товары', 'warn');
      for (const l of ls) { const p = H.product(l.pid); if (l.qty > p.stock) return App.toast(`«${H.esc(p.name)}»: на складе только ${p.stock}`, 'warn'); }
      ls.forEach(l => { H.product(l.pid).stock -= l.qty; });
      const total = H.sum(ls, l => l.qty * l.cost);
      st.moves.push({ id: H.uid(), no: st.seq.move++, ts: Date.now(), type: 'writeoff', staff: App.user.id, reason, note: $('#note', m).value.trim(), lines: ls, total });
      App.log(`Списание (${reason}) на ${H.money(total)}`);
      App.save(); m.close(); App.toast('Списано', 'ok'); App.refresh();
    };
  }

  function inventoryModal() {
    const st = App.state();
    const items = st.products.filter(p => p.track).map(p => ({ p, real: p.stock }));
    const m = App.modal(`${App.head('Инвентаризация', 'посчитай фактический остаток — разница спишется или добавится')}<div class="modal-body">
      <div class="inv-sum" id="isum"></div>
      <div class="inv-list">${items.map((it, i) => `<div class="line-row">${H.imgTag(it.p, 'sm')}<div class="meta"><div class="name">${H.esc(it.p.name)}</div><div class="sub">в системе: <b class="num">${it.p.stock}</b></div></div><input class="input sm num" type="number" min="0" data-i="${i}" value="${it.p.stock}"><span class="inv-diff num" id="d${i}"></span></div>`).join('')}</div>
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Применить</button></div>`, { wide: true });
    const upd = () => {
      let plus = 0, minus = 0, n = 0;
      items.forEach((it, i) => { const d = it.real - it.p.stock; const el = $('#d' + i, m); el.textContent = d ? (d > 0 ? '+' : '') + d : ''; el.className = 'inv-diff num ' + (d > 0 ? 'up' : d < 0 ? 'down' : ''); if (d) n++; if (d > 0) plus += d * it.p.cost; else minus -= d * it.p.cost; });
      $('#isum', m).innerHTML = `<div><span>Расхождений</span><b class="num">${n}</b></div><div><span>Излишки</span><b class="num up">+${H.nf(plus)}</b></div><div><span>Недостача</span><b class="num down">−${H.nf(minus)}</b></div>`;
    };
    m.addEventListener('input', e => { const i = e.target.closest('[data-i]'); if (i) { items[+i.dataset.i].real = Math.max(0, Math.floor(+i.value || 0)); upd(); } });
    upd();
    $('#ok', m).onclick = () => {
      const diff = items.filter(it => it.real !== it.p.stock);
      if (!diff.length) { m.close(); return App.toast('Расхождений нет 👍', 'ok'); }
      const lines = diff.map(it => ({ pid: it.p.id, name: it.p.name, was: it.p.stock, now: it.real, qty: it.real - it.p.stock, cost: it.p.cost }));
      diff.forEach(it => it.p.stock = it.real);
      const total = H.sum(lines, l => l.qty * l.cost);
      st.moves.push({ id: H.uid(), no: st.seq.move++, ts: Date.now(), type: 'inventory', staff: App.user.id, note: `${lines.length} расхождений`, lines, total });
      App.log(`Инвентаризация: ${lines.length} расхождений, итог ${H.money(total)}`);
      App.save(); m.close(); App.toast('Инвентаризация проведена', 'ok'); App.refresh();
    };
  }

  App.views.stock = { render: stockRender, refresh: () => stockRender(sRoot) };
})();
