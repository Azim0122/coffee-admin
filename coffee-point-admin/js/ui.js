/* UI: иконки, модалки, тосты, графики */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const H = App.H;

  /* ---------- иконки (Iconify: Solar для интерфейса, Fluent Emoji для товаров) ---------- */
  const UI = {
    dashboard: 'widget-5-bold-duotone', pos: 'cart-large-2-bold-duotone', products: 'tag-price-bold-duotone', stock: 'box-bold-duotone',
    sales: 'bill-list-bold-duotone', shifts: 'clock-circle-bold-duotone', customers: 'users-group-rounded-bold-duotone', expenses: 'wallet-money-bold-duotone',
    reports: 'chart-2-bold-duotone', staff: 'user-id-bold-duotone', log: 'document-text-bold-duotone', settings: 'settings-bold-duotone',
    daily: 'calendar-mark-bold-duotone', plus: 'add-circle-bold-duotone', search: 'magnifer-linear', x: 'close-circle-linear', moon: 'moon-bold-duotone',
    sun: 'sun-bold-duotone', logout: 'logout-2-bold-duotone', download: 'download-minimalistic-bold-duotone', upload: 'upload-minimalistic-bold-duotone',
    edit: 'pen-bold-duotone', trash: 'trash-bin-trash-bold-duotone', barcode: 'scanner-bold-duotone', pause: 'pause-circle-bold-duotone',
    user: 'user-bold-duotone', grid: 'widget-bold-duotone', list: 'list-bold-duotone', menu: 'hamburger-menu-linear', star: 'star-bold',
    gift: 'gift-bold-duotone', printer: 'printer-bold-duotone',
  };
  const ICONS = window.ICONS || { fe: {}, so: {} };
  let sprite;
  function sym(set, name) {
    const d = ICONS[set][name]; if (!d) return null;
    const id = `i-${set}-${name}`;
    if (!document.getElementById(id)) {
      if (!sprite) { sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sprite.setAttribute('aria-hidden', 'true'); sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.prepend(sprite); }
      sprite.insertAdjacentHTML('beforeend', `<symbol id="${id}" viewBox="0 0 ${d[0]} ${d[1]}">${d[2]}</symbol>`);
    }
    return id;
  }
  const icon = (n, cls = '') => { const id = sym('so', UI[n] || n); return id ? `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>` : ''; };
  const emo = (n, cls = '') => { const id = sym('fe', n); return id ? `<svg class="emo ${cls}" aria-hidden="true"><use href="#${id}"/></svg>` : ''; };

  // все эмодзи в интерфейсе автоматически заменяются объёмными иконками Fluent
  const EMOJI = {
    '⭐': 'star', '☕': 'hot-beverage', '📦': 'package', '🧾': 'receipt', '📈': 'chart-increasing', '💳': 'credit-card', '💰': 'money-bag',
    '🛒': 'shopping-cart', '🏷': 'label', '👍': 'thumbs-up', '🍵': 'teacup-without-handle', '💧': 'droplet', '🥤': 'cup-with-straw',
    '⚡': 'high-voltage', '🍟': 'french-fries', '🍫': 'chocolate-bar', '🥐': 'croissant', '💵': 'dollar-banknote', '📱': 'mobile-phone',
    '🔷': 'large-blue-diamond', '↩': 'right-arrow-curving-left', '💸': 'money-with-wings', '🏦': 'coin', '⚖': 'balance-scale', '📅': 'calendar',
    '⏰': 'alarm-clock', '🔒': 'locked', '🔍': 'magnifying-glass-tilted-left', '💎': 'gem-stone', '⚠': 'warning', '🚚': 'delivery-truck',
    '🗑': 'wastebasket', '🌙': 'crescent-moon', '🥇': '1st-place-medal', '🥈': '2nd-place-medal', '🥉': '3rd-place-medal', '👥': 'busts-in-silhouette',
    '🔁': 'repeat-button', '👑': 'crown', '🧑‍💼': 'briefcase', '🎯': 'bullseye', '🟢': 'green-circle', '⚪': 'white-circle', '✅': 'check-mark-button',
    '🍋': 'lemon', '🍩': 'doughnut', '🧁': 'cupcake', '🍰': 'shortcake', '🥪': 'sandwich', '🍪': 'cookie', '🍬': 'candy', '🥜': 'peanuts', '🍦': 'soft-ice-cream',
    '🧋': 'bubble-tea', '🥛': 'glass-of-milk', '🧃': 'beverage-box', '🔥': 'fire', '🔋': 'battery', '🥔': 'potato', '🧀': 'cheese-wedge', '🌮': 'taco',
    '🥥': 'coconut', '🍊': 'tangerine', '🧊': 'ice', '✨': 'sparkles', '🥧': 'pie', '🍭': 'lollipop',
  };
  const emoRe = new RegExp('(' + Object.keys(EMOJI).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')️?', 'gu');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'SELECT', 'INPUT', 'TITLE']);
  function emojify(root) {
    if (!root || (root.nodeType !== 3 && !root.querySelectorAll)) return;
    const nodes = [];
    if (root.nodeType === 3) nodes.push(root);
    else { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) nodes.push(n); }
    nodes.forEach(n => {
      const t = n.nodeValue; emoRe.lastIndex = 0; if (!emoRe.test(t)) return;
      const par = n.parentNode; if (!par || SKIP.has(par.nodeName) || par.closest?.('svg, select')) return;
      emoRe.lastIndex = 0;
      const span = document.createElement('span');
      span.innerHTML = t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(emoRe, (m, k) => `<span class="emo-i">${emo(EMOJI[k])}</span>`);
      par.replaceChild(document.createRange().createContextualFragment(span.innerHTML), n);
    });
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 || n.nodeType === 3) emojify(n); }))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => emojify(document.body));

  function toast(msg, type = '') {
    const el = document.createElement('div'); el.className = 'toast ' + type; el.innerHTML = msg;
    $('#toasts').appendChild(el); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 2400);
  }

  let modalStack = 0;
  function modal(html, { wide = false, onClose } = {}) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
    document.body.appendChild(bg); modalStack++;
    if (window.gsap && !noAnim()) { gsap.fromTo(bg.firstChild, { y: 24, scale: .97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .35, ease: 'back.out(1.6)' }); bg.querySelectorAll('[data-count]').forEach(countUp); }
    const close = () => { if (!bg.isConnected) return; bg.remove(); modalStack--; onClose && onClose(); };
    bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
    bg.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    bg.close = close;
    const first = bg.querySelector('[autofocus]'); if (first) setTimeout(() => { first.focus(); first.select && first.select(); }, 40);
    return bg;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const all = $$('.modal-bg'); const top = all[all.length - 1]; if (top) top.close(); } });

  function confirmBox(text, { ok = 'Подтвердить', danger = false } = {}) {
    return new Promise(res => {
      let done = false;
      const m = modal(`<div class="modal-body" style="padding-top:24px"><div style="font-size:16px;font-weight:700;line-height:1.45">${text}</div></div>
        <div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn ${danger ? 'btn-red' : 'btn-primary'}" data-ok>${ok}</button></div>`, { onClose: () => { if (!done) res(false); } });
      m.querySelector('[data-ok]').onclick = () => { done = true; m.close(); res(true); };
    });
  }

  const head = (title, sub = '') => `<div class="modal-head"><div><h3>${title}</h3>${sub ? `<div class="modal-sub">${sub}</div>` : ''}</div><button class="icon-btn" data-close>${icon('x')}</button></div>`;

  /* ---------- charts ---------- */
  function tipFor(el) {
    let t = $('.tip', el); if (!t) { t = document.createElement('div'); t.className = 'tip'; el.appendChild(t); } return t;
  }
  function bars(el, data, { color = 'var(--accent)', fmt = H.money, hl = 'last', every = 1, compare } = {}) {
    const W = el.clientWidth || 600, Ht = el.clientHeight || 240, pb = 24, pt = 8, ih = Ht - pb - pt;
    const max = Math.max(1, ...data.map(d => Math.max(d.v, d.c || 0))) * 1.1;
    const bw = W / data.length, gap = Math.max(2, Math.min(12, bw * .3)), w = bw - gap, r = Math.min(6, w / 2);
    let s = [0.25, .5, .75, 1].map(f => `<line x1="0" x2="${W}" y1="${pt + ih * (1 - f)}" y2="${pt + ih * (1 - f)}" class="gridline"/>`).join('');
    data.forEach((d, i) => {
      const x = i * bw + gap / 2, h = Math.max(2, d.v / max * ih), y = pt + ih - h;
      const on = hl === 'last' ? i === data.length - 1 : hl === 'max' ? d.v === Math.max(...data.map(q => q.v)) : true;
      if (compare && d.c != null) { const ch = Math.max(2, d.c / max * ih); s += `<rect x="${x}" y="${pt + ih - ch}" width="${w}" height="${ch}" rx="${r}" fill="none" stroke="var(--line-2)" stroke-dasharray="3 3"/>`; }
      s += `<rect class="bar" data-i="${i}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${on ? color : `color-mix(in srgb, ${color} 40%, transparent)`}"/>`;
      if (i % every === 0 || i === data.length - 1) s += `<text x="${x + w / 2}" y="${Ht - 6}" text-anchor="middle" class="axis">${d.l}</text>`;
    });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}">${s}</svg>`;
    const tip = tipFor(el);
    el.onmousemove = e => {
      const b = e.target.closest('.bar'); if (!b) { tip.style.opacity = 0; return; }
      const d = data[b.dataset.i], r0 = el.getBoundingClientRect(), br = b.getBoundingClientRect();
      tip.innerHTML = `<div class="tip-l">${d.full || d.l}</div><b>${fmt(d.v)}</b>${compare && d.c != null ? `<div class="tip-l">пред.: ${fmt(d.c)}</div>` : ''}`;
      tip.style.left = (br.left - r0.left + br.width / 2) + 'px'; tip.style.top = (br.top - r0.top) + 'px'; tip.style.opacity = 1;
    };
    el.onmouseleave = () => tip.style.opacity = 0;
  }

  function area(el, data, { color = 'var(--accent)', fmt = H.money, every = 1, compare = false } = {}) {
    const W = el.clientWidth || 600, Ht = el.clientHeight || 240, pb = 24, pt = 12, ih = Ht - pb - pt;
    const max = Math.max(1, ...data.map(d => Math.max(d.v, d.c || 0))) * 1.12;
    const step = data.length > 1 ? W / (data.length - 1) : W;
    const pts = (k) => data.map((d, i) => [i * step, pt + ih - (d[k] || 0) / max * ih]);
    const path = (p) => p.map((q, i) => {
      if (!i) return `M${q[0]},${q[1]}`;
      const pr = p[i - 1], cx = (pr[0] + q[0]) / 2; return `C${cx},${pr[1]} ${cx},${q[1]} ${q[0]},${q[1]}`;
    }).join('');
    const p1 = pts('v'), gid = 'g' + Math.random().toString(36).slice(2, 7);
    let s = `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
    s += [0.25, .5, .75, 1].map(f => `<line x1="0" x2="${W}" y1="${pt + ih * (1 - f)}" y2="${pt + ih * (1 - f)}" class="gridline"/>`).join('');
    if (compare) s += `<path d="${path(pts('c'))}" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<path d="${path(p1)}L${W},${pt + ih}L0,${pt + ih}Z" fill="url(#${gid})"/><path d="${path(p1)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`;
    data.forEach((d, i) => { if (i % every === 0 || i === data.length - 1) s += `<text x="${Math.min(W - 10, Math.max(10, i * step))}" y="${Ht - 6}" text-anchor="middle" class="axis">${d.l}</text>`; });
    s += `<line class="hover-line" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--line-2)" opacity="0"/><circle class="hover-dot" r="5" fill="${color}" stroke="var(--panel)" stroke-width="2" opacity="0"/>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}">${s}</svg>`;
    const tip = tipFor(el), line = $('.hover-line', el), dot = $('.hover-dot', el);
    el.onmousemove = e => {
      const r0 = el.getBoundingClientRect(), x = e.clientX - r0.left;
      const i = Math.max(0, Math.min(data.length - 1, Math.round(x / step))), d = data[i], [px, py] = p1[i];
      line.setAttribute('x1', px); line.setAttribute('x2', px); line.setAttribute('opacity', 1);
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('opacity', 1);
      tip.innerHTML = `<div class="tip-l">${d.full || d.l}</div><b>${fmt(d.v)}</b>${compare ? `<div class="tip-l">пред. период: ${fmt(d.c || 0)}</div>` : ''}`;
      tip.style.left = Math.min(r0.width - 70, Math.max(70, px)) + 'px'; tip.style.top = py + 'px'; tip.style.opacity = 1;
    };
    el.onmouseleave = () => { tip.style.opacity = 0; line.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); };
  }

  function donut(data, label = 'выручка') {
    const total = H.sum(data, d => d.v) || 1, R = 60, C = 2 * Math.PI * R;
    let off = 0;
    const arcs = data.map(d => { const len = d.v / total * C; const s = `<circle r="${R}" cx="75" cy="75" fill="none" stroke="${d.color}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)"/>`; off += len; return s; }).join('');
    return `<svg class="donut" viewBox="0 0 150 150"><circle r="${R}" cx="75" cy="75" fill="none" stroke="var(--bg-2)" stroke-width="18"/>${arcs}<text x="75" y="73" text-anchor="middle" class="donut-v">${H.short(total)}</text><text x="75" y="91" text-anchor="middle" class="donut-l">${label}</text></svg>`;
  }

  function heatmap(el, matrix, { rows, cols, fmt = v => v }) {
    const max = Math.max(1, ...matrix.flat());
    el.innerHTML = `<div class="heat" style="grid-template-columns: 28px repeat(${cols.length}, 1fr)">
      <div></div>${cols.map((c, i) => `<div class="heat-h">${i % 2 === 0 ? c : ''}</div>`).join('')}
      ${rows.map((r, ri) => `<div class="heat-r">${r}</div>${cols.map((c, ci) => { const v = matrix[ri][ci]; return `<div class="heat-c" title="${r}, ${c}:00 — ${fmt(v)}" style="background:color-mix(in srgb, var(--accent) ${v ? Math.round(12 + v / max * 88) : 0}%, var(--bg-2))"></div>`; }).join('')}`).join('')}
    </div>`;
  }

  function avatar(st, size = 32) {
    return `<span class="avatar" style="width:${size}px;height:${size}px;background:${H.tint(st.color, 22)};color:${st.color};font-size:${Math.round(size * .38)}px">${H.esc(H.initials(st.name))}</span>`;
  }

  function download(text, name, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function csv(rows, name) {
    download('﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n'), name, 'text/csv');
  }

  // сжимаем картинку до 480px jpeg (для загрузки своих фото товаров)
  function fileToImage(file, max = 480) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .82));
        };
        img.onerror = rej; img.src = r.result;
      };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }

  /* ---------- анимации (GSAP) ---------- */
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noAnim = () => reduceMq || document.hidden;
  function countUp(el) {
    const target = +el.dataset.count; if (!window.gsap || isNaN(target) || noAnim()) return;
    const txt = el.textContent, m = txt.match(/^(\D*?)(\d(?:[\d\s  ]*\d)?)(.*)$/); if (!m) return;
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.1, ease: 'power3.out', onUpdate: () => { el.textContent = m[1] + H.nf(o.v) + m[3]; } });
  }
  function animateIn(root) {
    if (!window.gsap || noAnim()) return;
    const blocks = root.querySelectorAll(':scope > *, :scope > * > .card, .kpis > .card, .grid > .card');
    gsap.fromTo(blocks, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .04, ease: 'power3.out', clearProps: 'transform,opacity' });
    const tiles = root.querySelectorAll('.product, .pcard, .ccard, .scard, .day-row, .list-row');
    if (tiles.length) gsap.fromTo([...tiles].slice(0, 40), { y: 10, opacity: 0, scale: .98 }, { y: 0, opacity: 1, scale: 1, duration: .4, stagger: .018, ease: 'power2.out', delay: .1, clearProps: 'transform,opacity' });
    root.querySelectorAll('[data-count]').forEach(countUp);
    root.querySelectorAll('.progress > i, .pbar > i, .level > i').forEach(i => { const w = i.style.width; gsap.fromTo(i, { width: 0 }, { width: w, duration: .9, ease: 'power3.out', delay: .2 }); });
  }
  function celebrate() {
    if (!window.confetti || noAnim()) return;
    const colors = ['#e8a35c', '#f3c78f', '#5fd39a', '#ffffff'];
    confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: { y: .65 }, colors, zIndex: 300, scalar: .9 });
  }

  Object.assign(App, { emo, emojify, EMOJI, animateIn, countUp, celebrate, $, $$, icon, toast, modal, confirmBox, head, bars, area, donut, heatmap, avatar, download, csv, fileToImage });
})();
