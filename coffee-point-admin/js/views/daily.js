/* Итоги дня: что продали, сколько заработали с каждого товара */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};
  let root, day = H.sod(), sort = 'profit', charts = [];

  function stats(from, to) {
    const sales = H.salesIn(from, to), m = new Map();
    sales.forEach(s => {
      // скидка/бонусы распределяются по позициям пропорционально
      const k = s.sub ? s.total / s.sub : 1;
      s.items.forEach(i => {
        const x = m.get(i.pid) || { pid: i.pid, name: i.name, cat: i.cat, q: 0, rev: 0, cost: 0, price: i.price, unitCost: i.cost };
        x.q += i.qty; x.rev += i.price * i.qty * k; x.cost += i.cost * i.qty; x.price = i.price; x.unitCost = i.cost; m.set(i.pid, x);
      });
    });
    const list = [...m.values()].map(x => ({ ...x, profit: x.rev - x.cost, unitProfit: x.price - x.unitCost }));
    return { sales, list, rev: H.sum(sales, s => s.total), cost: H.sum(list, x => x.cost), qty: H.sum(list, x => x.q), disc: H.sum(sales, s => s.disc + (s.bonusUsed || 0)) };
  }

  function render(el) {
    root = el;
    charts.forEach(c => c.destroy()); charts = [];
    const isToday = day === H.sod();
    const d = new Date(day);
    const cur = stats(day, day + H.DAY), prev = stats(day - H.DAY, day);
    const profit = cur.rev - cur.cost, pProfit = prev.rev - prev.cost;
    const margin = cur.rev ? profit / cur.rev * 100 : 0;
    const wo = H.sum(App.state().moves.filter(m => m.type === 'writeoff' && m.ts >= day && m.ts < day + H.DAY), m => m.total);
    const dl = (c, p) => p ? `<span class="pill ${c >= p ? 'up' : 'down'}">${c >= p ? '↑' : '↓'} ${Math.abs((c - p) / p * 100).toFixed(0)}%</span>` : '';

    App.setSub(isToday ? 'сегодня — обновляется после каждой продажи' : 'итоги за выбранный день');
    App.setActions(`<button class="btn" id="dCsv">${icon('download')}<span class="hide-sm">CSV</span></button><button class="btn" id="dPrint">${icon('printer')}<span class="hide-sm">Печать</span></button>`);
    $('#dCsv').onclick = () => exportCsv(cur);
    $('#dPrint').onclick = () => window.print();

    const list = [...cur.list].sort({ profit: (a, b) => b.profit - a.profit, qty: (a, b) => b.q - a.q, rev: (a, b) => b.rev - a.rev, unit: (a, b) => b.unitProfit - a.unitProfit, margin: (a, b) => (b.profit / b.rev) - (a.profit / a.rev) }[sort]);
    const maxP = Math.max(1, ...list.map(x => x.profit));

    el.innerHTML = `
      <div class="day-nav">
        <button class="icon-btn" data-day="-1" title="Предыдущий день">‹</button>
        <div class="day-title"><b>${isToday ? 'Сегодня' : d.toLocaleDateString('ru-RU', { weekday: 'long' })}</b><span>${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <button class="icon-btn" data-day="1" ${isToday ? 'disabled' : ''} title="Следующий день">›</button>
        <input type="date" class="input auto" id="dPick" value="${new Date(day - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)}">
        ${isToday ? '' : '<button class="btn btn-sm" data-day="today">Сегодня</button>'}
      </div>

      <div class="day-hero card">
        <div class="dh-main">
          <div class="dh-label">Чистая прибыль с продаж</div>
          <div class="dh-value num" data-count="${Math.round(profit)}">${H.money(profit)}</div>
          <div class="dh-sub">${dl(profit, pProfit)} к предыдущему дню · маржа <b class="num">${margin.toFixed(1).replace('.', ',')}%</b></div>
          <div class="formula">
            <div><span>Выручка</span><b class="num" data-count="${Math.round(cur.rev)}">${H.money(cur.rev)}</b></div>
            <i>−</i>
            <div><span>Себестоимость</span><b class="num" data-count="${Math.round(cur.cost)}">${H.money(cur.cost)}</b></div>
            <i>=</i>
            <div class="res"><span>Прибыль</span><b class="num" data-count="${Math.round(profit)}">${H.money(profit)}</b></div>
          </div>
        </div>
        <div class="dh-ring"><canvas id="dRing"></canvas><div class="dh-ring-c"><b class="num">${Math.round(margin)}%</b><span>маржа</span></div></div>
      </div>

      <div class="kpis">
        <div class="card kpi"><div class="kpi-icon">📦</div><div class="kpi-label">Продано товаров</div><div class="kpi-value num" data-count="${cur.qty}">${cur.qty}</div><div class="kpi-delta">${dl(cur.qty, prev.qty)} ${cur.list.length} разных позиций</div></div>
        <div class="card kpi"><div class="kpi-icon">🧾</div><div class="kpi-label">Чеков</div><div class="kpi-value num" data-count="${cur.sales.length}">${cur.sales.length}</div><div class="kpi-delta">средний чек ${H.money(cur.sales.length ? cur.rev / cur.sales.length : 0)}</div></div>
        <div class="card kpi"><div class="kpi-icon">🏷️</div><div class="kpi-label">Скидки и бонусы</div><div class="kpi-value num" data-count="${Math.round(cur.disc)}">${H.money(cur.disc)}</div><div class="kpi-delta">уже вычтены из выручки</div></div>
        <div class="card kpi"><div class="kpi-icon">🗑️</div><div class="kpi-label">Списания</div><div class="kpi-value num" data-count="${Math.round(wo)}">${H.money(wo)}</div><div class="kpi-delta">${wo ? 'итого с учётом списаний ' + H.short(profit - wo) : 'без потерь 👍'}</div></div>
      </div>

      <div class="grid g-main">
        <div class="card"><div class="card-head"><div><div class="card-title">Выручка и прибыль по часам</div><div class="card-sub">когда больше всего зарабатываете</div></div></div><div class="cjs"><canvas id="dHours"></canvas></div></div>
        <div class="card"><div class="card-head"><div><div class="card-title">Прибыль по категориям</div><div class="card-sub">откуда приходят деньги</div></div></div><div class="cjs"><canvas id="dCats"></canvas></div></div>
      </div>

      <div class="card flush">
        <div class="card-head pad">
          <div><div class="card-title">Все проданные товары</div><div class="card-sub">прибыль = (цена продажи − закупка) × количество</div></div>
          <select class="select auto" id="dSort">
            <option value="profit">По прибыли</option><option value="qty">По количеству</option><option value="rev">По выручке</option><option value="unit">По прибыли с 1 шт</option><option value="margin">По марже</option>
          </select>
        </div>
        <div class="table-wrap"><table class="day-table">
          <thead><tr><th>Товар</th><th class="r">Закупка</th><th class="r">Продажа</th><th class="r">С 1 шт</th><th class="r">Продано</th><th class="r hide-sm">Выручка</th><th class="r hide-sm">Себестоимость</th><th class="r">Прибыль</th></tr></thead>
          <tbody>
          ${list.map(x => {
            const p = H.product(x.pid) || { ...x, img: '' }, mg = x.rev ? Math.round(x.profit / x.rev * 100) : 0;
            return `<tr class="day-row">
              <td><div class="cell-prod">${H.imgTag(p, 'sm')}<div><b>${H.esc(x.name)}</b><div class="sub">${H.cat(x.cat).name} · маржа ${mg}%</div></div></div></td>
              <td class="r num muted">${H.nf(x.unitCost)}</td>
              <td class="r num">${H.nf(x.price)}</td>
              <td class="r"><span class="unit-profit num">+${H.nf(x.unitProfit)}</span></td>
              <td class="r"><b class="num qty-big">${x.q}</b> <span class="muted">шт</span></td>
              <td class="r num hide-sm">${H.nf(x.rev)}</td>
              <td class="r num muted hide-sm">${H.nf(x.cost)}</td>
              <td class="r"><div class="profit-cell"><b class="num up">${H.nf(x.profit)}</b><div class="pbar"><i style="width:${x.profit / maxP * 100}%"></i></div></div></td>
            </tr>`;
          }).join('') || `<tr><td colspan="8"><div class="empty"><div class="big">🌙</div>В этот день продаж не было</div></td></tr>`}
          </tbody>
          ${list.length ? `<tfoot><tr><td><b>Итого</b></td><td></td><td></td><td></td><td class="r"><b class="num">${cur.qty}</b> <span class="muted">шт</span></td><td class="r num b hide-sm">${H.nf(cur.rev)}</td><td class="r num hide-sm">${H.nf(cur.cost)}</td><td class="r"><b class="num up tot">${H.money(profit)}</b></td></tr></tfoot>` : ''}
        </table></div>
      </div>`;

    $('#dSort', el).value = sort;
    el.onchange = e => {
      if (e.target.id === 'dSort') { sort = e.target.value; render(el); }
      if (e.target.id === 'dPick' && e.target.value) { const v = new Date(e.target.value); day = Math.min(H.sod(), H.sod(v.getTime() + v.getTimezoneOffset() * 6e4)); render(el); }
    };
    el.onclick = e => {
      const b = e.target.closest('[data-day]'); if (!b) return;
      day = b.dataset.day === 'today' ? H.sod() : Math.min(H.sod(), H.sod(day + (+b.dataset.day) * H.DAY + 36e5 * 3));
      render(el);
    };
    drawCharts(cur, margin);
  }

  function drawCharts(cur, margin) {
    if (!window.Chart) return;
    const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
    Chart.defaults.font.family = 'Manrope, system-ui'; Chart.defaults.color = v('--muted');
    charts.push(new Chart($('#dRing', root), {
      type: 'doughnut',
      data: { datasets: [{ data: [Math.max(0, margin), 100 - Math.max(0, margin)], backgroundColor: [v('--green'), v('--bg-2')], borderWidth: 0, borderRadius: 8 }] },
      options: { cutout: '78%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateRotate: true, duration: 1200, easing: 'easeOutQuart' } },
    }));

    const hours = Array.from({ length: 16 }, (_, i) => i + 7), rev = hours.map(() => 0), prof = hours.map(() => 0);
    cur.sales.forEach(s => { const h = new Date(s.ts).getHours() - 7; if (h >= 0 && h < 16) { rev[h] += s.total; prof[h] += H.profitOf(s); } });
    const tip = { backgroundColor: v('--text'), titleColor: v('--bg'), bodyColor: v('--bg'), padding: 10, cornerRadius: 10, displayColors: true, callbacks: { label: c => ` ${c.dataset.label}: ${H.money(c.raw)}` } };
    const grid = { color: v('--line'), drawTicks: false }, ticks = { callback: x => H.short(x), padding: 8 };
    charts.push(new Chart($('#dHours', root), {
      type: 'bar',
      data: { labels: hours.map(h => h + ':00'), datasets: [
        { label: 'Выручка', data: rev, backgroundColor: v('--accent') + '55', hoverBackgroundColor: v('--accent'), borderRadius: 6, borderSkipped: false },
        { label: 'Прибыль', data: prof, type: 'line', borderColor: v('--green'), backgroundColor: v('--green'), tension: .4, cubicInterpolationMode: 'monotone', pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }, tooltip: tip }, scales: { x: { grid: { display: false } }, y: { grid, border: { display: false }, ticks } }, animation: { duration: 900, easing: 'easeOutQuart' } },
    }));

    const cm = new Map(); cur.list.forEach(x => cm.set(x.cat, (cm.get(x.cat) || 0) + x.profit));
    const cats = [...cm].sort((a, b) => b[1] - a[1]);
    charts.push(new Chart($('#dCats', root), {
      type: 'bar',
      data: { labels: cats.map(([id]) => H.cat(id).name), datasets: [{ label: 'Прибыль', data: cats.map(c => Math.round(c[1])), backgroundColor: cats.map(([id]) => H.cat(id).color), borderRadius: 7, borderSkipped: false, barThickness: 18 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tip }, scales: { x: { grid, border: { display: false }, ticks }, y: { grid: { display: false }, border: { display: false } } }, animation: { duration: 1000, easing: 'easeOutQuart', delay: c => c.dataIndex * 80 } },
    }));
  }

  function exportCsv(cur) {
    const d = new Date(day).toLocaleDateString('ru-RU');
    App.csv([['Дата', 'Товар', 'Категория', 'Закупка за шт', 'Цена продажи', 'Прибыль с 1 шт', 'Продано шт', 'Выручка', 'Себестоимость', 'Прибыль'],
      ...cur.list.sort((a, b) => b.profit - a.profit).map(x => [d, x.name, H.cat(x.cat).name, x.unitCost, x.price, x.unitProfit, x.q, Math.round(x.rev), x.cost, Math.round(x.profit)]),
      [d, 'ИТОГО', '', '', '', '', cur.qty, Math.round(cur.rev), cur.cost, Math.round(cur.rev - cur.cost)]], `итоги-${new Date(day).toISOString().slice(0, 10)}.csv`);
    App.toast('Файл скачан', 'ok');
  }

  App.views.daily = { render: el => { render(el); }, refresh: () => render(root), onResize: () => {} };
})();
