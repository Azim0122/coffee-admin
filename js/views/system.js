/* Журнал и настройки */
(() => {
  const { $, H, icon } = App;
  App.views = App.views || {};

  let lRoot, lq = '';
  function logRender(el) {
    lRoot = el;
    App.setSub('кто, что и когда менял в системе');
    el.innerHTML = `<div class="toolbar"><div class="search">${icon('search')}<input class="input" id="lq" placeholder="Поиск по журналу" value="${H.esc(lq)}"></div></div><div class="card" id="ll"></div>`;
    el.oninput = e => { if (e.target.id === 'lq') { lq = e.target.value; draw(); } };
    draw();
  }
  function draw() {
    const s = lq.trim().toLowerCase(), list = App.state().log.filter(l => !s || l.text.toLowerCase().includes(s) || H.staff(l.staff).name.toLowerCase().includes(s)).slice(0, 300);
    let lastDay = '';
    $('#ll', lRoot).innerHTML = list.map(l => {
      const day = new Date(l.ts).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
      const hd = day !== lastDay ? `<div class="log-day">${day}</div>` : ''; lastDay = day;
      const st = l.staff ? H.staff(l.staff) : { name: 'Система', color: '#888' };
      return `${hd}<div class="log-row"><span class="log-t num">${H.time(l.ts)}</span>${App.avatar(st, 26)}<b>${H.esc(st.name)}</b><span>${H.esc(l.text)}</span></div>`;
    }).join('') || '<div class="empty">Записей нет</div>';
  }
  App.views.log = { render: logRender, refresh: () => logRender(lRoot) };

  function settingsRender(el) {
    const st = App.state(), s = st.settings;
    let used = 0; try { used = (localStorage.getItem('cafe.data.v2') || '').length * 2; } catch (e) {}
    App.setSub('параметры кафе, данные и резервные копии');
    el.innerHTML = `<div class="settings">
      <div class="card"><div class="card-title">Кафе</div>
        <div class="field"><label>Название</label><input class="input" id="sn" value="${H.esc(s.name)}"></div>
        <div class="field"><label>Адрес (печатается в чеке)</label><input class="input" id="sa" value="${H.esc(s.address || '')}"></div>
        <div class="field"><label>Текст внизу чека</label><input class="input" id="sf" value="${H.esc(s.footer || '')}"></div>
        <div class="field-row"><div class="field"><label>Валюта</label><input class="input" id="sc" value="${H.esc(s.currency)}"></div><div class="field"><label>Кэшбэк клиентам, %</label><input class="input num" id="sb" type="number" min="0" max="50" value="${s.cashback}"></div></div>
        <div class="field"><label>Мин. остаток по умолчанию для новых товаров</label><input class="input num" id="sm" type="number" min="0" value="${s.lowDefault}"></div>
        <button class="btn btn-primary" id="save">Сохранить</button>
      </div>
    
      <div class="card"><div class="card-title">Облако и устройства</div>
        ${App.sync.enabled ? `<div class="kv"><span>Статус</span><b id="cloudSt">${({ ok: '🟢 синхронизировано', saving: 'сохраняется…', offline: 'нет сети', error: 'ошибка', off: 'локально' })[App.sync.status()]}</b></div><div class="kv"><span>Аккаунт кафе</span><b id="cloudEmail">…</b></div><div class="hint">Все устройства, вошедшие в этот аккаунт, видят одни и те же продажи, склад и смены в реальном времени.</div><button class="btn btn-ghost-red" id="cloudOut">Выйти из аккаунта кафе на этом устройстве</button>`
          : `<div class="hint">Облако не подключено: данные хранятся только в этом браузере. Чтобы работать с нескольких устройств, заполни <b>js/config.js</b> данными Supabase.</div>`}
      </div>
      <div class="card"><div class="card-title">Горячие клавиши кассы</div>
        <div class="kv"><span>Поиск товара</span><kbd>F2</kbd></div><div class="kv"><span>Оплатить</span><kbd>F9</kbd></div><div class="kv"><span>Закрыть окно</span><kbd>Esc</kbd></div><div class="kv"><span>Сканер штрихкода</span><span class="muted">просто сканируй — товар добавится</span></div>
      </div>
    </div>`;
    $('#save', el).onclick = () => {
      Object.assign(s, { name: $('#sn', el).value.trim() || 'Кафе', address: $('#sa', el).value.trim(), footer: $('#sf', el).value.trim(), currency: $('#sc', el).value.trim(), cashback: Math.max(0, Math.min(50, +$('#sb', el).value || 0)), lowDefault: Math.max(0, +$('#sm', el).value || 0) });
      App.log('Изменены настройки'); App.save(); App.chrome(); App.toast('Настройки сохранены', 'ok');
    };
    $('#bk', el).onclick = () => { App.download(JSON.stringify(App.state()), `cafe-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); App.toast('Копия скачана', 'ok'); };
    $('#rs', el).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(await f.text()); if (d.v !== 2 || !d.products || !d.sales) throw 0; if (!await App.confirmBox('Заменить текущие данные данными из файла?', { danger: true, ok: 'Восстановить' })) return; App.setState(d); App.toast('Данные восстановлены', 'ok'); App.go('settings'); }
      catch (er) { App.toast('Файл не подходит', 'warn'); }
      e.target.value = '';
    };
    $('#arch', el).onclick = async () => {
      const cut = Date.now() - 90 * H.DAY, old = st.sales.filter(x => x.ts < cut);
      if (!old.length) return App.toast('Нет продаж старше 90 дней');
      if (!await App.confirmBox(`Скачать и удалить из браузера ${old.length} старых продаж?`, { ok: 'Архивировать' })) return;
      App.download(JSON.stringify(old), `cafe-archive-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      st.sales = st.sales.filter(x => x.ts >= cut); App.log(`Архивировано ${old.length} продаж`); App.save(); App.go('settings');
    };
    if (App.sync.enabled) { App.sync.email().then(m => { const e = $('#cloudEmail', el); if (e) e.textContent = m || '—'; }); $('#cloudOut', el).onclick = async () => { if (await App.confirmBox('Выйти из аккаунта кафе на этом устройстве? Для входа снова понадобятся почта и пароль.', { ok: 'Выйти', danger: true })) App.sync.signOut(); }; }
    $('#fresh', el).onclick = async () => { if (!await App.confirmBox('Удалить все продажи, смены, расходы, движения склада и журнал? Товары, цены, сотрудники и клиенты останутся. Это действие нельзя отменить — сначала скачай резервную копию.', { danger: true, ok: 'Начать с нуля' })) return; App.freshStart(); App.toast('Готово — можно начинать работу', 'ok'); App.go('settings'); };
    $('#demo', el).onclick = async () => { if (!await App.confirmBox('Заменить все данные демо-данными? Текущие данные будут потеряны.', { danger: true, ok: 'Сбросить' })) return; App.resetDemo(); App.toast('Демо-данные загружены', 'ok'); location.reload(); };
  }
  App.views.settings = { render: settingsRender };
})();
