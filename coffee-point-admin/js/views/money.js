/* Расходы и отчёты */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};
  const ECOL = { 'Аренда': '#e8a35c', 'Зарплата': '#6aa8ff', 'Коммуналка': '#5fd39a', 'Интернет': '#4fd1c5', 'Хозтовары': '#f5c542', 'Ремонт': '#ff6b6b', 'Реклама': '#b48cff', 'Закупка товара': '#e07b4f', 'Прочее': '#a39890' };

  function period(key) {
    const t0 = H.sod(), d = new Date();
    if (key === 'month') { const s = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return [s, Infinity, s - (Date.now() - s), s, 'этот месяц']; }
    if (key === 'prevmonth') { const s = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), e = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return [s, e, s - (e - s), s, 'прошлый месяц']; }
    const n = +key; return [t0 - (n - 1) * H.DAY, Infinity, t0 - (2 * n - 1) * H.DAY, t0 - (n - 1) * H.DAY, `${n} дней`];
  }
  const PERIODS = [['7', '7 дней'], ['30', '30 дней'], ['month', 'Этот месяц'], ['prevmonth', 'Прошлый месяц'], ['90', '90 дней']];

  /* ================= РАСХОДЫ ================= */
  let eRoot, ePer = 'month';
  function expRender(el) {
    eRoot = el;
    const st = App.state(), [a, b] = period(ePer);
    const list = st.expenses.filter(x => x.ts >= a && x.ts < b).sort((x, y) => y.ts - x.ts);
    const total = H.sum(list, x => x.amount);
    const byCat = {}; list.forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
    const cd = Object.entries(byCat).map(([n, v]) => ({ name: n, v, color: ECOL[n] || '#a39890' })).sort((x, y) => y.v - x.v);
    const sales = H.salesIn(a, b), gross = H.sum(sales, H.profitOf);
    App.setSub('аренда, зарплаты и прочие траты бизнеса');
    App.setActions(`<button class="btn btn-primary" id="ne">${icon('plus')}<span class="hide-sm">Расход</span></button>`);
    $('#ne').onclick = () => expModal();
    el.innerHTML = `
      <div class="toolbar"><div class="seg" id="ep">${PERIODS.map(([k, n]) => `<button data-p="${k}" class="${ePer === k ? 'active' : ''}">${n}</button>`).join('')}</div></div>
      <div class="kpis">
        <div class="card kpi"><div class="kpi-icon">💸</div><div class="kpi-label">Расходы</div><div class="kpi-value num">${H.money(total)}</div><div class="kpi-delta muted">${list.length} записей</div></div>
        <div class="card kpi"><div class="kpi-icon">📈</div><div class="kpi-label">Валовая прибыль</div><div class="kpi-value num">${H.money(gross)}</div><div class="kpi-delta muted">выручка минус себестоимость</div></div>
        <div class="card kpi hero"><div class="kpi-icon">🏦</div><div class="kpi-label">Чистая прибыль</div><div class="kpi-value num ${gross - total < 0 ? 'down' : ''}">${H.money(gross - total)}</div><div class="kpi-delta muted">после всех расходов</div></div>
        <div class="card kpi"><div class="kpi-icon">⚖️</div><div class="kpi-label">Расходы / выручка</div><div class="kpi-value num">${H.sum(sales, s => s.total) ? Math.round(total / H.sum(sales, s => s.total) * 100) : 0}%</div><div class="kpi-delta muted">доля трат от продаж</div></div>
      </div>
      <div class="grid g-side">
        <div class="card"><div class="card-head"><div class="card-title">Структура расходов</div></div><div class="donut-wrap col">${App.donut(cd, 'расходы')}<div class="legend">${cd.map(c => `<div class="legend-item"><i style="background:${c.color}"></i><span>${c.name}</span><span class="num">${H.short(c.v)}</span></div>`).join('') || '<div class="muted">Нет расходов</div>'}</div></div></div>
        <div class="card flush"><div class="table-wrap"><table><thead><tr><th>Дата</th><th>Категория</th><th class="hide-sm">Комментарий</th><th class="hide-sm">Кто</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
          ${list.map(x => `<tr><td>${H.dateTime(x.ts)}</td><td><span class="tag" style="color:${ECOL[x.cat] || 'var(--muted)'};background:${H.tint(ECOL[x.cat] || '#888', 14)}">${H.esc(x.cat)}</span></td><td class="hide-sm">${H.esc(x.note || '')}</td><td class="hide-sm muted">${H.esc(H.staff(x.staff).name)}</td><td class="r num b">${H.nf(x.amount)}</td><td class="r"><button class="icon-btn sm" data-ed="${x.id}">${icon('edit')}</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">Расходов за период нет</div></td></tr>'}
        </tbody></table></div></div>
      </div>`;
    el.onclick = e => {
      const p = e.target.closest('[data-p]'); if (p) { ePer = p.dataset.p; expRender(el); }
      const ed = e.target.closest('[data-ed]'); if (ed) expModal(st.expenses.find(x => x.id === ed.dataset.ed));
    };
  }
  function expModal(x) {
    const st = App.state(), isNew = !x, cats = [...App.EXPENSE_CATS, 'Закупка товара'];
    const d = new Date(x?.ts || Date.now()); const dv = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const m = App.modal(`${App.head(isNew ? 'Новый расход' : 'Расход')}<div class="modal-body">
      <div class="field"><label>Категория</label><div class="chips wrap" id="ec">${cats.map(c => `<button class="chip ${(x?.cat || 'Прочее') === c ? 'active' : ''}" data-c="${c}"><span class="chip-dot" style="background:${ECOL[c]}"></span>${c}</button>`).join('')}</div></div>
      <div class="field-row"><div class="field"><label>Сумма</label><input class="input num big-input" id="a" type="number" min="0" value="${x?.amount || ''}" autofocus></div><div class="field"><label>Дата</label><input class="input" id="d" type="date" value="${dv}"></div></div>
      <div class="field"><label>Комментарий</label><input class="input" id="n" value="${H.esc(x?.note || '')}"></div>
    </div><div class="modal-foot">${isNew ? '' : `<button class="btn btn-ghost-red" id="del" style="margin-right:auto">${icon('trash')}</button>`}<button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Сохранить</button></div>`);
    let cat = x?.cat || 'Прочее';
    $('#ec', m).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; $$('#ec .chip', m).forEach(q => q.classList.toggle('active', q === b)); };
    $('#ok', m).onclick = () => {
      const amount = +$('#a', m).value; if (!(amount > 0)) return App.toast('Укажи сумму', 'warn');
      const day = new Date($('#d', m).value); const ts = isNaN(day) ? Date.now() : (H.sod(day.getTime() + day.getTimezoneOffset() * 6e4) === H.sod() ? Date.now() : day.getTime() + 12 * 36e5 + day.getTimezoneOffset() * 6e4);
      const data = { cat, amount, note: $('#n', m).value.trim(), ts };
      if (isNew) st.expenses.push({ id: H.uid(), staff: App.user.id, ...data }); else Object.assign(x, data);
      App.log(`${isNew ? 'Расход' : 'Изменён расход'}: ${cat} ${H.money(amount)}`); App.save(); m.close(); App.toast('Сохранено', 'ok'); expRender(eRoot);
    };
    const del = $('#del', m);
    if (del) del.onclick = async () => { if (!await App.confirmBox('Удалить расход?', { danger: true, ok: 'Удалить' })) return; st.expenses = st.expenses.filter(q => q !== x); App.log(`Удалён расход ${x.cat} ${H.money(x.amount)}`); App.save(); m.close(); expRender(eRoot); };
  }
  App.views.expenses = { render: expRender, refresh: () => expRender(eRoot) };

  /* ================= ОТЧЁТЫ ================= */
  let rRoot, rPer = '30', rTab = 'pnl';
  function repRender(el) {
    rRoot = el;
    App.setSub('аналитика продаж, прибыли и товаров');
    App.setActions(`<button class="btn" id="rcsv">${icon('download')}<span class="hide-sm">CSV по товарам</span></button>`);
    $('#rcsv').onclick = exportProducts;
    el.innerHTML = `
      <div class="toolbar">
        <div class="seg" id="rp">${PERIODS.map(([k, n]) => `<button data-p="${k}" class="${rPer === k ? 'active' : ''}">${n}</button>`).join('')}</div>
        <div class="spacer"></div>
        <div class="seg" id="rt">${[['pnl', 'Прибыль'], ['products', 'Товары (ABC)'], ['cats', 'Категории'], ['time', 'Время'], ['staff', 'Сотрудники']].map(([k, n]) => `<button data-t="${k}" class="${rTab === k ? 'active' : ''}">${n}</button>`).join('')}</div>
      </div>
      <div id="rbody"></div>`;
    el.onclick = e => {
      const p = e.target.closest('[data-p]'); if (p) { rPer = p.dataset.p; $$('#rp button', el).forEach(x => x.classList.toggle('active', x === p)); draw(); }
      const t = e.target.closest('[data-t]'); if (t) { rTab = t.dataset.t; $$('#rt button', el).forEach(x => x.classList.toggle('active', x === t)); draw(); }
    };
    draw();
  }

  function productStats(sales) {
    const m = new Map();
    sales.forEach(s => s.items.forEach(i => { const x = m.get(i.pid) || { pid: i.pid, name: i.name, cat: i.cat, q: 0, rev: 0, cost: 0 }; x.q += i.qty; x.rev += i.price * i.qty; x.cost += i.cost * i.qty; m.set(i.pid, x); }));
    const list = [...m.values()].sort((a, b) => b.rev - a.rev), tot = H.sum(list, x => x.rev) || 1;
    let acc = 0; list.forEach(x => { acc += x.rev; x.share = x.rev / tot; x.cum = acc / tot; x.abc = x.cum <= .8 ? 'A' : x.cum <= .95 ? 'B' : 'C'; });
    return list;
  }

  function draw() {
    const st = App.state(), [a, b, pa, pb, label] = period(rPer);
    const sales = H.salesIn(a, b), prev = H.salesIn(pa, pb);
    const rev = H.sum(sales, s => s.total), cost = H.sum(sales, H.costOf), gross = rev - cost;
    const exp = H.sum(st.expenses.filter(x => x.ts >= a && x.ts < b && x.cat !== 'Закупка товара'), x => x.amount);
    const wo = H.sum(st.moves.filter(x => x.ts >= a && x.ts < b && x.type === 'writeoff'), x => x.total);
    const disc = H.sum(sales, s => s.disc + (s.bonusUsed || 0));
    const pRev = H.sum(prev, s => s.total), pGross = pRev - H.sum(prev, H.costOf);
    const dl = (c, p) => p ? `<span class="${c >= p ? 'up' : 'down'}">${c >= p ? '↑' : '↓'} ${Math.abs((c - p) / p * 100).toFixed(1).replace('.', ',')}%</span>` : '';
    const body = $('#rbody', rRoot);

    if (rTab === 'pnl') {
      const net = gross - exp - wo;
      const days = []; const dEnd = Math.min(b, H.sod() + H.DAY);
      for (let t = a; t < dEnd; t += H.DAY) { const d = new Date(t); days.push({ l: d.getDate(), full: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }), v: H.sum(H.salesIn(t, t + H.DAY), H.profitOf), c: H.sum(H.salesIn(t - (a - pa), t - (a - pa) + H.DAY), H.profitOf) }); }
      body.innerHTML = `
        <div class="grid g-side">
          <div class="card pnl">
            <div class="card-title">Отчёт о прибылях и убытках</div><div class="card-sub mb">${label} · сравнение с предыдущим периодом</div>
            <div class="pnl-row big"><span>Выручка</span><b class="num">${H.money(rev)}</b><em>${dl(rev, pRev)}</em></div>
            <div class="pnl-row sub"><span>в т.ч. скидки и бонусы</span><b class="num">−${H.money(disc)}</b><em></em></div>
            <div class="pnl-row"><span>Себестоимость товаров</span><b class="num down">−${H.money(cost)}</b><em></em></div>
            <div class="pnl-row total"><span>Валовая прибыль</span><b class="num">${H.money(gross)}</b><em>${dl(gross, pGross)}</em></div>
            <div class="pnl-row sub"><span>маржинальность</span><b class="num">${rev ? Math.round(gross / rev * 100) : 0}%</b><em></em></div>
            <div class="pnl-row"><span>Операционные расходы</span><b class="num down">−${H.money(exp)}</b><em></em></div>
            <div class="pnl-row"><span>Списания</span><b class="num down">−${H.money(wo)}</b><em></em></div>
            <div class="pnl-row total hero"><span>Чистая прибыль</span><b class="num ${net < 0 ? 'down' : 'up'}">${H.money(net)}</b><em></em></div>
            <div class="pnl-row sub"><span>чеков · средний чек</span><b class="num">${sales.length} · ${H.money(sales.length ? rev / sales.length : 0)}</b><em>${dl(sales.length, prev.length)}</em></div>
          </div>
          <div class="card"><div class="card-head"><div><div class="card-title">Валовая прибыль по дням</div><div class="card-sub">пунктир — предыдущий период</div></div></div><div class="chart tall" id="rch"></div></div>
        </div>`;
      App.area($('#rch', body), days, { color: 'var(--green)', compare: true, every: Math.ceil(days.length / 10) });
    }

    if (rTab === 'products') {
      const list = productStats(sales), cnt = { A: 0, B: 0, C: 0 }; list.forEach(x => cnt[x.abc]++);
      const sold = new Set(list.map(x => x.pid)), dead = st.products.filter(p => p.active && !sold.has(p.id));
      body.innerHTML = `
        <div class="kpis three">
          <div class="card kpi"><div class="abc A">A</div><div class="kpi-label">Дают 80% выручки</div><div class="kpi-value num">${cnt.A} ${H.plural(cnt.A, 'товар', 'товара', 'товаров')}</div><div class="kpi-delta muted">держать всегда в наличии</div></div>
          <div class="card kpi"><div class="abc B">B</div><div class="kpi-label">Следующие 15%</div><div class="kpi-value num">${cnt.B}</div><div class="kpi-delta muted">стабильный спрос</div></div>
          <div class="card kpi"><div class="abc C">C</div><div class="kpi-label">Последние 5%</div><div class="kpi-value num">${cnt.C}</div><div class="kpi-delta muted">${dead.length ? `+ ${dead.length} без продаж` : 'кандидаты на вывод'}</div></div>
        </div>
        <div class="card flush"><div class="table-wrap"><table><thead><tr><th>#</th><th>Товар</th><th class="r">Продано</th><th class="r">Выручка</th><th class="r hide-sm">Прибыль</th><th class="r hide-sm">Маржа</th><th class="hide-sm">Доля</th><th class="r">ABC</th></tr></thead><tbody>
        ${list.map((x, i) => { const p = H.product(x.pid) || { ...x, img: '' }, mg = x.rev ? Math.round((x.rev - x.cost) / x.rev * 100) : 0; return `<tr><td class="muted num">${i + 1}</td><td><div class="cell-prod">${H.imgTag(p, 'sm')}<div><b>${H.esc(x.name)}</b><div class="sub">${H.cat(x.cat).name}</div></div></div></td><td class="r num">${x.q}</td><td class="r num b">${H.nf(x.rev)}</td><td class="r num hide-sm up">${H.nf(x.rev - x.cost)}</td><td class="r hide-sm"><span class="tag ${mg >= 40 ? 'green' : mg >= 25 ? 'amber' : 'red'} num">${mg}%</span></td><td class="hide-sm"><div class="share"><div class="progress"><i style="width:${x.share / list[0].share * 100}%"></i></div><span class="num">${(x.share * 100).toFixed(1).replace('.', ',')}%</span></div></td><td class="r"><span class="abc sm ${x.abc}">${x.abc}</span></td></tr>`; }).join('')}
        ${dead.map(p => `<tr class="dim"><td></td><td><div class="cell-prod">${H.imgTag(p, 'sm')}<div><b>${H.esc(p.name)}</b><div class="sub">нет продаж за период</div></div></div></td><td class="r num">0</td><td class="r">—</td><td class="hide-sm"></td><td class="hide-sm"></td><td class="hide-sm"></td><td class="r"><span class="abc sm C">—</span></td></tr>`).join('')}
        </tbody></table></div></div>`;
    }

    if (rTab === 'cats') {
      const m = new Map(), pm = new Map();
      sales.forEach(s => s.items.forEach(i => { const x = m.get(i.cat) || { rev: 0, cost: 0, q: 0 }; x.rev += i.price * i.qty; x.cost += i.cost * i.qty; x.q += i.qty; m.set(i.cat, x); }));
      prev.forEach(s => s.items.forEach(i => pm.set(i.cat, (pm.get(i.cat) || 0) + i.price * i.qty)));
      const list = [...m].map(([id, x]) => ({ ...H.cat(id), ...x, v: x.rev, p: pm.get(id) || 0 })).sort((x, y) => y.rev - x.rev), mx = list[0]?.rev || 1;
      body.innerHTML = `<div class="grid g-side">
        <div class="card"><div class="card-title mb">Доля выручки</div><div class="donut-wrap col">${App.donut(list)}<div class="legend">${list.map(c => `<div class="legend-item"><i style="background:${c.color}"></i><span>${c.name}</span><span class="num">${Math.round(c.rev / (rev || 1) * 100)}%</span></div>`).join('')}</div></div></div>
        <div class="card"><div class="card-title mb">Категории подробно</div>${list.map(c => `<div class="cat-row"><span class="kpi-icon sm" style="background:${H.tint(c.color, 20)}">${c.icon}</span><div class="meta"><div class="cat-line"><b>${c.name}</b><span class="num b">${H.money(c.rev)}</span></div><div class="progress"><i style="width:${c.rev / mx * 100}%;background:${c.color}"></i></div><div class="cat-line sub"><span>${c.q} шт · маржа ${Math.round((c.rev - c.cost) / c.rev * 100)}% · прибыль ${H.short(c.rev - c.cost)}</span>${dl(c.rev, c.p)}</div></div></div>`).join('')}</div>
      </div>`;
    }

    if (rTab === 'time') {
      const wd = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(l => ({ l, v: 0, n: 0 })), hours = Array.from({ length: 16 }, (_, i) => ({ l: String(i + 7), full: `${i + 7}:00–${i + 8}:00`, v: 0 }));
      const daysCnt = Array(7).fill(0); for (let t = a; t < Math.min(b, Date.now()); t += H.DAY) daysCnt[(new Date(t).getDay() + 6) % 7]++;
      sales.forEach(s => { const d = new Date(s.ts), w = (d.getDay() + 6) % 7; wd[w].v += s.total; wd[w].n++; const h = d.getHours() - 7; if (hours[h]) hours[h].v += s.total; });
      wd.forEach((w, i) => { w.v = daysCnt[i] ? w.v / daysCnt[i] : 0; w.full = `${w.l}, в среднем за день`; });
      const best = [...wd].sort((x, y) => y.v - x.v)[0], peak = [...hours].sort((x, y) => y.v - x.v)[0];
      body.innerHTML = `<div class="kpis three">
          <div class="card kpi"><div class="kpi-icon">📅</div><div class="kpi-label">Лучший день недели</div><div class="kpi-value">${best.l}</div><div class="kpi-delta muted">в среднем ${H.money(best.v)}</div></div>
          <div class="card kpi"><div class="kpi-icon">⏰</div><div class="kpi-label">Час пик</div><div class="kpi-value num">${peak.full}</div><div class="kpi-delta muted">${H.money(peak.v)} за период</div></div>
          <div class="card kpi"><div class="kpi-icon">🧾</div><div class="kpi-label">Чеков в день</div><div class="kpi-value num">${Math.round(sales.length / Math.max(1, H.sum(daysCnt, x => x)))}</div><div class="kpi-delta muted">в среднем</div></div>
        </div>
        <div class="grid g-2"><div class="card"><div class="card-title mb">Средняя выручка по дням недели</div><div class="chart" id="rw"></div></div><div class="card"><div class="card-title mb">Выручка по часам</div><div class="chart" id="rh"></div></div></div>`;
      App.bars($('#rw', body), wd, { hl: 'max' });
      App.bars($('#rh', body), hours, { hl: 'max', color: 'var(--blue)', every: 2 });
    }

    if (rTab === 'staff') {
      const by = new Map(); sales.forEach(s => { const x = by.get(s.staff) || { n: 0, rev: 0, prof: 0, items: 0, cust: 0 }; x.n++; x.rev += s.total; x.prof += H.profitOf(s); x.items += H.sum(s.items, i => i.qty); if (s.customer) x.cust++; by.set(s.staff, x); });
      const refunds = st.sales.filter(s => s.refunded && s.ts >= a && s.ts < b);
      body.innerHTML = `<div class="card flush"><div class="table-wrap"><table><thead><tr><th>Сотрудник</th><th class="r">Чеков</th><th class="r">Выручка</th><th class="r hide-sm">Прибыль</th><th class="r">Средний чек</th><th class="r hide-sm">Товаров в чеке</th><th class="r hide-sm">С картой клиента</th><th class="r hide-sm">Возвраты</th></tr></thead><tbody>
        ${[...by].sort((x, y) => y[1].rev - x[1].rev).map(([id, x]) => { const s = H.staff(id); return `<tr><td><div class="cell-staff">${App.avatar(s, 32)}<b>${H.esc(s.name)}</b></div></td><td class="r num">${x.n}</td><td class="r num b">${H.nf(x.rev)}</td><td class="r num hide-sm up">${H.nf(x.prof)}</td><td class="r num">${H.nf(x.rev / x.n)}</td><td class="r num hide-sm">${(x.items / x.n).toFixed(2).replace('.', ',')}</td><td class="r num hide-sm">${Math.round(x.cust / x.n * 100)}%</td><td class="r num hide-sm">${refunds.filter(r => r.staff === id).length}</td></tr>`; }).join('') || '<tr><td colspan="8"><div class="empty">Нет данных</div></td></tr>'}
      </tbody></table></div></div>`;
    }
  }

  function exportProducts() {
    const [a, b] = period(rPer), list = productStats(H.salesIn(a, b));
    App.csv([['Товар', 'Категория', 'Продано', 'Выручка', 'Себестоимость', 'Прибыль', 'Доля %', 'ABC'], ...list.map(x => [x.name, H.cat(x.cat).name, x.q, x.rev, x.cost, x.rev - x.cost, (x.share * 100).toFixed(2), x.abc])], `товары-${rPer}.csv`);
    App.toast('Файл скачан', 'ok');
  }
  App.views.reports = { render: repRender, refresh: () => repRender(rRoot), onResize: () => rRoot && draw() };
})();
