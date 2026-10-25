/* Продажи, чеки, смены */
(() => {
  const { $, $$, H, icon } = App;
  App.views = App.views || {};

  /* ---------- чек ---------- */
  App.receipt = (s, fresh) => {
    if (!s) return;
    const st = App.state(), pay = App.PAY.find(p => p.id === s.pay), cust = s.customer && H.customer(s.customer);
    const m = App.modal(`${App.head(fresh ? '' : `Чек №${s.no}`, fresh ? '' : H.dateTime(s.ts))}<div class="modal-body">
      ${fresh ? `<div class="success"><div class="success-ring">✓</div><b>Продажа проведена</b><span>Чек №${s.no}${s.received && s.received > s.total ? ` · сдача <b class="num">${H.money(s.received - s.total)}</b>` : ''}</span></div>` : ''}
      <div class="receipt">
        <div class="r-c b">${H.esc(st.settings.name)}</div>
        <div class="r-c muted sm">${H.esc(st.settings.address || '')}</div>
        <div class="r-c muted sm">${new Date(s.ts).toLocaleString('ru-RU')} · кассир ${H.esc(H.staff(s.staff).name)}</div>
        <hr>
        ${s.items.map(i => `<div class="r-item">${H.imgTag(H.product(i.pid) || i, 'xs')}<span class="r-n">${H.esc(i.name)}<small>${H.nf(i.price)} × ${i.qty}${App.isAdmin() ? ` · <em class="up">+${H.nf((i.price - i.cost) * i.qty)}</em>` : ''}</small></span><span>${H.nf(i.price * i.qty)}</span></div>`).join('')}
        <hr>
        ${s.disc || s.bonusUsed ? `<div class="r-row"><span>Подытог</span><span>${H.nf(s.sub)}</span></div>` : ''}
        ${s.disc ? `<div class="r-row"><span>Скидка${s.discPct ? ' ' + s.discPct + '%' : ''}</span><span>−${H.nf(s.disc)}</span></div>` : ''}
        ${s.bonusUsed ? `<div class="r-row"><span>Оплачено бонусами</span><span>−${H.nf(s.bonusUsed)}</span></div>` : ''}
        <div class="r-row r-total"><span>ИТОГО</span><span>${H.money(s.total)}</span></div>
        <div class="r-row muted"><span>${pay.icon} ${pay.name}</span><span>${s.received ? 'получено ' + H.nf(s.received) : ''}</span></div>
        ${cust ? `<hr><div class="r-row"><span>⭐ ${H.esc(cust.name)}</span><span>+${H.nf(s.bonusEarned || 0)} бонусов</span></div>` : ''}
        ${App.isAdmin() ? `<div class="r-profit"><span>Прибыль с чека (видит только админ)</span><b>+${H.nf(H.profitOf(s))}</b></div>` : ''}
        ${s.refunded ? `<hr><div class="r-c down b">ВОЗВРАТ · ${H.dateTime(s.refundTs)}</div>` : ''}
        <div class="r-c muted sm" style="margin-top:10px">${H.esc(st.settings.footer || '')}</div>
      </div>
    </div>
    <div class="modal-foot">
      ${!fresh && !s.refunded ? `<button class="btn btn-ghost-red" id="rf" style="margin-right:auto">Возврат</button>` : ''}
      <button class="btn" id="pr">${icon('printer')} Печать</button>
      <button class="btn btn-primary" data-close ${fresh ? 'autofocus' : ''}>${fresh ? 'Следующий клиент' : 'Закрыть'}</button>
    </div>`);
    $('#pr', m).onclick = () => printReceipt(s);
    if (fresh) App.celebrate();
    const rf = $('#rf', m);
    if (rf) rf.onclick = async () => {
      if (!App.isAdmin() && s.ts < Date.now() - 864e5) return App.toast('Возврат старше суток может сделать только администратор', 'warn');
      if (!await App.confirmBox(`Оформить возврат по чеку №${s.no} на <b>${H.money(s.total)}</b>?<br><span class="muted" style="font-size:13px;font-weight:500">Товары вернутся на склад, бонусы клиента будут пересчитаны.</span>`, { ok: 'Оформить возврат', danger: true })) return;
      s.refunded = true; s.refundTs = Date.now(); s.refundBy = App.user.id;
      s.items.forEach(i => { const p = H.product(i.pid); if (p && p.track) p.stock += i.qty; });
      if (s.customer) { const c = H.customer(s.customer); if (c) { c.bonus = Math.max(0, c.bonus - (s.bonusEarned || 0) + (s.bonusUsed || 0)); c.spent -= s.total; } }
      App.log(`Возврат по чеку #${s.no} на ${H.money(s.total)}`);
      App.save(); m.close(); App.toast('Возврат оформлен', 'ok'); App.refresh();
    };
  };

  function printReceipt(s) {
    const st = App.state(), w = window.open('', '_blank', 'width=340,height=640'); if (!w) return App.toast('Разреши всплывающие окна для печати', 'warn');
    const line = (a, b) => `<div style="display:flex;justify-content:space-between;gap:8px"><span>${a}</span><span>${b}</span></div>`;
    w.document.write(`<html><head><title>Чек ${s.no}</title></head><body style="font:12px/1.45 monospace;width:280px;margin:10px auto">
      <div style="text-align:center;font-weight:bold;font-size:14px">${H.esc(st.settings.name)}</div><div style="text-align:center">${H.esc(st.settings.address || '')}</div>
      <div style="text-align:center">Чек №${s.no} · ${new Date(s.ts).toLocaleString('ru-RU')}</div><hr>
      ${s.items.map(i => line(`${H.esc(i.name)} ×${i.qty}`, H.nf(i.price * i.qty))).join('')}<hr>
      ${s.disc ? line('Скидка', '−' + H.nf(s.disc)) : ''}${s.bonusUsed ? line('Бонусы', '−' + H.nf(s.bonusUsed)) : ''}
      <div style="font-weight:bold;font-size:14px">${line('ИТОГО', H.money(s.total))}</div>${line('Оплата', App.PAY.find(p => p.id === s.pay).name)}
      <hr><div style="text-align:center">${H.esc(st.settings.footer || '')}</div><script>print();setTimeout(()=>close(),300)<\/script></body></html>`);
    w.document.close();
  }

  /* ---------- продажи ---------- */
  let root, range = 'today', payF = 'all', staffF = 'all', q = '', from = '', to = '', page = 0;
  const PER = 50;

  function rangeBounds() {
    const t0 = H.sod();
    if (range === 'custom' && from) return [new Date(from).setHours(0, 0, 0, 0), to ? new Date(to).setHours(24, 0, 0, 0) : Infinity];
    return { today: [t0, Infinity], yesterday: [t0 - H.DAY, t0], 7: [t0 - 6 * H.DAY, Infinity], 30: [t0 - 29 * H.DAY, Infinity], all: [0, Infinity] }[range] || [t0, Infinity];
  }
  function list() {
    const st = App.state(), [a, b] = rangeBounds(), s = q.trim().toLowerCase();
    return st.sales.filter(x => x.ts >= a && x.ts < b && (payF === 'all' || x.pay === payF) && (staffF === 'all' || x.staff === staffF) && (App.isAdmin() || x.staff === App.user.id || x.shift === App.openShift()?.id)
      && (!s || String(x.no) === s.replace('#', '') || x.items.some(i => i.name.toLowerCase().includes(s)) || (x.customer && (H.customer(x.customer)?.name || '').toLowerCase().includes(s)))).sort((x, y) => y.ts - x.ts);
  }

  function render(el) {
    root = el; page = 0;
    const st = App.state();
    App.setSub('история чеков, возвраты, экспорт');
    App.setActions(`<button class="btn" id="csvBtn">${icon('download')}<span class="hide-sm">Экспорт CSV</span></button>`);
    $('#csvBtn').onclick = exportCsv;
    el.innerHTML = `
      <div class="toolbar">
        <div class="seg" id="rng">${[['today', 'Сегодня'], ['yesterday', 'Вчера'], ['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё'], ['custom', 'Период']].map(([k, n]) => `<button data-r="${k}" class="${range === k ? 'active' : ''}">${n}</button>`).join('')}</div>
        <div class="dates" id="dates" ${range === 'custom' ? '' : 'hidden'}><input type="date" class="input auto" id="df" value="${from}"><span>—</span><input type="date" class="input auto" id="dt" value="${to}"></div>
        <div class="search">${icon('search')}<input class="input" id="sq" placeholder="№ чека, товар, клиент" value="${H.esc(q)}"></div>
        <select class="select auto" id="spay"><option value="all">Все оплаты</option>${App.PAY.map(p => `<option value="${p.id}" ${payF === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('')}</select>
        ${App.isAdmin() ? `<select class="select auto" id="sst"><option value="all">Все сотрудники</option>${st.staff.map(s => `<option value="${s.id}" ${staffF === s.id ? 'selected' : ''}>${H.esc(s.name)}</option>`).join('')}</select>` : ''}
      </div>
      <div class="kpis" id="skpi"></div>
      <div class="card flush"><div class="table-wrap"><table id="stbl"></table></div><div class="pager" id="pager"></div></div>`;
    el.onclick = e => {
      const r = e.target.closest('[data-r]'); if (r) { range = r.dataset.r; $$('#rng button', el).forEach(x => x.classList.toggle('active', x === r)); $('#dates', el).hidden = range !== 'custom'; page = 0; draw(); return; }
      const row = e.target.closest('[data-sale]'); if (row) { App.receipt(st.sales.find(s => s.id === row.dataset.sale)); return; }
      const pg = e.target.closest('[data-page]'); if (pg) { page = +pg.dataset.page; draw(); $('#content').scrollTop = 0; }
    };
    el.oninput = e => { if (e.target.id === 'sq') { q = e.target.value; page = 0; draw(); } };
    el.onchange = e => {
      if (e.target.id === 'spay') payF = e.target.value;
      if (e.target.id === 'sst') staffF = e.target.value;
      if (e.target.id === 'df') from = e.target.value;
      if (e.target.id === 'dt') to = e.target.value;
      page = 0; draw();
    };
    draw();
  }

  function draw() {
    const all = list(), ok = all.filter(s => !s.refunded), ref = all.filter(s => s.refunded);
    const rev = H.sum(ok, s => s.total), prof = H.sum(ok, H.profitOf);
    const byPay = App.PAY.map(p => ({ ...p, v: H.sum(ok.filter(s => s.pay === p.id), s => s.total) })), pmax = Math.max(1, ...byPay.map(p => p.v));
    $('#skpi', root).innerHTML = `
      <div class="card kpi hero"><div class="kpi-icon">💰</div><div class="kpi-label">Выручка</div><div class="kpi-value num">${H.money(rev)}</div><div class="kpi-delta muted">${ok.length} чеков · средний ${H.short(ok.length ? rev / ok.length : 0)}</div></div>
      <div class="card kpi"><div class="kpi-icon">📈</div><div class="kpi-label">Валовая прибыль</div><div class="kpi-value num">${H.money(prof)}</div><div class="kpi-delta muted">маржа ${rev ? Math.round(prof / rev * 100) : 0}%</div></div>
      <div class="card kpi"><div class="kpi-icon">↩️</div><div class="kpi-label">Возвраты</div><div class="kpi-value num">${ref.length}</div><div class="kpi-delta ${ref.length ? 'down' : 'muted'}">на ${H.money(H.sum(ref, s => s.total))}</div></div>
      <div class="card kpi"><div class="kpi-label" style="margin-bottom:10px">По способам оплаты</div>${byPay.map(p => `<div class="paybar"><span>${p.icon} ${p.name}</span><div class="progress"><i style="width:${p.v / pmax * 100}%"></i></div><b class="num">${H.short(p.v)}</b></div>`).join('')}</div>`;
    const shown = all.slice(page * PER, page * PER + PER);
    $('#stbl', root).innerHTML = `<thead><tr><th>Чек</th><th>Время</th><th>Товары</th><th class="hide-sm">Клиент</th><th class="hide-sm">Кассир</th><th class="hide-sm">Оплата</th><th class="r">Сумма</th></tr></thead><tbody>` +
      (shown.map(s => {
        const pay = App.PAY.find(p => p.id === s.pay), stf = H.staff(s.staff), c = s.customer && H.customer(s.customer);
        return `<tr class="clickable ${s.refunded ? 'dim' : ''}" data-sale="${s.id}"><td class="num muted">#${s.no}</td>
          <td><b>${H.time(s.ts)}</b>${range === 'today' ? '' : `<div class="sub">${H.date(s.ts)}</div>`}</td>
          <td><div class="cell-items"><div class="feed-imgs">${s.items.slice(0, 3).map(i => H.imgTag(H.product(i.pid) || i, 'xs')).join('')}</div><span class="ellip">${s.items.map(i => H.esc(i.name) + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ')}</span></div></td>
          <td class="hide-sm">${c ? `<span class="tag amber">⭐ ${H.esc(c.name)}</span>` : '<span class="muted">—</span>'}</td>
          <td class="hide-sm"><div class="cell-staff">${App.avatar(stf, 24)}${H.esc(stf.name)}</div></td>
          <td class="hide-sm"><span class="tag">${pay.icon} ${pay.name}</span></td>
          <td class="r num b">${s.refunded ? '<span class="tag red">возврат</span> ' : ''}${H.nf(s.total)}${s.disc ? `<div class="sub down">−${H.nf(s.disc)}</div>` : ''}</td></tr>`;
      }).join('') || `<tr><td colspan="7"><div class="empty"><div class="big">🧾</div>Чеков за период нет</div></td></tr>`) + '</tbody>';
    const pages = Math.ceil(all.length / PER);
    $('#pager', root).innerHTML = pages > 1 ? `<span class="muted">${page * PER + 1}–${Math.min(all.length, (page + 1) * PER)} из ${all.length}</span><div class="pager-btns"><button class="btn btn-sm" data-page="${page - 1}" ${page ? '' : 'disabled'}>← Назад</button><button class="btn btn-sm" data-page="${page + 1}" ${page < pages - 1 ? '' : 'disabled'}>Вперёд →</button></div>` : '';
  }

  function exportCsv() {
    const rows = [['Чек', 'Дата', 'Время', 'Товары', 'Кол-во', 'Подытог', 'Скидка', 'Бонусы', 'Итого', 'Себестоимость', 'Прибыль', 'Оплата', 'Кассир', 'Клиент', 'Возврат']];
    list().forEach(s => rows.push([s.no, new Date(s.ts).toLocaleDateString('ru-RU'), H.time(s.ts), s.items.map(i => `${i.name} x${i.qty}`).join('; '), H.sum(s.items, i => i.qty), s.sub, s.disc, s.bonusUsed || 0, s.total, H.costOf(s), H.profitOf(s), App.PAY.find(p => p.id === s.pay).name, H.staff(s.staff).name, H.customer(s.customer)?.name || '', s.refunded ? 'да' : '']));
    App.csv(rows, `продажи-${new Date().toISOString().slice(0, 10)}.csv`);
    App.toast('Файл скачан', 'ok');
  }

  App.views.sales = { render, refresh: () => render(root) };

  /* ================= СМЕНЫ ================= */
  let shRoot;
  const shiftStats = (sh) => {
    const sales = App.state().sales.filter(s => s.shift === sh.id), ok = sales.filter(s => !s.refunded);
    const byPay = {}; App.PAY.forEach(p => byPay[p.id] = H.sum(ok.filter(s => s.pay === p.id), s => s.total));
    const moves = H.sum(sh.moves || [], m => m.type === 'in' ? m.amount : -m.amount);
    return { count: ok.length, refunds: sales.length - ok.length, revenue: H.sum(ok, s => s.total), profit: H.sum(ok, H.profitOf), byPay, moves, expected: sh.openCash + byPay.cash + moves };
  };

  App.openShiftModal = (after) => {
    const st = App.state(), last = [...st.shifts].reverse().find(s => s.closeTs);
    const m = App.modal(`${App.head('Открыть смену', `кассир: ${H.esc(App.user.name)}`)}<div class="modal-body">
      <div class="field"><label>Наличные в кассе на начало смены</label><input class="input num big-input" id="oc" type="number" min="0" value="${last ? last.closeCash : 200000}" autofocus></div>
      ${last ? `<div class="hint">На конец прошлой смены было <b class="num">${H.money(last.closeCash)}</b></div>` : ''}
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Открыть смену</button></div>`);
    $('#ok', m).onclick = () => {
      if (App.openShift()) { m.close(); return App.toast('Смена уже открыта', 'warn'); }
      const sh = { id: H.uid(), no: st.seq.shift++, staff: App.user.id, openTs: Date.now(), openCash: Math.max(0, +$('#oc', m).value || 0), moves: [], closeTs: null, closeCash: null };
      st.shifts.push(sh); App.log(`Открыта смена №${sh.no}`); App.save(); m.close(); App.toast(`Смена №${sh.no} открыта`, 'ok'); App.chrome();
      after ? after() : App.refresh();
    };
  };

  function cashMove(type) {
    const sh = App.openShift();
    const m = App.modal(`${App.head(type === 'in' ? 'Внесение наличных' : 'Изъятие наличных', type === 'in' ? 'размен, пополнение кассы' : 'инкассация, покупки из кассы')}<div class="modal-body">
      <div class="field"><label>Сумма</label><input class="input num big-input" id="a" type="number" min="0" autofocus></div>
      <div class="field"><label>Комментарий</label><input class="input" id="n" placeholder="${type === 'in' ? 'Размен' : 'Купили молоко'}"></div>
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Сохранить</button></div>`);
    $('#ok', m).onclick = () => {
      const a = +$('#a', m).value; if (!(a > 0)) return App.toast('Укажи сумму', 'warn');
      sh.moves.push({ ts: Date.now(), type, amount: a, note: $('#n', m).value.trim(), staff: App.user.id });
      App.log(`${type === 'in' ? 'Внесение' : 'Изъятие'} ${H.money(a)} (смена №${sh.no})`); App.save(); m.close(); App.refresh();
    };
  }

  function closeShift() {
    const sh = App.openShift(), s = shiftStats(sh);
    const m = App.modal(`${App.head(`Закрыть смену №${sh.no}`, 'посчитай наличные в кассе')}<div class="modal-body">
      <div class="kv"><span>Выручка за смену</span><b class="num">${H.money(s.revenue)}</b></div>
      <div class="kv"><span>Ожидается наличных в кассе</span><b class="num">${H.money(s.expected)}</b></div>
      <div class="field"><label>Фактически в кассе</label><input class="input num big-input" id="cc" type="number" min="0" value="${s.expected}" autofocus></div>
      <div class="pay-total"><span>Расхождение</span><b class="num" id="df"></b></div>
    </div><div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="ok">Закрыть смену и Z-отчёт</button></div>`);
    const upd = () => { const d = (+$('#cc', m).value || 0) - s.expected; $('#df', m).textContent = d ? (d > 0 ? '+' : '−') + H.money(Math.abs(d)) : 'нет ✓'; $('#df', m).className = 'num ' + (d < 0 ? 'down' : d > 0 ? 'amber-t' : 'up'); };
    $('#cc', m).oninput = upd; upd();
    $('#ok', m).onclick = () => {
      Object.assign(sh, { closeTs: Date.now(), closeCash: Math.max(0, +$('#cc', m).value || 0), expected: s.expected, revenue: s.revenue, count: s.count, closedBy: App.user.id });
      App.log(`Закрыта смена №${sh.no}, выручка ${H.money(s.revenue)}`); App.save(); m.close(); App.chrome(); zReport(sh); App.refresh();
    };
  }

  function zReport(sh) {
    const s = shiftStats(sh), diff = sh.closeTs ? sh.closeCash - sh.expected : 0;
    const sales = App.state().sales.filter(x => x.shift === sh.id && !x.refunded), top = new Map();
    sales.forEach(x => x.items.forEach(i => top.set(i.pid, (top.get(i.pid) || 0) + i.qty)));
    App.modal(`${App.head(`${sh.closeTs ? 'Z-отчёт' : 'X-отчёт'} · смена №${sh.no}`, `${H.esc(H.staff(sh.staff).name)} · ${H.dateTime(sh.openTs)} — ${sh.closeTs ? H.time(sh.closeTs) : 'сейчас'}`)}<div class="modal-body">
      <div class="zgrid">
        <div><span>Выручка</span><b class="num">${H.money(s.revenue)}</b></div><div><span>Прибыль</span><b class="num up">${H.money(s.profit)}</b></div>
        <div><span>Чеков</span><b class="num">${s.count}</b></div><div><span>Средний чек</span><b class="num">${H.money(s.count ? s.revenue / s.count : 0)}</b></div>
      </div>
      <div class="card-title sm">Оплаты</div>
      ${App.PAY.map(p => `<div class="kv"><span>${p.icon} ${p.name}</span><b class="num">${H.money(s.byPay[p.id])}</b></div>`).join('')}
      <div class="card-title sm">Наличные</div>
      <div class="kv"><span>На начало</span><b class="num">${H.money(sh.openCash)}</b></div>
      <div class="kv"><span>Продажи наличными</span><b class="num">+${H.money(s.byPay.cash)}</b></div>
      ${(sh.moves || []).map(mv => `<div class="kv"><span>${mv.type === 'in' ? 'Внесение' : 'Изъятие'} · ${H.esc(mv.note || '')} <small class="muted">${H.time(mv.ts)}</small></span><b class="num ${mv.type === 'in' ? 'up' : 'down'}">${mv.type === 'in' ? '+' : '−'}${H.money(mv.amount)}</b></div>`).join('')}
      <div class="kv b"><span>Ожидается</span><b class="num">${H.money(s.expected)}</b></div>
      ${sh.closeTs ? `<div class="kv"><span>Фактически</span><b class="num">${H.money(sh.closeCash)}</b></div><div class="kv"><span>Расхождение</span><b class="num ${diff < 0 ? 'down' : diff > 0 ? 'amber-t' : 'up'}">${diff ? (diff > 0 ? '+' : '−') + H.money(Math.abs(diff)) : 'нет ✓'}</b></div>` : ''}
      <div class="card-title sm">Топ товаров смены</div>
      <div class="ztop">${[...top].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([pid, n]) => { const p = H.product(pid); return p ? `<div>${H.imgTag(p, 'xs')}<span>${H.esc(p.name)}</span><b class="num">${n}</b></div>` : ''; }).join('')}</div>
    </div><div class="modal-foot"><button class="btn" onclick="window.print()">${icon('printer')} Печать</button><button class="btn btn-primary" data-close>Готово</button></div>`, { wide: true });
  }

  function shiftsRender(el) {
    shRoot = el;
    const st = App.state(), sh = App.openShift();
    App.setSub('открытие и закрытие смен, движение наличных');
    App.setActions(sh ? `<button class="btn" id="xr">X-отчёт</button><button class="btn btn-red" id="cl">Закрыть смену</button>` : `<button class="btn btn-primary" id="op">Открыть смену</button>`);
    if (sh) { $('#xr').onclick = () => zReport(sh); $('#cl').onclick = closeShift; } else $('#op').onclick = () => App.openShiftModal();
    let cur = '';
    if (sh) {
      const s = shiftStats(sh), hrs = (Date.now() - sh.openTs) / 36e5;
      cur = `<div class="card shift-live">
        <div class="sl-head"><div><div class="live"><span class="live-dot"></span> Смена №${sh.no} открыта</div><div class="sl-who">${App.avatar(H.staff(sh.staff), 28)} ${H.esc(H.staff(sh.staff).name)} · с ${H.time(sh.openTs)} · ${Math.floor(hrs)} ч ${Math.round((hrs % 1) * 60)} мин</div></div>
        <div class="sl-btns"><button class="btn btn-sm" id="cin">${icon('plus')} Внесение</button><button class="btn btn-sm" id="cout">− Изъятие</button></div></div>
        <div class="zgrid four">
          <div><span>Выручка</span><b class="num">${H.money(s.revenue)}</b></div>
          <div><span>Чеков</span><b class="num">${s.count}</b></div>
          <div><span>Наличных в кассе</span><b class="num">${H.money(s.expected)}</b></div>
          <div><span>Безнал</span><b class="num">${H.money(s.revenue - s.byPay.cash)}</b></div>
        </div>
        ${sh.moves.length ? `<div class="sl-moves">${sh.moves.map(mv => `<span class="tag ${mv.type === 'in' ? 'green' : 'red'}">${H.time(mv.ts)} ${mv.type === 'in' ? '+' : '−'}${H.nf(mv.amount)} ${H.esc(mv.note || '')}</span>`).join('')}</div>` : ''}
      </div>`;
    }
    const closed = st.shifts.filter(s => s.closeTs).sort((a, b) => b.openTs - a.openTs).slice(0, 60);
    el.innerHTML = `${cur}
      <div class="card flush"><div class="card-head pad"><div><div class="card-title">История смен</div><div class="card-sub">нажми, чтобы открыть Z-отчёт</div></div></div>
      <div class="table-wrap"><table><thead><tr><th>№</th><th>Дата</th><th>Кассир</th><th class="hide-sm">Время</th><th class="r">Чеков</th><th class="r">Выручка</th><th class="r">Касса</th></tr></thead><tbody>
      ${closed.map(s => { const d = s.closeCash - s.expected; return `<tr class="clickable" data-sh="${s.id}"><td class="num muted">${s.no}</td><td><b>${new Date(s.openTs).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</b></td><td><div class="cell-staff">${App.avatar(H.staff(s.staff), 24)}${H.esc(H.staff(s.staff).name)}</div></td><td class="hide-sm muted">${H.time(s.openTs)}–${H.time(s.closeTs)}</td><td class="r num">${s.count ?? '—'}</td><td class="r num b">${H.nf(s.revenue || 0)}</td><td class="r">${d ? `<span class="tag ${d < 0 ? 'red' : 'amber'} num">${d > 0 ? '+' : '−'}${H.nf(Math.abs(d))}</span>` : '<span class="tag green">✓</span>'}</td></tr>`; }).join('') || '<tr><td colspan="7"><div class="empty">Закрытых смен ещё нет</div></td></tr>'}
      </tbody></table></div></div>`;
    el.onclick = e => {
      if (e.target.closest('#cin')) return cashMove('in');
      if (e.target.closest('#cout')) return cashMove('out');
      const r = e.target.closest('[data-sh]'); if (r) zReport(st.shifts.find(s => s.id === r.dataset.sh));
    };
  }
  App.views.shifts = { render: shiftsRender, refresh: () => shiftsRender(shRoot) };
})();
