/* Синхронизация с Supabase: общая база для всех устройств кафе.
   Каждая запись (товар, продажа, смена…) — отдельная строка в таблице records.
   Локальная копия в браузере остаётся: без интернета касса работает, изменения уйдут позже. */
(() => {
  const cfg = window.CAFE_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const COLS = ['products', 'staff', 'customers', 'sales', 'shifts', 'expenses', 'moves', 'log', 'held', 'cats'];
  const META = ['settings', 'seq'];
  const HKEY = 'cafe.sync.hashes', TKEY = 'cafe.sync.since';
  let client = null, hashes = {}, since = null, timer = null, pushing = false, dirty = false, status = 'off', channel = null, refreshPending = false;

  // JSON с отсортированными ключами: Postgres (jsonb) меняет порядок ключей
  const canon = (v) => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
  try { hashes = JSON.parse(localStorage.getItem(HKEY)) || {}; since = localStorage.getItem(TKEY); } catch (e) {}
  const persist = () => { try { localStorage.setItem(HKEY, JSON.stringify(hashes)); if (since) localStorage.setItem(TKEY, since); } catch (e) {} };

  function setStatus(s) {
    status = s;
    const el = document.getElementById('syncDot'); if (!el) return;
    const t = { ok: 'Синхронизировано', saving: 'Сохраняется…', offline: 'Нет сети — сохранится позже', error: 'Ошибка синхронизации', off: 'Локальный режим' }[s];
    el.className = 'sync-dot ' + s; el.title = t; el.dataset.label = t;
  }

  // все записи текущего состояния: kind → id → объект
  function snapshot() {
    const st = App.state(), out = [];
    COLS.forEach(k => (st[k] || []).forEach(item => { if (!item.id) item.id = App.H.uid(); out.push([k, item.id, item]); }));
    META.forEach(k => out.push(['meta', k, st[k]]));
    return out;
  }

  function schedule() { if (!enabled || !client) return; dirty = true; clearTimeout(timer); timer = setTimeout(push, 500); }

  async function push() {
    if (!client || pushing) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    pushing = true; dirty = false; setStatus('saving');
    try {
      const rows = [], seen = new Set();
      snapshot().forEach(([kind, id, data]) => {
        const key = kind + ':' + id, json = canon(data); seen.add(key);
        if (hashes[key] !== json) rows.push({ kind, id, data, deleted: false, _json: json });
      });
      Object.keys(hashes).forEach(key => { if (!seen.has(key) && hashes[key] !== null) { const i = key.indexOf(':'); rows.push({ kind: key.slice(0, i), id: key.slice(i + 1), data: {}, deleted: true, _json: null }); } });
      for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400);
        const { error } = await client.from('records').upsert(chunk.map(({ _json, ...r }) => r), { onConflict: 'kind,id' });
        if (error) throw error;
        chunk.forEach(r => { const key = r.kind + ':' + r.id; if (r.deleted) delete hashes[key]; else hashes[key] = r._json; });
        persist();
      }
      setStatus('ok');
    } catch (e) {
      console.warn('sync push', e);
      setStatus(navigator.onLine ? 'error' : 'offline');
      setTimeout(schedule, 15000);
    } finally {
      pushing = false;
      if (dirty) schedule();
    }
  }

  // применяем запись с сервера к локальному состоянию
  function apply(r) {
    const st = App.state(), key = r.kind + ':' + r.id;
    if (r.kind === 'meta') { if (!r.deleted && META.includes(r.id)) { st[r.id] = r.data; hashes[key] = canon(r.data); } return; }
    if (!COLS.includes(r.kind)) return;
    const arr = st[r.kind] = st[r.kind] || [];
    const i = arr.findIndex(x => x.id === r.id);
    if (r.deleted) { if (i >= 0) arr.splice(i, 1); delete hashes[key]; return; }
    if (i >= 0) arr[i] = r.data; else arr.push(r.data);
    hashes[key] = canon(r.data);
  }
  const sortState = () => { const st = App.state(); ['sales', 'shifts', 'moves', 'expenses'].forEach(k => st[k] && st[k].sort((a, b) => (a.ts || a.openTs || 0) - (b.ts || b.openTs || 0))); st.log && st.log.sort((a, b) => b.ts - a.ts); };

  async function pull() {
    let from = 0, got = 0, maxTs = since;
    for (;;) {
      let q = client.from('records').select('kind,id,data,deleted,updated_at').order('updated_at', { ascending: true }).range(from, from + 999);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q; if (error) throw error;
      data.forEach(r => { apply(r); if (!maxTs || r.updated_at > maxTs) maxTs = r.updated_at; });
      got += data.length; if (data.length < 1000) break; from += 1000;
    }
    since = maxTs; sortState(); App.saveLocal(); persist();
    return got;
  }

  function scheduleRefresh() {
    if (refreshPending) return; refreshPending = true;
    const tryIt = () => {
      const busy = document.querySelector('.modal-bg') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
      if (busy) return setTimeout(tryIt, 1200);
      refreshPending = false; if (App.user) App.refresh();
    };
    setTimeout(tryIt, 250);
  }

  function subscribe() {
    if (channel) client.removeChannel(channel);
    channel = client.channel('records-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, payload => {
        const r = payload.new && payload.new.kind ? payload.new : null; if (!r) return;
        const key = r.kind + ':' + r.id, json = canon(r.data);
        if (!r.deleted && hashes[key] === json) return; // наше же изменение
        apply(r); if (!since || r.updated_at > since) since = r.updated_at;
        sortState(); App.saveLocal(); persist(); scheduleRefresh();
      })
      .subscribe(s => { if (s === 'SUBSCRIBED') setStatus('ok'); });
  }

  // первый запуск на устройстве: база пустая → заливаем текущие данные; иначе забираем данные из базы
  async function start() {
    setStatus('saving');
    const { count, error } = await client.from('records').select('id', { count: 'exact', head: true });
    if (error) throw error;
    if (!count) { // самый первый запуск кафе в облаке: чистый старт без демо-продаж и демо-клиентов
      const st = App.state(); App.freshStart(); st.customers = []; st.held = []; App.saveLocal();
      hashes = {}; since = null; await push(); await pull();
    }
    else {
      if (!since) { // новое устройство: база главнее локальной копии
        const st = App.state(); COLS.forEach(k => st[k] = []); hashes = {};
      }
      await pull(); await push();
    }
    subscribe(); setStatus('ok');
  }

  /* ---------- вход в аккаунт кафе ---------- */
  async function session() { const { data } = await client.auth.getSession(); return data.session; }

  function loginScreen() {
    return new Promise(resolve => {
      const box = document.getElementById('cloudLogin'); box.hidden = false;
      const form = document.getElementById('cloudForm'), err = document.getElementById('cloudErr');
      form.onsubmit = async e => {
        e.preventDefault(); err.textContent = '';
        const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Входим…';
        const { error } = await client.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
        btn.disabled = false; btn.textContent = 'Войти';
        if (error) { err.textContent = /Invalid login/i.test(error.message) ? 'Неверная почта или пароль' : error.message; return; }
        box.hidden = true; resolve();
      };
    });
  }

  async function boot(done) {
    if (!enabled) { setStatus('off'); return done(); }
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, storageKey: 'cafe.auth' } });
    const loading = document.getElementById('cloudLoading');
    try {
      if (!(await session())) await loginScreen();
      loading.hidden = false;
      await start();
    } catch (e) {
      console.warn('sync start', e);
      setStatus(navigator.onLine ? 'error' : 'offline');
      App.toast && setTimeout(() => App.toast(navigator.onLine ? 'Не удалось подключиться к базе — работаем локально' : 'Нет интернета — работаем локально, данные отправятся позже', 'warn'), 600);
    }
    loading.hidden = true;
    done();
  }

  window.addEventListener('online', () => { if (client) { setStatus('saving'); pull().then(() => { scheduleRefresh(); push(); }).catch(() => setStatus('error')); } });
  window.addEventListener('offline', () => client && setStatus('offline'));
  setInterval(() => { if (client && status !== 'ok' && navigator.onLine) push(); }, 30000);

  App.sync = {
    enabled, boot, schedule, status: () => status,
    signOut: async () => { if (!client) return; await client.auth.signOut(); try { localStorage.removeItem(HKEY); localStorage.removeItem(TKEY); } catch (e) {} location.reload(); },
    email: async () => (await session())?.user?.email || '',
  };
})();
