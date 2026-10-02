/* SpeedWash cases map · v1.0.0 · Vanilla JS, isolated styles, no API keys. */
(() => {
  'use strict';
  const script = document.currentScript;
  const base = new URL('.', script ? script.src : location.href);
  const NS = 'http://www.w3.org/2000/svg';
  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" aria-hidden="true"><path d="M4 9V4m0 5h5M4 9a8 8 0 1 1 0 6"/></svg>',
    pointer: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.4" aria-hidden="true"><path d="m7 3 12 9-6 1-3 6z"/><path d="m14 15 4 5"/></svg>'
  };
  const element = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const svgElement = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };
  const normalize = value => String(value || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
  const plain = value => {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const parseArray = value => {
    try { const data = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(data) ? data : []; }
    catch { return []; }
  };
  const safeURL = (value, origin = 'https://speedwash.ru') => {
    if (!value || !String(value).trim()) return '';
    try { const url = new URL(value, origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  const caseWord = count => {
    const a = count % 100, b = count % 10;
    return a >= 11 && a <= 14 ? 'кейсов' : b === 1 ? 'кейс' : b >= 2 && b <= 4 ? 'кейса' : 'кейсов';
  };
  async function getJSON(url, timeout = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {signal: controller.signal, credentials: 'omit'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function adaptProduct(product) {
    const opts = Object.fromEntries(parseArray(product.json_options).map(option => [option.title, option.values?.[0] || '']));
    const edition = parseArray(product.editions)[0] || {};
    const chars = Object.fromEntries(parseArray(product.characteristics).map(ch => [ch.title || ch.name, ch.value]));
    return {
      id: String(product.uid), title: plain(product.title),
      city: plain(opts['Город'] || edition['Город']), country: plain(opts['Страна'] || edition['Страна']),
      model: plain(opts['Модель робот-мойки'] || edition['Модель робот-мойки']),
      region: plain(opts['Регион'] || edition['Регион'] || chars['Регион']),
      address: plain(product.descr),
      url: safeURL(product.buttonlink || product.url),
      image: safeURL(parseArray(product.gallery)[0]?.img || '')
    };
  }
  async function loadCatalog(root) {
    const products = [], seen = new Set();
    const storepart = root.dataset.storepart || '676741207832';
    const recid = root.dataset.recid || '815255442';
    for (let slice = 1; slice <= 100; slice++) {
      const url = new URL('https://store.tildaapi.com/api/getproductslist/');
      url.search = new URLSearchParams({storepartuid: storepart, recid, size: '100', slice: String(slice), sort: 'sort-created-desc', flag_root: 'withroot'});
      const data = await getJSON(url);
      if (!Array.isArray(data.products)) throw new Error('Unknown catalog format');
      const fresh = data.products.filter(product => !seen.has(String(product.uid)));
      fresh.forEach(product => seen.add(String(product.uid)));
      products.push(...fresh);
      if (products.length >= Number(data.total || Infinity) || !data.products.length) return products.map(adaptProduct);
      if (!fresh.length) throw new Error('Catalog pagination did not advance');
    }
    throw new Error('Catalog pagination limit exceeded');
  }
  async function mount(root) {
    if (root.dataset.swMounted) return;
    root.dataset.swMounted = 'true';
    const shadow = root.attachShadow({mode: 'open'});
    const css = element('link'); css.rel = 'stylesheet'; css.href = new URL('speedwash-map.css', base).href;
    shadow.append(css);
    const loading = element('div', 'sw-loading');
    loading.innerHTML = '<i aria-hidden="true"></i>Загружаем географию проектов…';
    loading.setAttribute('role', 'status'); shadow.append(loading);
    try {
      const [map, result] = await Promise.all([
        getJSON(new URL('assets/map.json', base)),
        loadCatalog(root).then(cases => ({cases, live: true})).catch(async () => ({...await getJSON(new URL('assets/cases.json', base)), live: false}))
      ]);
      loading.remove();
      render(root, shadow, map, result);
    } catch (error) {
      loading.className = 'sw-error';
      loading.innerHTML = 'Не удалось загрузить карту. <a href="https://speedwash.ru/cases" target="_blank" rel="noopener noreferrer">Посмотреть все кейсы ↗</a>';
      console.warn('SpeedWash map could not load:', error.message);
    }
  }
  function render(root, shadow, map, result) {
    const groups = new Map(map.groups.map(group => [group.id, group]));
    const cityMap = new Map(Object.entries(map.cityRegions).map(([city, id]) => [normalize(city), id]));
    const nameMap = new Map(map.groups.map(group => [normalize(group.name), group.id]));
    const regionAliases = {'Республика Башкортостан': 'RU-BA', 'Удмуртская Республика': 'RU-UD', 'Республика Хакасия': 'RU-KK', 'Ханты-Мансийский автономный округ — Югра': 'RU-KHM', 'ХМАО': 'RU-KHM'};
    Object.entries(regionAliases).forEach(([name, id]) => nameMap.set(normalize(name), id));
    const cases = result.cases.map(project => {
      const region = project.region;
      const regionId = (groups.has(region) ? region : nameMap.get(normalize(region))) || map.overrides[project.id] || cityMap.get(normalize(project.city));
      // New cities remain visible in the list until their region is supplied.
      return {...project, url: safeURL(project.url), image: project.image ? safeURL(project.image) : '', regionId: regionId || 'unmapped', address: plain(project.address)};
    }).filter(project => project.url);
    const state = {country: '', region: '', search: '', model: '', zoom: 1, center: [500, 280]};
    const countries = ['Россия', 'Беларусь', 'Казахстан'];
    const wrap = element('section', 'sw');
    wrap.setAttribute('aria-label', 'Карта реализованных проектов SpeedWash');
    wrap.innerHTML = `
      <div class="sw-kicker"><i aria-hidden="true"></i>ГЕОГРАФИЯ SPEEDWASH</div>
      <div class="sw-heading"><div><h2>Наши проекты.<br><span>Ваш регион.</span></h2><p>Посмотрите, как работают робот-мойки SpeedWash<br>в России, Беларуси и Казахстане.</p></div><div class="sw-stats" aria-label="География кейсов"></div></div>
      <div class="sw-toolbar"><div class="sw-tabs" role="group" aria-label="Выбор страны"></div><div class="sw-controls"><label class="sw-search">${icons.search}<input type="search" placeholder="Город или регион" aria-label="Найти город, регион или адрес"></label><select class="sw-model" aria-label="Модель робот-мойки"><option value="">Все модели</option></select></div></div>
      <div class="sw-stage"><div class="sw-map-area"><div class="sw-map-top"><div><div class="sw-map-eyebrow">РЕАЛИЗОВАННЫЕ ПРОЕКТЫ</div><div class="sw-map-caption"><span>●</span><b></b></div></div><div class="sw-map-tools"><button class="sw-map-tool" data-action="minus" aria-label="Уменьшить карту">−</button><button class="sw-map-tool" data-action="plus" aria-label="Увеличить карту">+</button><button class="sw-map-tool" data-action="home" aria-label="Вернуть общий вид карты">${icons.reset}</button></div></div><div class="sw-canvas"><div class="sw-tooltip" role="tooltip" hidden></div></div><div class="sw-map-bottom"><div class="sw-map-instruction">${icons.pointer}<span>Нажмите на регион или точку,<br>чтобы посмотреть его кейсы</span></div><div class="sw-map-legend"><i></i>есть проекты SpeedWash</div></div></div><aside class="sw-panel" aria-label="Кейсы выбранного региона"><div class="sw-panel-head"><div class="sw-panel-kicker">SPEEDWASH В ДЕЛЕ</div><h3 class="sw-panel-title"></h3><div class="sw-panel-count"><i></i><span></span></div><select class="sw-region-select" aria-label="Выбрать регион"><option value="">Все регионы</option></select></div><div class="sw-panel-list"></div><div class="sw-panel-footer"><span>Каждый проект — отдельная история</span><button class="sw-reset" hidden>Сбросить</button></div></aside></div>
      <div class="sw-footer"><div>На карте показаны группы кейсов по регионам. Адреса объектов — в карточках.</div><span class="sw-source"></span></div><div class="sw-sr" role="status" aria-live="polite" aria-atomic="true"></div>`;
    shadow.append(wrap);
    const $ = selector => wrap.querySelector(selector);
    const stats = [
      [cases.length, 'кейсов в каталоге'],
      [new Set(cases.filter(p => p.regionId !== 'unmapped').map(p => p.regionId)).size, 'регионов с кейсами'],
      [new Set(cases.map(p => p.country)).size, 'страны']
    ];
    stats.forEach(([count, label]) => {const stat = element('div', 'sw-stat');stat.append(element('strong', '', count), element('span', '', label));$('.sw-stats').append(stat);});
    const tabs = new Map();
    ['', ...countries].forEach(country => {
      const button = element('button', 'sw-tab', country || 'Все'); button.type = 'button';
      button.append(element('span', '', country ? cases.filter(p => p.country === country).length : cases.length));
      button.addEventListener('click', () => {state.country = country; state.region = ''; fitCountry(); update();});
      $('.sw-tabs').append(button); tabs.set(country, button);
    });
    [...new Set(cases.map(p => p.model).filter(Boolean))].sort().forEach(model => {
      const option = element('option', '', model);option.value = model;$('.sw-model').append(option);
    });
    const source = $('.sw-source');
    if (result.live) {const link = element('a', '', 'Кейсы SpeedWash ↗');link.href = 'https://speedwash.ru/cases';link.target = '_blank';link.rel = 'noopener noreferrer';source.append(link);}
    else source.textContent = 'Данные каталога на ' + new Date(result.updated + 'T12:00:00').toLocaleDateString('ru', {day: 'numeric', month: 'long', year: 'numeric'});

    const svg = svgElement('svg', {viewBox: '0 0 1000 560', role: 'group', 'aria-label': 'Интерактивная карта регионов с кейсами SpeedWash'});
    const outlineLayer = svgElement('g', {'aria-hidden': 'true'}), regionLayer = svgElement('g'), lineLayer = svgElement('g', {'aria-hidden': 'true'}), pinLayer = svgElement('g');
    svg.append(outlineLayer, regionLayer, lineLayer, pinLayer);
    $('.sw-canvas').prepend(svg);
    map.outlines.forEach(outline => outlineLayer.append(svgElement('path', {d: outline.path, class: 'sw-outline'})));
    const paths = new Map(), pins = new Map();
    map.geometry.forEach(region => {
      const path = svgElement('path', {d: region.path, class: 'sw-region', 'data-region': region.id});
      regionLayer.append(path);paths.set(region.id, path);
      path.addEventListener('click', () => {
        if (dragged) return;
        if (region.id === 'BLR' || region.id === 'KAZ') {state.country = region.country;state.region = '';fitCountry();update();}
        else if (filtered().some(p => p.regionId === region.id)) selectRegion(region.id);
      });
      path.addEventListener('pointerenter', event => {
        const count = filtered().filter(p => p.regionId === region.id).length;
        if (count) showTooltip(event, region.name, count);
      });
      path.addEventListener('pointerleave', hideTooltip);
    });
    map.groups.forEach(group => {
      const pin = svgElement('g', {class: 'sw-pin', tabindex: '0', role: 'button', 'data-region': group.id, 'aria-pressed': 'false'});
      pin.append(svgElement('circle', {class: 'sw-pin-hit', r: 22, fill: 'transparent'}), svgElement('circle', {class: 'sw-pin-ring', r: 22}), svgElement('circle', {class: 'sw-pin-core', r: 14}));
      const count = svgElement('text', {y: '.3'});pin.append(count);
      const line = svgElement('line', {class: 'sw-pin-line'});lineLayer.append(line);
      pin.addEventListener('click', event => {event.stopPropagation();if (!dragged) selectRegion(group.id);});
      pin.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();selectRegion(group.id);}
      });
      pin.addEventListener('pointerenter', event => showTooltip(event, group.name, Number(count.textContent)));
      pin.addEventListener('pointerleave', hideTooltip);
      pinLayer.append(pin);pins.set(group.id, {pin, count, line, group});
    });
    function filtered() {
      const query = normalize(state.search);
      return cases.filter(p => (!state.country || p.country === state.country) && (!state.model || p.model === state.model) && (!query || normalize([p.city, p.address, p.title, groups.get(p.regionId)?.name, p.country].join(' ')).includes(query)));
    }
    function selectRegion(id) {state.region = state.region === id ? '' : id;hideTooltip();update();}
    function showTooltip(event, name, count) {
      if (!count) return;
      const box = $('.sw-canvas').getBoundingClientRect(), tooltip = $('.sw-tooltip');
      tooltip.replaceChildren(element('strong', '', name), element('span', '', count + ' ' + caseWord(count) + ' · нажмите, чтобы открыть'));
      tooltip.hidden = false;
      tooltip.style.left = Math.max(8, Math.min(event.clientX - box.left + 12, box.width - tooltip.offsetWidth - 8)) + 'px';
      tooltip.style.top = Math.max(8, Math.min(event.clientY - box.top - tooltip.offsetHeight - 8, box.height - tooltip.offsetHeight - 8)) + 'px';
    }
    function hideTooltip() {$('.sw-tooltip').hidden = true;}
    function update() {
      const available = filtered(), counts = new Map();
      available.forEach(p => counts.set(p.regionId, (counts.get(p.regionId) || 0) + 1));
      if (state.region && !counts.get(state.region)) state.region = '';
      const visible = state.region ? available.filter(p => p.regionId === state.region) : available;
      tabs.forEach((tab, country) => tab.setAttribute('aria-pressed', String(country === state.country)));
      $('.sw-map-caption b').textContent = available.length + ' ' + caseWord(available.length) + (state.country ? ' · ' + state.country : ' · 3 страны');
      $('.sw-panel-title').textContent = state.region ? groups.get(state.region)?.name || 'Другие города' : state.country || 'Все проекты';
      $('.sw-panel-count span').textContent = visible.length + ' ' + caseWord(visible.length) + (state.region ? ' в выбранном регионе' : ' в выбранной географии');
      const select = $('.sw-region-select');select.replaceChildren(new Option('Все регионы', ''));
      [...counts.keys()].filter(id => id !== 'unmapped').sort((a, b) => groups.get(a).name.localeCompare(groups.get(b).name, 'ru')).forEach(id => select.append(new Option(groups.get(id).name + ' · ' + counts.get(id), id)));
      if (counts.has('unmapped')) select.append(new Option('Другие города · ' + counts.get('unmapped'), 'unmapped'));
      select.value = state.region;
      paths.forEach((path, id) => {
        const country = id === 'BLR' ? 'Беларусь' : id === 'KAZ' ? 'Казахстан' : '';
        path.classList.toggle('has-cases', Boolean(counts.get(id) || country && available.some(p => p.country === country)));
        path.classList.toggle('is-active', id === state.region || Boolean(country && state.region && groups.get(state.region)?.country === country));
        path.classList.toggle('is-muted', Boolean(state.country && !id.startsWith('RU') && !['BLR', 'KAZ'].includes(id)));
      });
      pins.forEach(({pin, count, line, group}, id) => {
        const n = counts.get(id) || 0;
        pin.style.display = line.style.display = n ? '' : 'none';count.textContent = n;
        pin.setAttribute('aria-label', group.name + ', ' + n + ' ' + caseWord(n));
        pin.setAttribute('aria-pressed', String(id === state.region));pin.classList.toggle('is-active', id === state.region);
      });
      layoutPins(counts);
      const list = $('.sw-panel-list');list.replaceChildren();list.scrollTop = 0;
      if (!visible.length) {
        const empty = element('div', 'sw-empty');empty.append(element('strong', '', 'Кейсы не найдены'), element('span', '', 'Попробуйте другой город, регион или модель робот-мойки.'));list.append(empty);
      }
      visible.forEach((project, index) => {
        const card = element('a', 'sw-card');card.href = project.url;card.target = '_blank';card.rel = 'noopener noreferrer';
        card.setAttribute('aria-label', project.city + ', ' + project.model + '. Открыть кейс в новой вкладке');card.style.animationDelay = Math.min(index, 4) * 35 + 'ms';
        const media = element('div', 'sw-card-media');
        if (project.image) {
          const image = element('img');image.src = project.image;image.alt = 'Робот-мойка SpeedWash · ' + project.city;image.loading = 'lazy';image.decoding = 'async';media.append(image);
          image.addEventListener('error', () => image.remove(), {once: true});
        }
        media.append(element('span', 'sw-card-model', project.model || 'SpeedWash'), element('span', 'sw-card-arrow', '↗'));
        const address = project.address.replace(/^(объект\s+расположен\s*(по адресу\s*)?)/i, '').trim();
        card.append(media, element('h4', 'sw-card-title', project.city || project.title), element('p', 'sw-card-address', address), element('span', 'sw-card-link', 'Смотреть кейс ↗'));list.append(card);
      });
      $('.sw-reset').hidden = !state.region && !state.country && !state.model && !state.search;
      $('.sw-sr').textContent = $('.sw-panel-title').textContent + ': ' + visible.length + ' ' + caseWord(visible.length);
    }
    function layoutPins(counts) {
      const pixelScale = Math.max(.1, Math.min(svg.clientWidth / 1000, svg.clientHeight / 560)) * state.zoom;
      const radius = 11 / pixelScale, gap = 28 / pixelScale;
      const items = [...pins.values()].filter(p => counts.get(p.group.id)).map(item => ({...item, x: item.group.point[0], y: item.group.point[1]}));
      for (let iteration = 0; iteration < 70; iteration++) {
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
          const first = items[a], second = items[b];
          let dx = second.x - first.x, dy = second.y - first.y, distance = Math.hypot(dx, dy);
          if (distance < gap) {
            if (distance < .01) {dx = 1;dy = 1;distance = Math.SQRT2;}
            const push = (gap - distance) / 2;
            first.x -= dx / distance * push;first.y -= dy / distance * push;
            second.x += dx / distance * push;second.y += dy / distance * push;
          }
        }
      }
      items.forEach(({pin, count, line, group, x, y}) => {
        pin.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
        pin.querySelector('.sw-pin-core').setAttribute('r', radius);pin.querySelector('.sw-pin-ring').setAttribute('r', radius * 1.6);
        pin.querySelector('.sw-pin-hit').setAttribute('r', 18 / pixelScale);
        count.style.fontSize = 10 / pixelScale + 'px';
        [['x1', group.point[0]], ['y1', group.point[1]], ['x2', x], ['y2', y]].forEach(([key, value]) => line.setAttribute(key, value));
        line.style.opacity = Math.hypot(x - group.point[0], y - group.point[1]) > 6 / state.zoom ? '1' : '0';
      });
    }
    function viewport() {
      const width = 1000 / state.zoom, height = 560 / state.zoom;
      state.center[0] = Math.max(width / 2, Math.min(1000 - width / 2, state.center[0]));
      state.center[1] = Math.max(height / 2, Math.min(560 - height / 2, state.center[1]));
      svg.setAttribute('viewBox', `${state.center[0] - width / 2} ${state.center[1] - height / 2} ${width} ${height}`);
      svg.style.cursor = state.zoom > 1 ? 'grab' : '';
      $('.sw-map-tool[data-action=minus]').disabled = state.zoom <= 1;
      $('.sw-map-tool[data-action=plus]').disabled = state.zoom >= 5;
      layoutPins(new Map(filtered().map(p => [p.regionId, 1])));
    }
    function fitCountry() {
      const outline = map.outlines.find(item => item.country === state.country);
      if (!outline || state.country === 'Россия') {state.zoom = 1;state.center = [500, 280];}
      else {
        const [[x0, y0], [x1, y1]] = outline.bounds;
        state.zoom = Math.min(5, .72 * Math.min(1000 / (x1 - x0), 560 / (y1 - y0)));
        state.center = [(x0 + x1) / 2, (y0 + y1) / 2];
      }
      viewport();hideTooltip();
    }
    let dragged = false, drag = null;
    svg.addEventListener('pointerdown', event => {
      dragged = false;
      if (state.zoom <= 1 || event.pointerType === 'touch' || event.button !== 0) return;
      drag = {x: event.clientX, y: event.clientY, center: [...state.center]};
    });
    svg.addEventListener('pointermove', event => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) < 5 && !dragged) return;
      dragged = true;hideTooltip();
      const rect = svg.getBoundingClientRect(), scale = Math.min(rect.width / (1000 / state.zoom), rect.height / (560 / state.zoom));
      state.center = [drag.center[0] - dx / scale, drag.center[1] - dy / scale];viewport();svg.style.cursor = 'grabbing';
    });
    const release = () => {drag = null;};
    svg.addEventListener('pointerup', release);svg.addEventListener('pointerleave', release);svg.addEventListener('pointercancel', release);
    $('.sw-map-tools').addEventListener('click', event => {
      const button = event.target.closest('button');if (!button) return;
      if (button.dataset.action === 'home') {state.zoom = 1;state.center = [500, 280];}
      else state.zoom = Math.max(1, Math.min(5, state.zoom * (button.dataset.action === 'plus' ? 1.5 : 1 / 1.5)));
      viewport();hideTooltip();
    });
    $('.sw-region-select').addEventListener('change', event => {state.region = event.target.value;update();});
    let searchTimer;
    $('.sw-search input').addEventListener('input', event => {state.search = event.target.value;state.region = '';clearTimeout(searchTimer);searchTimer = setTimeout(update, 120);});
    $('.sw-model').addEventListener('change', event => {state.model = event.target.value;update();});
    $('.sw-reset').addEventListener('click', () => {Object.assign(state, {country: '', region: '', model: '', search: ''});$('.sw-search input').value = '';$('.sw-model').value = '';fitCountry();update();});
    const initial = root.dataset.region;
    if (initial && groups.has(initial)) state.region = initial;
    viewport();update();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => layoutPins(new Map(filtered().map(p => [p.regionId, 1]))));
      observer.observe(svg);
    }
  }
  function start() {document.querySelectorAll('[data-speedwash-map]').forEach(mount);}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
