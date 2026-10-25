/* Дашборд */
(() => {
  const { $, H, icon } = App;
  App.views = App.views || {};
  let range = 7, root;

  function delta(cur, prev, label = 'к вчера') {
    if (!prev) return `<div class="kpi-delta muted">нет данных для сравнения</div>`;
    const p = (cur - prev) / Math.abs(prev) * 100;
    return `<div class="kpi-delta ${p >= 0 ? 'up' : 'down'}"><span class="pill">${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1).replace('.', ',')}%</span> ${label}</div>`;
  }

  function spark(vals, color) {
    const max = Math.max(1, ...vals), w = 100, h = 30, st = w / (vals.length - 1 || 1);
    const pts = vals.map((v, i) => `${i * st},${h - v / max * h}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }

  function render(el) {
    root = el;
    const st = App.state();
    const t0 = H.sod(), now = Date.now(), off = now - t0, y0 = t0 - H.DAY;
    const today = H.salesIn(t0), ySame = H.salesIn(y0, y0 + off);
    const rev = H.sum(today, s => s.total), revY = H.sum(ySame, s => s.total);
    const prof = H.sum(today, H.profitOf), profY = H.sum(ySame, H.profitOf);
    const avg = today.length ? rev / today.length : 0, avgY = ySame.length ? revY / ySame.length : 0;
    const days14 = Array.from({ length: 14 }, (_, i) => t0 - (13 - i) * H.DAY);
    const sp = (f) => days14.map(d => f(H.salesIn(d, d + H.DAY)));
    const newCust = today.filter(s => s.customer).length;

    App.setSub(`${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} · сравнение с тем же временем вчера`);
    App.setActions(`<button class="btn btn-primary" data-go="pos">${icon('plus')}<span class="hide-sm">Новая продажа</span></button>`);

    const sh = App.openShift();
    el.innerHTML = `
      <div class="kpis">
        <div class="card kpi hero"><div class="kpi-top"><div class="kpi-icon">💰</div>${spark(sp(a => H.sum(a, s => s.total)), 'var(--accent)')}</div><div class="kpi-label">Выручка сегодня</div><div class="kpi-value num">${H.money(rev)}</div>${delta(rev, revY)}</div>
        <div class="card kpi"><div class="kpi-top"><div class="kpi-icon">📈</div>${spark(sp(a => H.sum(a, H.profitOf)), 'var(--green)')}</div><div class="kpi-label">Валовая прибыль</div><div class="kpi-value num">${H.money(prof)}</div>${delta(prof, profY)}</div>
        <div class="card kpi"><div class="kpi-top"><div class="kpi-icon">🧾</div>${spark(sp(a => a.length), 'var(--blue)')}</div><div class="kpi-label">Чеков</div><div class="kpi-value num">${today.length}</div>${delta(today.length, ySame.length)}</div>
        <div class="card kpi"><div class="kpi-top"><div class="kpi-icon">🎯</div>${spark(sp(a => a.length ? H.sum(a, s => s.total) / a.length : 0), 'var(--violet)')}</div><div class="kpi-label">Средний чек</div><div class="kpi-value num">${H.money(avg)}</div>${delta(avg, avgY)}</div>
      </div>

      <div class="grid g-main">
        <div class="card">
          <div class="card-head">
            <div><div class="card-title">Выручка</div><div class="card-sub" id="dRevSub"></div></div>
            <div class="seg" id="dRange">${[7, 14, 30].map(r => `<button data-r="${r}" class="${r === range ? 'active' : ''}">${r} дн</button>`).join('')}</div>
          </div>
          <div class="legend-inline"><span><i style="background:var(--accent)"></i>текущий период</span><span><i class="dash"></i>предыдущий</span></div>
          <div class="chart" id="dRev"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Топ товаров</div><div class="card-sub">по выручке за 7 дней</div></div><button class="btn btn-sm" data-go="reports">Отчёты</button></div>
          <div id="dTop"></div>
        </div>
      </div>

      <div class="grid g-3">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Категории</div><div class="card-sub">доля выручки за 7 дней</div></div></div>
          <div class="donut-wrap" id="dCats"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Загруженность</div><div class="card-sub">чеки по дням недели и часам, 4 недели</div></div></div>
          <div id="dHeat"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Заканчивается</div><div class="card-sub">пора заказать у поставщика</div></div><button class="btn btn-sm" data-go="stock">Склад</button></div>
          <div id="dLow"></div>
        </div>
      </div>

      <div class="grid g-3">
        <div class="card span-2">
          <div class="card-head"><div><div class="card-title">Последние продажи</div><div class="card-sub">в реальном времени</div></div><button class="btn btn-sm" data-go="sales">Все продажи</button></div>
          <div id="dFeed"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Сегодня</div><div class="card-sub">смена и команда</div></div></div>
          <div class="today-box">
            ${sh ? `<div class="list-row"><div class="kpi-icon sm">🟢</div><div class="meta"><div class="name">Смена №${sh.no} открыта</div><div class="sub">${H.esc(H.staff(sh.staff).name)} · с ${H.time(sh.openTs)}</div></div><button class="btn btn-sm" data-go="shifts">Открыть</button></div>` : `<div class="list-row"><div class="kpi-icon sm">⚪</div><div class="meta"><div class="name">Смена закрыта</div></div><button class="btn btn-sm btn-primary" data-go="shifts">Открыть</button></div>`}
            <div class="list-row"><div class="kpi-icon sm">⭐</div><div class="meta"><div class="name">${newCust} ${H.plural(newCust, 'покупка', 'покупки', 'покупок')} с бонусной картой</div><div class="sub">из ${today.length} чеков</div></div></div>
            <div class="list-row"><div class="kpi-icon sm">📦</div><div class="meta"><div class="name">${H.sum(today, s => H.sum(s.items, i => i.qty))} товаров продано</div><div class="sub">${H.lowStock().length} позиций заканчивается</div></div></div>
          </div>
          <div class="card-title" style="margin:18px 0 8px;font-size:13px">Рейтинг кассиров · 7 дней</div>
          <div id="dStaff"></div>
        </div>
      </div>`;

    el.onclick = e => {
      const b = e.target.closest('#dRange [data-r]'); if (b) { range = +b.dataset.r; el.querySelectorAll('#dRange button').forEach(x => x.classList.toggle('active', x === b)); drawRev(); }
      const r = e.target.closest('[data-sale]'); if (r) App.receipt(st.sales.find(s => s.id === r.dataset.sale));
      const rs = e.target.closest('[data-restock]'); if (rs) App.restock([rs.dataset.restock]);
    };
    drawRev(); drawRest();
  }

  function drawRev() {
    const t0 = H.sod(), days = [];
    for (let i = range - 1; i >= 0; i--) {
      const f = t0 - i * H.DAY, d = new Date(f), pf = f - range * H.DAY;
      days.push({ l: range > 14 ? d.getDate() : d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''), full: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }), v: H.sum(H.salesIn(f, f + H.DAY), s => s.total), c: H.sum(H.salesIn(pf, pf + H.DAY), s => s.total) });
    }
    const cur = H.sum(days, d => d.v), prev = H.sum(days, d => d.c);
    const p = prev ? (cur - prev) / prev * 100 : 0;
    $('#dRevSub', root).innerHTML = `<b class="num" style="color:var(--text)">${H.money(cur)}</b> <span class="${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1).replace('.', ',')}%</span> к пред. ${range} дням`;
    App.bars($('#dRev', root), days, { compare: true, every: range > 14 ? 3 : 1 });
  }

  function drawRest() {
    const st = App.state(), t0 = H.sod();
    const w7 = H.salesIn(t0 - 6 * H.DAY);
    const map = new Map();
    w7.forEach(s => s.items.forEach(it => { const m = map.get(it.pid) || { pid: it.pid, name: it.name, cat: it.cat, q: 0, rev: 0 }; m.q += it.qty; m.rev += it.price * it.qty; map.set(it.pid, m); }));
    const top = [...map.values()].sort((a, b) => b.rev - a.rev).slice(0, 6), tmax = top[0]?.rev || 1;
    $('#dTop', root).innerHTML = top.map((t, i) => { const p = H.product(t.pid) || { ...t, img: '' }; return `<div class="list-row"><span class="rank">${i + 1}</span>${H.imgTag(p, 'sm')}<div class="meta"><div class="name">${H.esc(t.name)}</div><div class="progress"><i style="width:${t.rev / tmax * 100}%;background:${H.cat(t.cat).color}"></i></div></div><div class="r"><div class="num b">${H.short(t.rev)}</div><div class="sub">${t.q} шт</div></div></div>`; }).join('') || '<div class="empty">Пока нет продаж</div>';

    const byCat = new Map(); w7.forEach(s => s.items.forEach(it => byCat.set(it.cat, (byCat.get(it.cat) || 0) + it.price * it.qty)));
    const cd = [...byCat].map(([id, v]) => ({ ...H.cat(id), v })).sort((a, b) => b.v - a.v), ct = H.sum(cd, d => d.v) || 1;
    $('#dCats', root).innerHTML = App.donut(cd) + `<div class="legend">${cd.map(c => `<div class="legend-item"><i style="background:${c.color}"></i><span>${c.name}</span><span class="num">${Math.round(c.v / ct * 100)}%</span></div>`).join('')}</div>`;

    const hours = Array.from({ length: 15 }, (_, i) => i + 8);
    const m = Array.from({ length: 7 }, () => hours.map(() => 0));
    H.salesIn(t0 - 27 * H.DAY).forEach(s => { const d = new Date(s.ts), wd = (d.getDay() + 6) % 7, h = d.getHours() - 8; if (h >= 0 && h < 15) m[wd][h]++; });
    App.heatmap($('#dHeat', root), m.map(r => r.map(v => Math.round(v / 4))), { rows: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], cols: hours, fmt: v => `~${v} ${H.plural(v, 'чек', 'чека', 'чеков')}` });

    const low = H.lowStock().slice(0, 5);
    $('#dLow', root).innerHTML = low.map(p => `<div class="list-row">${H.imgTag(p, 'sm')}<div class="meta"><div class="name">${H.esc(p.name)}</div><div class="sub">мин. ${p.min} шт</div></div><span class="tag ${p.stock <= 0 ? 'red' : 'amber'} num">${p.stock} шт</span><button class="btn btn-sm" data-restock="${p.id}">${icon('plus')}</button></div>`).join('') || '<div class="empty"><div class="big">✅</div>Всё в наличии</div>';

    const feed = st.sales.slice(-7).reverse();
    $('#dFeed', root).innerHTML = feed.map(s => {
      const pay = App.PAY.find(p => p.id === s.pay), stf = H.staff(s.staff);
      return `<div class="feed-row" data-sale="${s.id}">
        <div class="feed-imgs">${s.items.slice(0, 3).map(i => H.imgTag(H.product(i.pid) || i, 'xs')).join('')}</div>
        <div class="meta"><div class="name">${s.items.map(i => H.esc(i.name) + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ')}</div><div class="sub">#${s.no} · ${H.time(s.ts)} · ${H.esc(stf.name)}${s.customer ? ' · ⭐ ' + H.esc(H.customer(s.customer)?.name || '') : ''}</div></div>
        <span class="tag hide-sm">${pay.icon} ${pay.name}</span>
        <div class="num b">${s.refunded ? '<span class="tag red">возврат</span>' : H.nf(s.total)}</div>
      </div>`;
    }).join('') || '<div class="empty">Нет продаж</div>';

    const by = new Map(); H.salesIn(t0 - 6 * H.DAY).forEach(s => { const x = by.get(s.staff) || { n: 0, v: 0 }; x.n++; x.v += s.total; by.set(s.staff, x); });
    const rows = [...by].sort((a, b) => b[1].v - a[1].v), smax = rows[0]?.[1].v || 1;
    $('#dStaff', root).innerHTML = rows.map(([id, x]) => { const s = H.staff(id); return `<div class="list-row">${App.avatar(s, 32)}<div class="meta"><div class="name">${H.esc(s.name)}</div><div class="progress"><i style="width:${x.v / smax * 100}%;background:${s.color}"></i></div></div><div class="r"><div class="num b">${H.short(x.v)}</div><div class="sub">${x.n} чеков</div></div></div>`; }).join('');
  }

  App.views.dashboard = { render, onResize: () => root && drawRev(), refresh: () => render(root) };
  setInterval(() => { if (App.current && App.current() === 'dashboard' && !document.querySelector('.modal-bg') && root) render(root); }, 60000);
})();
