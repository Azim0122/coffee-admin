/* Хранилище, демо-данные и общие хелперы */
window.App = window.App || {};
(() => {
  const KEY = 'cafe.data.v2';
  const DAY = 864e5;
  const uid = () => Math.random().toString(36).slice(2, 10);

  const CATS = [
    { id: 'coffee', name: 'Кофе', icon: '☕', color: '#e8a35c' },
    { id: 'tea', name: 'Чай и какао', icon: '🍵', color: '#5fd39a' },
    { id: 'water', name: 'Вода', icon: '💧', color: '#6aa8ff' },
    { id: 'soda', name: 'Газировка', icon: '🥤', color: '#ff6b6b' },
    { id: 'energy', name: 'Энергетики', icon: '⚡', color: '#b48cff' },
    { id: 'snacks', name: 'Чипсы и снеки', icon: '🍟', color: '#f5c542' },
    { id: 'sweets', name: 'Шоколад', icon: '🍫', color: '#ff8fc7' },
    { id: 'bakery', name: 'Выпечка и еда', icon: '🥐', color: '#e07b4f' },
  ];

  // id, название, категория, цена, закупка, остаток (0 = не учитывать), _, мин. остаток
  const CATALOG = [
    ['espresso', 'Эспрессо', 'coffee', 12000, 3500, 0, 'cover'],
    ['americano', 'Американо', 'coffee', 15000, 4000, 0, 'cover'],
    ['cappuccino', 'Капучино', 'coffee', 22000, 6500, 0, 'cover'],
    ['latte', 'Латте', 'coffee', 24000, 7000, 0, 'cover'],
    ['flatwhite', 'Флэт уайт', 'coffee', 25000, 7500, 0, 'cover'],
    ['raf', 'Раф ванильный', 'coffee', 28000, 8500, 0, 'cover'],
    ['mocha', 'Мокко', 'coffee', 27000, 8000, 0, 'cover'],
    ['icelatte', 'Айс латте', 'coffee', 26000, 7500, 0, 'cover'],
    ['tea_black', 'Чай чёрный', 'tea', 8000, 1500, 0, 'cover'],
    ['tea_green', 'Чай зелёный', 'tea', 8000, 1500, 0, 'cover'],
    ['tea_lemon', 'Чай с лимоном', 'tea', 10000, 2200, 0, 'cover'],
    ['cocoa', 'Какао', 'tea', 18000, 5000, 0, 'cover'],
    ['nestle', 'Nestlé Pure Life 0.5 л', 'water', 4000, 2300, 48, 'contain', 12],
    ['bonaqua', 'BonAqua 0.5 л', 'water', 5000, 2900, 30, 'contain', 10],
    ['borjomi', 'Borjomi 0.5 л', 'water', 14000, 9500, 6, 'contain', 8],
    ['evian', 'Evian 0.5 л', 'water', 16000, 11000, 14, 'contain', 6],
    ['cola', 'Coca-Cola 0.5 л', 'soda', 9000, 5800, 36, 'contain', 12],
    ['colazero', 'Coca-Cola Zero 0.5 л', 'soda', 9000, 5800, 18, 'contain', 8],
    ['fanta', 'Fanta Апельсин 0.5 л', 'soda', 9000, 5800, 20, 'contain', 10],
    ['sprite', 'Sprite 0.5 л', 'soda', 9000, 5800, 4, 'contain', 10],
    ['pepsi', 'Pepsi 0.5 л', 'soda', 8500, 5400, 24, 'contain', 10],
    ['fusetea', 'Fuse Tea 0.5 л', 'soda', 10000, 6500, 16, 'contain', 8],
    ['redbull', 'Red Bull 0.25 л', 'energy', 18000, 12500, 30, 'contain', 10],
    ['redbull_sf', 'Red Bull Sugarfree 0.25 л', 'energy', 18000, 12500, 9, 'contain', 6],
    ['monster', 'Monster Energy 0.5 л', 'energy', 22000, 15000, 14, 'contain', 8],
    ['monster_ultra', 'Monster Ultra White 0.5 л', 'energy', 23000, 15500, 10, 'contain', 6],
    ['adrenaline', 'Adrenaline Rush 0.449 л', 'energy', 15000, 10000, 3, 'contain', 8],
    ['burn', 'Burn 0.25 л', 'energy', 14000, 9500, 18, 'contain', 8],
    ['flashup', 'Flash Up 0.45 л', 'energy', 10000, 6500, 40, 'contain', 10],
    ['lays_sour', 'Lay\'s Сметана и лук', 'snacks', 14000, 9000, 22, 'contain', 8],
    ['lays_classic', 'Lay\'s Классические', 'snacks', 14000, 9000, 15, 'contain', 8],
    ['pringles', 'Pringles Original', 'snacks', 28000, 19000, 7, 'contain', 5],
    ['pringles_sc', 'Pringles Sour Cream', 'snacks', 28000, 19000, 11, 'contain', 5],
    ['cheetos', 'Cheetos', 'snacks', 9000, 5500, 26, 'contain', 8],
    ['doritos', 'Doritos Nacho Cheese', 'snacks', 16000, 10500, 12, 'contain', 6],
    ['snickers', 'Snickers', 'sweets', 9000, 5800, 40, 'contain', 10],
    ['twix', 'Twix', 'sweets', 9000, 5800, 32, 'contain', 10],
    ['kitkat', 'KitKat', 'sweets', 8000, 5200, 25, 'contain', 10],
    ['mars', 'Mars', 'sweets', 9000, 5800, 2, 'contain', 8],
    ['bounty', 'Bounty', 'sweets', 9000, 5800, 18, 'contain', 8],
    ['mms', 'M&M\'s Арахис', 'sweets', 12000, 7800, 20, 'contain', 8],
    ['milka', 'Milka Молочный', 'sweets', 16000, 10500, 9, 'contain', 6],
    ['oreo', 'Oreo', 'sweets', 11000, 7000, 14, 'contain', 6],
    ['croissant', 'Круассан', 'bakery', 7000, 2500, 24, 'cover', 6],
    ['donut', 'Пончик глазированный', 'bakery', 10000, 4000, 9, 'cover', 5],
    ['muffin', 'Маффин черничный', 'bakery', 13000, 5000, 10, 'cover', 4],
    ['cheesecake', 'Чизкейк', 'bakery', 25000, 11000, 6, 'cover', 3],
    ['sandwich', 'Сэндвич с курицей', 'bakery', 22000, 11000, 8, 'cover', 4],
  ];

  // иконка (Fluent Emoji) и фирменный цвет каждого товара
  const LOOK = {
    espresso: ['hot-beverage', '#6b3e26'], americano: ['hot-beverage', '#3d2418'], cappuccino: ['hot-beverage', '#c08552'], latte: ['glass-of-milk', '#c9a27e'],
    flatwhite: ['hot-beverage', '#a47551'], raf: ['glass-of-milk', '#d9b99b'], mocha: ['hot-beverage', '#7f5539'], icelatte: ['bubble-tea', '#9c6644'],
    tea_black: ['teacup-without-handle', '#9b2c0e'], tea_green: ['teacup-without-handle', '#588157'], tea_lemon: ['lemon', '#e9b949'], cocoa: ['hot-beverage', '#5e3023'],
    nestle: ['droplet', '#3fa9f5'], bonaqua: ['droplet', '#0096c7'], borjomi: ['ice', '#2d6a4f'], evian: ['droplet', '#e86a92'],
    cola: ['cup-with-straw', '#e41e2b'], colazero: ['cup-with-straw', '#222222'], fanta: ['tangerine', '#ff7a00'], sprite: ['cup-with-straw', '#00a650'],
    pepsi: ['cup-with-straw', '#0050a0'], fusetea: ['beverage-box', '#e07a3f'],
    redbull: ['high-voltage', '#1d3a8a'], redbull_sf: ['high-voltage', '#5b9bf0'], monster: ['high-voltage', '#3f8f1f'], monster_ultra: ['high-voltage', '#9aa3ad'],
    adrenaline: ['fire', '#7a1414'], burn: ['fire', '#e2421b'], flashup: ['battery', '#f08c00'],
    lays_sour: ['potato', '#2a9d8f'], lays_classic: ['potato', '#f2b705'], pringles: ['french-fries', '#d00000'], pringles_sc: ['french-fries', '#2b9348'],
    cheetos: ['cheese-wedge', '#f77f00'], doritos: ['taco', '#c1121f'],
    snickers: ['chocolate-bar', '#6b4226'], twix: ['chocolate-bar', '#c9a227'], kitkat: ['chocolate-bar', '#d62828'], mars: ['chocolate-bar', '#3b2214'],
    bounty: ['coconut', '#1e6fb8'], mms: ['candy', '#f4b400'], milka: ['chocolate-bar', '#8e7cc3'], oreo: ['cookie', '#1d3557'],
    croissant: ['croissant', '#e09f3e'], donut: ['doughnut', '#ff8fab'], muffin: ['cupcake', '#6a4c93'], cheesecake: ['shortcake', '#f4a261'], sandwich: ['sandwich', '#d97a4a'],
  };
  const CAT_ICON = { coffee: 'hot-beverage', tea: 'teacup-without-handle', water: 'droplet', soda: 'cup-with-straw', energy: 'high-voltage', snacks: 'french-fries', sweets: 'chocolate-bar', bakery: 'croissant' };
  const PICK_ICONS = ['hot-beverage', 'glass-of-milk', 'bubble-tea', 'teacup-without-handle', 'lemon', 'droplet', 'ice', 'cup-with-straw', 'beverage-box', 'tangerine', 'high-voltage', 'fire', 'battery', 'potato', 'french-fries', 'cheese-wedge', 'taco', 'peanuts', 'chocolate-bar', 'candy', 'lollipop', 'cookie', 'coconut', 'croissant', 'doughnut', 'cupcake', 'shortcake', 'pie', 'sandwich', 'soft-ice-cream', 'package'];
  const PICK_COLORS = ['#e41e2b', '#ff7a00', '#f2b705', '#00a650', '#2a9d8f', '#0096c7', '#0050a0', '#1d3a8a', '#8e7cc3', '#e86a92', '#6b3e26', '#c08552', '#222222', '#9aa3ad'];

  const STAFF = [
    { id: 'u1', name: 'Азимжон', role: 'admin', pin: '1111', color: '#e8a35c' },
    { id: 'u2', name: 'Дилноза', role: 'cashier', pin: '2222', color: '#6aa8ff' },
    { id: 'u3', name: 'Бекзод', role: 'cashier', pin: '3333', color: '#5fd39a' },
  ];

  const CUSTOMER_NAMES = ['Шахзод', 'Мадина', 'Отабек', 'Нигора', 'Жасур', 'Камила', 'Сардор', 'Малика', 'Улугбек', 'Севара', 'Тимур', 'Зарина', 'Фаррух', 'Лола', 'Акмаль', 'Гульнора', 'Рустам', 'Феруза', 'Дониёр', 'Шахноза', 'Азиз', 'Нодира', 'Ислом', 'Барно'];
  const EXPENSE_CATS = ['Аренда', 'Зарплата', 'Коммуналка', 'Интернет', 'Хозтовары', 'Ремонт', 'Реклама', 'Прочее'];

  function demoState() {
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const products = CATALOG.map(([key, name, cat, price, cost, stock, fit, min]) => ({
      id: key, name, cat, price, cost, stock: stock || 500, min: min ?? 0, 
      barcode: stock ? String(4870000000000 + Math.floor(Math.random() * 9e8)) : '', active: true, track: !!stock,
    }));
    const customers = CUSTOMER_NAMES.map((name, i) => ({
      id: uid(), name, phone: '+998 9' + [0, 1, 3, 4, 7, 8, 9][i % 7] + ' ' + String(100 + Math.floor(Math.random() * 900)) + '-' + String(10 + Math.floor(Math.random() * 90)) + '-' + String(10 + Math.floor(Math.random() * 90)),
      bonus: 0, spent: 0, visits: 0, created: t0 - (40 + i) * DAY,
    }));

    const weights = products.map(p => ({ coffee: 9, tea: 3, water: 4, soda: 4, energy: 4, snacks: 4, sweets: 3, bakery: 3 }[p.cat] || 2) * (p.price < 12000 ? 1.25 : 1));
    const wsum = weights.reduce((a, b) => a + b, 0);
    const pick = () => { let r = Math.random() * wsum; for (let i = 0; i < products.length; i++) { r -= weights[i]; if (r <= 0) return products[i]; } return products[0]; };
    const hourW = [0, 0, 0, 0, 0, 0, 0, 0, 6, 8, 5, 3, 5, 7, 4, 3, 4, 5, 8, 7, 5, 3, 1, 0];
    const hwSum = hourW.reduce((a, b) => a + b, 0);
    const pickHour = () => { let r = Math.random() * hwSum; for (let h = 0; h < 24; h++) { r -= hourW[h]; if (r <= 0) return h; } return 12; };

    const sales = [], shifts = [], expenses = [], moves = [], log = [];
    let saleNo = 1, shiftNo = 1, moveNo = 1;
    for (let d = 45; d >= 0; d--) {
      const day = t0 - d * DAY, date = new Date(day);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const cashier = STAFF[1 + (d % 2)];
      const shift = { id: uid(), no: shiftNo++, staff: cashier.id, openTs: day + 7.8 * 36e5, openCash: 200000, moves: [], closeTs: null, closeCash: null };
      const n = Math.round((weekend ? 58 : 42) * (0.8 + Math.random() * 0.45) * (1 + (45 - d) * 0.005));
      const list = [];
      for (let i = 0; i < n; i++) {
        const ts = day + pickHour() * 36e5 + Math.floor(Math.random() * 36e5);
        if (ts > Date.now() || ts < shift.openTs) continue;
        const lines = new Map();
        const k = Math.random() < 0.55 ? 1 : Math.random() < 0.7 ? 2 : 3;
        for (let j = 0; j < k; j++) { const p = pick(); lines.set(p.id, (lines.get(p.id) || 0) + 1); }
        const items = [...lines].map(([pid, qty]) => { const p = products.find(x => x.id === pid); return { pid, name: p.name, cat: p.cat, price: p.price, cost: p.cost, qty }; });
        const sub = items.reduce((a, it) => a + it.price * it.qty, 0);
        const discPct = Math.random() < 0.05 ? 10 : 0;
        const disc = Math.round(sub * discPct / 100 / 100) * 100;
        const r = Math.random();
        const cust = Math.random() < 0.28 ? customers[Math.floor(Math.random() * customers.length)] : null;
        list.push({ id: uid(), ts, items, sub, disc, discPct, bonusUsed: 0, total: sub - disc, pay: r < 0.36 ? 'cash' : r < 0.66 ? 'card' : r < 0.85 ? 'click' : 'payme', staff: cashier.id, customer: cust?.id || null, shift: shift.id });
      }
      list.sort((a, b) => a.ts - b.ts).forEach(s => {
        s.no = saleNo++;
        if (s.customer) { const c = customers.find(x => x.id === s.customer); s.bonusEarned = Math.round(s.total * 0.05 / 100) * 100; c.bonus += s.bonusEarned; c.spent += s.total; c.visits++; c.lastVisit = s.ts; }
        if (Math.random() < 0.006) { s.refunded = true; s.refundTs = s.ts + 6e5; }
        sales.push(s);
      });
      const cashSum = list.filter(s => s.pay === 'cash' && !s.refunded).reduce((a, s) => a + s.total, 0);
      if (d > 0) {
        if (Math.random() < 0.3) shift.moves.push({ ts: day + 15 * 36e5, type: 'out', amount: 150000, note: 'Покупка молока' });
        const out = shift.moves.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0);
        shift.expected = shift.openCash + cashSum + out;
        shift.closeTs = day + 22.2 * 36e5;
        shift.closeCash = shift.expected + (Math.random() < 0.2 ? -Math.round(Math.random() * 20) * 1000 : 0);
        shift.revenue = list.filter(s => !s.refunded).reduce((a, s) => a + s.total, 0);
        shift.count = list.length;
      }
      shifts.push(shift);

      if (date.getDate() === 1 || d === 45) {
        expenses.push({ id: uid(), ts: day + 10 * 36e5, cat: 'Аренда', amount: 6000000, note: 'Аренда помещения', staff: 'u1' });
        expenses.push({ id: uid(), ts: day + 10.5 * 36e5, cat: 'Интернет', amount: 250000, note: 'Uzonline', staff: 'u1' });
      }
      if (date.getDate() === 5 || date.getDate() === 20) expenses.push({ id: uid(), ts: day + 18 * 36e5, cat: 'Зарплата', amount: 3500000, note: 'Аванс/зарплата бариста', staff: 'u1' });
      if (date.getDate() === 10) expenses.push({ id: uid(), ts: day + 12 * 36e5, cat: 'Коммуналка', amount: 900000, note: 'Свет, вода, газ', staff: 'u1' });
      if (d % 9 === 3) expenses.push({ id: uid(), ts: day + 13 * 36e5, cat: 'Хозтовары', amount: 180000 + Math.round(Math.random() * 20) * 10000, note: 'Стаканы, крышки, салфетки', staff: 'u1' });
      if (d % 4 === 1) {
        const lines = products.filter(p => p.track).sort(() => Math.random() - 0.5).slice(0, 5).map(p => ({ pid: p.id, name: p.name, qty: [12, 24, 6, 18][Math.floor(Math.random() * 4)], cost: p.cost }));
        moves.push({ id: uid(), no: moveNo++, ts: day + 11 * 36e5, type: 'in', staff: 'u1', supplier: ['Coca-Cola Uzbekistan', 'Korzinka Опт', 'Mars Distribution', 'PepsiCo'][d % 4], note: '', lines, total: lines.reduce((a, l) => a + l.qty * l.cost, 0) });
      }
      if (d === 12) moves.push({ id: uid(), no: moveNo++, ts: day + 20 * 36e5, type: 'writeoff', staff: 'u1', reason: 'Просрочка', note: '', lines: [{ pid: 'croissant', name: 'Круассан', qty: 3, cost: 2500 }, { pid: 'donut', name: 'Пончик глазированный', qty: 2, cost: 4000 }], total: 15500 });
    }
    log.push({ ts: Date.now() - 6e5, staff: 'u1', text: 'Загружены демо-данные' });
    return {
      v: 2,
      settings: { name: 'Coffee Point', currency: 'сум', cashback: 5, lowDefault: 5, footer: 'Спасибо, что выбрали нас! ☕', address: 'Ташкент, ул. Амира Темура 15' },
      cats: CATS, products, staff: STAFF, customers, sales, shifts, expenses, moves, log,
      seq: { sale: saleNo, shift: shiftNo, move: moveNo },
    };
  }

  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || state.v !== 2) state = demoState();

  const saveLocal = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { App.toast && App.toast('Хранилище браузера переполнено — сделай резервную копию'); }
  };
  const save = () => { saveLocal(); App.sync && App.sync.schedule(); };

  /* ---------- helpers ---------- */
  const nf = new Intl.NumberFormat('ru-RU');
  const H = {
    DAY, uid,
    nf: (n) => nf.format(Math.round(n || 0)),
    money: (n) => `${nf.format(Math.round(n || 0))} ${state.settings.currency || ''}`.trim(),
    short: (n) => { const a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',') + ' млн' : a >= 1e3 ? Math.round(a / 1e3) + ' тыс' : String(Math.round(a))); },
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    sum: (arr, f) => arr.reduce((a, x) => a + f(x), 0),
    sod: (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); },
    time: (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    date: (t) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    dateTime: (t) => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    plural: (n, a, b, c) => { n = Math.abs(n); const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; },
    tint: (color, pct = 18) => `color-mix(in srgb, ${color} ${pct}%, transparent)`,
    cat: (id) => state.cats.find(c => c.id === id) || { name: 'Другое', icon: '📦', color: '#a39890' },
    product: (id) => state.products.find(p => p.id === id),
    staff: (id) => state.staff.find(s => s.id === id) || { name: '—', color: '#888', role: 'cashier' },
    customer: (id) => state.customers.find(c => c.id === id),
    costOf: (s) => s.items.reduce((a, it) => a + it.cost * it.qty, 0),
    profitOf: (s) => s.total + (s.bonusUsed || 0) - s.items.reduce((a, it) => a + it.cost * it.qty, 0) - (s.bonusUsed || 0),
    salesIn: (from, to = Infinity) => state.sales.filter(s => !s.refunded && s.ts >= from && s.ts < to),
    lowStock: () => state.products.filter(p => p.active && p.track && p.min > 0 && p.stock <= p.min).sort((a, b) => a.stock / (a.min || 1) - b.stock / (b.min || 1)),
    initials: (name) => String(name).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    look: (p) => {
      const c = H.cat(p.cat), l = LOOK[p.id] || [];
      return { icon: p.icon || l[0] || CAT_ICON[p.cat] || 'package', color: p.color || l[1] || c.color };
    },
    imgTag: (p, cls = '') => {
      const lk = H.look(p);
      return `<div class="pimg ico ${cls}" style="--c:${lk.color}">${App.emo ? App.emo(lk.icon) : ''}</div>`;
    },
  };
  H.profitOf = (s) => s.total - H.costOf(s);

  function log(text) {
    state.log.unshift({ id: uid(), ts: Date.now(), staff: App.user?.id || null, text });
    if (state.log.length > 500) state.log.length = 500;
  }

  App.state = () => state;
  App.setState = (s) => { state = s; save(); };
  App.resetDemo = () => { state = demoState(); save(); };
  App.freshStart = () => {
    Object.assign(state, { sales: [], shifts: [], expenses: [], moves: [], log: [], held: [], seq: { sale: 1, shift: 1, move: 1 } });
    state.customers.forEach(c => Object.assign(c, { bonus: 0, spent: 0, visits: 0, lastVisit: null }));
    log('Начало работы: история очищена'); save();
  };
  App.save = save;
  App.saveLocal = saveLocal;
  App.log = log;
  App.H = H;
  App.EXPENSE_CATS = EXPENSE_CATS;
  App.PICK_ICONS = PICK_ICONS; App.PICK_COLORS = PICK_COLORS;
  App.PAY = [
    { id: 'cash', name: 'Наличные', icon: '💵' },
    { id: 'card', name: 'Карта', icon: '💳' },
    { id: 'click', name: 'Click', icon: '📱' },
    { id: 'payme', name: 'Payme', icon: '🔷' },
  ];
  save();
})();
