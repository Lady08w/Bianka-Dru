/* ==========================================================================
   CATÁLOGO DIGITAL — lógica
   Google Sheets  →  datos  →  este archivo  →  página
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURACIÓN — lo único que se toca en el código, y solo una vez.
   -------------------------------------------------------------------------- */
const CONFIG = {
  // ID o enlace completo del Google Sheets (el archivo debe estar compartido
  // como "Cualquier persona con el enlace · Lector").
  SHEET_ID: '',

  // Número de WhatsApp: código de país + número, solo dígitos (57 = Colombia).
  // ESTE ES EL ÚNICO LUGAR DONDE SE DEFINE.
  WHATSAPP: '573000000000',

  MENSAJE_GENERAL: 'Hola, quiero más información sobre el catálogo.',
  // {producto} se reemplaza por el nombre del producto.
  MENSAJE_PRODUCTO: 'Hola, estoy interesado en: {producto}. ¿Me pueden dar más información?',

  // Nombres de las pestañas del Google Sheets.
  HOJAS: { productos: 'Productos', categorias: 'Categorias', banner: 'Banner' },

  TEXTO_TODOS: 'Todos',
};

/* -------------------------------------------------------------------------- */

const $ = (s) => document.querySelector(s);
const state = { products: [], categories: [], cat: null, query: '' };

const WA_PATH = 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.700.7 2.3.7 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z';

/* ---------- Utilidades ---------- */

// Quita tildes, mayúsculas y espacios extra: "Categoría " → "categoria"
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).replace(/[^a-z0-9]/g, '');
const list = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const isTrue = (s) => ['true', 'verdadero', 'si', 'yes', '1', 'x'].includes(norm(s));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c) node.append(c);
  return node;
}

function svg(pathD, cls, stroke) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', pathD);
  if (stroke) { p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); }
  s.append(p);
  return s;
}

function waLink(product) {
  const msg = product ? CONFIG.MENSAJE_PRODUCTO.replace('{producto}', product) : CONFIG.MENSAJE_GENERAL;
  return `https://wa.me/${String(CONFIG.WHATSAPP).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
}

function waButton(product, extraClass = '') {
  return el('a', { class: `btn ${extraClass}`, href: waLink(product), target: '_blank', rel: 'noopener', 'aria-label': `Pedir información de ${product} por WhatsApp` },
    svg(WA_PATH, 'wa'), el('span', { text: 'WhatsApp' }));
}

// Solo deja pasar enlaces seguros (evita "javascript:" en la hoja Banner)
const safeUrl = (u) => (/^(https?:\/\/|#|\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : null);

/* ---------- Imágenes de Google Drive ---------- */

// Acepta el enlace "Copiar vínculo" de Drive, un ID suelto o cualquier URL directa de imagen.
function driveId(raw) {
  const u = String(raw).trim();
  if (/^[\w-]{25,}$/.test(u)) return u;
  if (!/(drive|docs)\.google\.com|googleusercontent\.com/.test(u)) return null;
  const m = u.match(/\/d\/([\w-]{20,})/) || u.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : null;
}

function imageSources(raw, width) {
  const id = driveId(raw);
  if (!id) return [String(raw).trim()];
  return [
    `https://lh3.googleusercontent.com/d/${id}=w${width}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
  ];
}

// Crea un <img> con lazy loading y respaldo; si nada carga, se elimina y avisa.
function makeImg(raw, alt, width, onFail, eager) {
  const sources = imageSources(raw, width);
  let i = 0;
  const img = el('img', { alt, loading: eager ? 'eager' : 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('load', () => img.classList.add('is-loaded'));
  img.addEventListener('error', () => {
    i += 1;
    if (i < sources.length) img.src = sources[i];
    else { img.remove(); if (onFail) onFail(); }
  });
  img.src = sources[0];
  return img;
}

/* ---------- Lectura de Google Sheets ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function sheetId() {
  const raw = String(CONFIG.SHEET_ID).trim();
  const m = raw.match(/\/d\/([\w-]+)/);
  return m ? m[1] : raw;
}

// Devuelve { headers: [...], rows: [{columna: valor}] } con los encabezados normalizados.
async function fetchSheet(name) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId()}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('La hoja no es pública');
  const [head = [], ...body] = parseCSV(text);
  const headers = head.map(key);
  const rows = body.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}

async function loadData() {
  const H = CONFIG.HOJAS;
  const [prod, cats, banner] = await Promise.allSettled([fetchSheet(H.productos), fetchSheet(H.categorias), fetchSheet(H.banner)]);

  if (prod.status !== 'fulfilled') throw prod.reason;
  if (!prod.value.headers.includes('nombre')) throw new Error(`No se encontró la hoja "${H.productos}" con la columna "Nombre"`);

  let products = prod.value.rows.filter((r) => r.nombre).map((r) => ({
    nombre: r.nombre,
    categoria: r.categoria || '',
    material: r.material || '',
    tallas: list(r.tallas),
    colores: list(r.colores),
    fotos: [r.foto1, r.foto2, r.foto3, r.foto4].filter(Boolean),
  }));
  products.forEach((p) => { p.search = norm([p.nombre, p.material, p.categoria, p.colores.join(' ')].join(' ')); });

  // Categorías: si pides una pestaña que no existe, Google devuelve la primera,
  // por eso se comprueba que tenga las columnas "Activa"/"Orden".
  let categories;
  const c = cats.status === 'fulfilled' ? cats.value : null;
  if (c && c.headers.includes('categoria') && (c.headers.includes('activa') || c.headers.includes('orden'))) {
    categories = c.rows
      .filter((r) => r.categoria && isTrue(r.activa))
      .map((r, i) => ({ nombre: r.categoria, orden: parseFloat(String(r.orden).replace(',', '.')), i }))
      .sort((a, b) => (isNaN(a.orden) ? Infinity : a.orden) - (isNaN(b.orden) ? Infinity : b.orden) || a.i - b.i)
      .map((r) => r.nombre);
    // Los productos de categorías ocultas o eliminadas no se muestran.
    const active = new Set(categories.map(norm));
    products = products.filter((p) => !p.categoria || active.has(norm(p.categoria)));
  } else {
    console.warn(`No se pudo leer la hoja "${H.categorias}"; se usan las categorías de los productos.`);
    categories = [...new Map(products.filter((p) => p.categoria).map((p) => [norm(p.categoria), p.categoria])).values()];
  }

  let bannerData = null;
  const b = banner.status === 'fulfilled' ? banner.value : null;
  if (b && b.headers.includes('campo') && b.headers.includes('valor')) {
    bannerData = Object.fromEntries(b.rows.filter((r) => r.campo).map((r) => [key(r.campo), r.valor]));
  }

  return { products, categories, banner: bannerData };
}

/* ---------- Banner ---------- */

function renderBanner(b) {
  const box = $('#banner');
  box.replaceChildren();
  if (!b) { box.hidden = true; return; }
  const photos = [b.foto1, b.foto2, b.foto3].filter(Boolean);
  if (!b.imagenprincipal && !b.titulo && !b.subtitulo && !photos.length) { box.hidden = true; return; }

  const main = el('div', { class: 'banner-main' });
  if (b.imagenprincipal) {
    box.classList.add('has-img');
    main.append(makeImg(b.imagenprincipal, '', 2000, () => box.classList.remove('has-img'), true));
  } else box.classList.remove('has-img');

  const text = el('div', { class: 'banner-text' });
  if (b.titulo) text.append(el('h2', { class: 'banner-title', text: b.titulo }));
  if (b.subtitulo) text.append(el('p', { class: 'banner-sub', text: b.subtitulo }));
  if (b.botontexto) {
    const href = safeUrl(b.botonurl || '') || '#catalogo';
    const ext = /^https?:/i.test(href);
    text.append(el('a', { class: `btn ${b.imagenprincipal ? 'btn-light' : ''}`, href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, text: b.botontexto }));
  }
  if (text.children.length) main.append(text);
  box.append(main);

  if (photos.length) {
    const wrap = el('div', { class: 'banner-photos' });
    photos.forEach((src) => {
      const sq = el('div', { class: 'sq' });
      sq.append(makeImg(src, '', 600, () => { sq.remove(); if (!wrap.children.length) wrap.remove(); }));
      wrap.append(sq);
    });
    box.append(wrap);
  }
  box.hidden = false;
}

/* ---------- Categorías ---------- */

function renderCategories() {
  const box = $('#cats');
  const make = (label, value) => el('button', {
    class: 'cat', type: 'button', text: label, 'aria-pressed': String(state.cat === value),
    onclick: (e) => {
      state.cat = value;
      box.querySelectorAll('.cat').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      renderGrid();
      const top = $('#catalogo').getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) $('#catalogo').scrollIntoView();
    },
  });
  box.replaceChildren(make(CONFIG.TEXTO_TODOS, null), ...state.categories.map((c) => make(c, norm(c))));
}

/* ---------- Tarjetas ---------- */

function spec(label, values) {
  return values.length ? el('div', {}, el('dt', { text: label }), el('dd', { text: values.join(' · ') })) : null;
}

function card(p) {
  const media = el('button', { class: 'media', type: 'button', 'aria-label': `Ver detalle de ${p.nombre}`, onclick: () => openProduct(p) });
  if (p.fotos[0]) media.append(makeImg(p.fotos[0], p.nombre, 800, () => media.classList.add('is-empty')));
  else media.classList.add('is-empty');

  // Foto 2 al pasar el mouse: se descarga solo la primera vez que se necesita.
  if (p.fotos[1] && matchMedia('(hover: hover)').matches) {
    media.addEventListener('pointerenter', () => {
      const alt = makeImg(p.fotos[1], '', 800, null, true);
      alt.classList.add('alt');
      media.append(alt);
    }, { once: true });
  }

  const specs = el('dl', { class: 'specs' }, spec('Tallas', p.tallas), spec('Colores', p.colores));
  return el('article', { class: 'card' }, media,
    el('div', { class: 'card-body' },
      el('h3', {}, el('button', { class: 'card-name', type: 'button', text: p.nombre, onclick: () => openProduct(p) })),
      p.material ? el('p', { class: 'card-material', text: p.material }) : null,
      specs.children.length ? specs : el('div', { class: 'specs' }),
      waButton(p.nombre)));
}

function renderGrid() {
  const tokens = norm(state.query).split(' ').filter(Boolean);
  const items = state.products.filter((p) =>
    (!state.cat || norm(p.categoria) === state.cat) && tokens.every((t) => p.search.includes(t)));

  const title = state.cat ? state.categories.find((c) => norm(c) === state.cat) : CONFIG.TEXTO_TODOS;
  $('#catalogTitle').textContent = state.query.trim() ? `Resultados: “${state.query.trim()}”` : title;
  $('#count').textContent = `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`;
  $('#grid').replaceChildren(...items.map(card));

  if (!items.length) {
    showState(state.products.length ? 'Sin resultados' : 'Aún no hay productos',
      state.products.length ? 'Prueba con otra búsqueda o categoría.' : 'Muy pronto encontrarás aquí el catálogo.');
  } else $('#state').hidden = true;
}

function showState(title, text, retry) {
  const box = $('#state');
  box.replaceChildren(el('strong', { text: title }), el('span', { text }));
  if (retry) box.append(el('div', {}, el('button', { class: 'btn', type: 'button', text: 'Reintentar', onclick: init })));
  box.hidden = false;
}

function showSkeleton() {
  $('#state').hidden = true;
  $('#grid').replaceChildren(...Array.from({ length: 8 }, () =>
    el('div', { class: 'card skeleton', 'aria-hidden': 'true' }, el('div', { class: 'media' }), el('div', { class: 'line' }), el('div', { class: 'line short' }))));
}

/* ---------- Detalle del producto ---------- */

function openProduct(p) {
  const modal = $('#modal');
  const mainBox = el('div', { class: 'g-main' });
  const thumbs = el('div', { class: 'thumbs' });
  let photos = p.fotos.map((src) => ({ src }));
  let current = 0;

  const nav = [
    el('button', { class: 'icon-btn g-nav prev', type: 'button', 'aria-label': 'Foto anterior', onclick: () => show(current - 1) }, svg('M15 5l-7 7 7 7', null, true)),
    el('button', { class: 'icon-btn g-nav next', type: 'button', 'aria-label': 'Foto siguiente', onclick: () => show(current + 1) }, svg('M9 5l7 7-7 7', null, true)),
  ];

  function drop(photo) {            // una foto que no carga desaparece de la galería
    photo.thumb?.remove();
    photos = photos.filter((x) => x !== photo);
    show(0);
  }

  function show(i) {
    mainBox.querySelectorAll('img').forEach((n) => n.remove());
    const multi = photos.length > 1;
    nav.forEach((b) => { b.hidden = !multi; });
    thumbs.hidden = !multi;
    if (!photos.length) { mainBox.classList.add('is-empty'); return; }
    current = (i + photos.length) % photos.length;
    const photo = photos[current];
    mainBox.append(makeImg(photo.src, p.nombre, 1600, () => drop(photo), true));
    photos.forEach((x, n) => x.thumb?.setAttribute('aria-current', String(n === current)));
  }

  if (photos.length > 1) {
    photos.forEach((photo, n) => {
      photo.thumb = el('button', { class: 'thumb', type: 'button', 'aria-label': `Foto ${n + 1}`, onclick: () => show(photos.indexOf(photo)) });
      photo.thumb.append(makeImg(photo.src, '', 300, () => drop(photo), true));
      thumbs.append(photo.thumb);
    });
  }
  mainBox.append(...nav);
  show(0);

  const chips = (label, values) => values.length
    ? el('div', {}, el('dt', { text: label }), el('dd', { class: 'chips' }, values.map((v) => el('span', { class: 'chip', text: v })))) : null;
  const specs = el('dl', { class: 'info-specs' },
    p.material ? el('div', {}, el('dt', { text: 'Material' }), el('dd', { text: p.material })) : null,
    chips('Tallas', p.tallas), chips('Colores', p.colores));

  modal.replaceChildren(
    el('button', { class: 'icon-btn modal-close', type: 'button', 'aria-label': 'Cerrar', onclick: () => modal.close() }, svg('M6 6l12 12M18 6L6 18', null, true)),
    el('div', { class: 'modal-in' },
      el('div', { class: 'gallery' }, mainBox, thumbs),
      el('div', { class: 'info' },
        p.categoria ? el('p', { class: 'info-cat', text: p.categoria }) : null,
        el('h2', { id: 'modalTitle', text: p.nombre }),
        specs.children.length ? specs : null,
        waButton(p.nombre))));

  modal.onkeydown = (e) => {
    if (photos.length < 2) return;
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  };
  document.documentElement.classList.add('lock');
  modal.showModal();
  modal.scrollTop = 0;
}

/* ---------- Inicio ---------- */

function setupOnce() {
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(); });

  const modal = $('#modal');
  modal.addEventListener('close', () => document.documentElement.classList.remove('lock'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  let timer;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.query = e.target.value; renderGrid(); }, 120);
  });
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); $('#search').blur(); $('#catalogo').scrollIntoView(); });
  $('#searchToggle').addEventListener('click', (e) => {
    const open = $('#header').classList.toggle('search-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
    if (open) $('#search').focus();
  });
}

async function init() {
  showSkeleton();
  if (!sheetId()) {
    $('#grid').replaceChildren();
    showState('Falta conectar Google Sheets', 'Pega el ID del archivo en CONFIG.SHEET_ID, al inicio de script.js.');
    return;
  }
  try {
    const data = await loadData();
    state.products = data.products;
    state.categories = data.categories;
    if (state.cat && !data.categories.some((c) => norm(c) === state.cat)) state.cat = null;
    renderBanner(data.banner);
    renderCategories();
    renderGrid();
  } catch (err) {
    console.error('Catálogo:', err);
    $('#grid').replaceChildren();
    $('#count').textContent = '';
    showState('No pudimos cargar el catálogo', 'Revisa tu conexión e inténtalo de nuevo. También puedes escribirnos por WhatsApp.', true);
  }
}

setupOnce();
init();
