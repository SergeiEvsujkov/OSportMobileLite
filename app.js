/**
 * OSportMobile Lite — участник: выбрал событие в облаке, скачал, отметился, отправил.
 *
 * Главный экран повторяет приложение: карточки событий со вложенными дистанциями.
 * Создания, архива и фильтров нет — lite только проходит.
 */

const CONFIG = {
  functionUrl: 'https://functions.yandexcloud.net/d4eebmhdf007eak5nkbo',
};

const $ = (id) => document.getElementById(id);

const STORAGE = {
  event: 'osport.lite.event',
  history: 'osport.lite.events',
  group: 'osport.lite.group',
  marks: 'osport.lite.marks',
  identity: 'osport.lite.identity',
};

const state = {
  event: null,
  marks: [],
  position: null,
  watchId: null,
  candidate: null,
  history: [],
};

/* ─────────────────────────── хранилище ─────────────────────────── */

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Приватный режим может запретить запись — работаем без сохранения
  }
}

function marksKey(eventId) {
  return STORAGE.marks + '.' + eventId;
}

function loadMarks(eventId) {
  return eventId ? readJson(marksKey(eventId), []) : [];
}

function saveMarks() {
  if (state.event) writeJson(marksKey(state.event.id), state.marks);
}

/** Скачанные события: список карточек на главном экране. */
function loadHistory() {
  return readJson(STORAGE.history, []);
}

function saveHistory() {
  writeJson(STORAGE.history, state.history);
}

function rememberEvent(event) {
  const index = state.history.findIndex((item) => item.id === event.id);
  const brief = { id: event.id, kind: event.kind, entry: event.entry };
  if (index >= 0) {
    state.history[index] = brief;
  } else {
    state.history.push(brief);
  }
  saveHistory();
}

function activateEvent(id) {
  const saved = state.event && state.event.id === id
    ? state.event
    : readJson(STORAGE.event + '.' + id, null);
  if (!saved) return;
  state.event = saved;
  state.marks = loadMarks(id);
  updateSendState();
  showTab('mark');
}

/* ─────────────────────────── облако ─────────────────────────── */

function setStatus(text, kind = '') {
  const node = $('status');
  node.textContent = text;
  node.className = 'status' + (kind ? ' ' + kind : '');
}

async function callFunction(query, body = null) {
  const url = `${CONFIG.functionUrl}?${query}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === null ? '{}' : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error('Сервис не разрешил запрос из браузера (CORS).');
  }
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = null;
  }
  if (!response.ok) {
    throw new Error(parsed && parsed.error ? parsed.error : `Ошибка ${response.status}`);
  }
  return parsed;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ─────────────────────────── вкладки ─────────────────────────── */

function showTab(name) {
  $('homeScreen').classList.toggle('hidden', name !== 'events');
  $('groupScreen').classList.toggle('hidden', name !== 'group');
  $('participantScreen').classList.toggle('hidden', name !== 'participant');
  $('detailScreen').classList.toggle('hidden', name !== 'detail');
  $('cloudScreen').classList.toggle('hidden', name !== 'cloud');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  $('tabEvents').classList.toggle('active',
    name === 'events' || name === 'cloud' || name === 'detail' || name === 'group'
    || name === 'participant');
  $('tabMark').classList.toggle('active', name === 'mark');
  $('tabProfile').classList.toggle('active', name === 'profile');

  if (name === 'mark') {
    if (qrMode()) {
      stopWatch();
      startQrScanner();
    } else {
      stopQrScanner();
      startWatch();
    }
    renderMark();
  } else {
    stopQrScanner();
  }
  if (name === 'profile') updateSendState();
  if (name === 'events') renderHome();
}

/* ─────────────────────────── главный экран ─────────────────────────── */

/** Карточки скачанных событий: как на главном экране приложения. */
/**
 * Главный экран — карточка как в приложении.
 *
 * Одиночная запись (без groupId или одна в группе): сведения прямо в карточке,
 * ниже значки способа отметки и автор с именем. Несколько дистанций одной
 * группы: автор под сроками, а дистанции — вложенными рамками.
 */
function renderHome() {
  const list = $('eventsList');
  list.textContent = '';

  const group = readJson(STORAGE.group, null);
  const event = state.event;
  const items = group && group.items && group.items.length
    ? group.items
    : (event && event.distance
      ? [{ id: event.id, kind: event.kind, entry: event.entry, distance: event.distance }]
      : []);

  $('homeHint').classList.toggle('hidden', items.length > 0);
  if (!items.length) return;

  const first = items[0].entry || {};
  const card = document.createElement('div');
  card.className = 'event-card';

  const head = document.createElement('div');
  head.className = 'event-head';
  const icon = document.createElement('span');
  icon.className = 'event-icon';
  const mark = document.createElement('img');
  mark.src = 'icons/group.png';
  mark.alt = '';
  mark.className = 'event-icon-img';
  icon.append(mark);
  const title = document.createElement('span');
  title.className = 'event-title';
  title.textContent = (group && group.number ? `№ ${group.number} ` : '') + (first.name || 'Без названия');
  head.append(icon, title);
  card.append(head);
  if (items.length > 1) {
    head.style.cursor = 'pointer';
    head.addEventListener('click', openGroup);
  }

  if (first.startTime) {
    const period = document.createElement('p');
    period.className = 'event-meta';
    period.textContent = formatDate(first.startTime) + ' - ' + formatDate(first.finishTime);
    card.append(period);
  }

  if (items.length > 1) {
    // Группа: автор один на всю карточку, дистанции — во вложенных рамках
    card.append(authorRow(first, true));
    items.forEach((item) => {
      const inner = document.createElement('div');
      inner.className = 'distance-card';
      if (event && event.id === item.id) inner.classList.add('active');
      inner.append(detailsLine(item), iconsRow(false));
      if (item.entry && item.entry.mapExt) inner.append(mapLine());
      inner.addEventListener('click', () => activateItem(item));
      card.append(inner);
    });
    list.append(card);
    return;
  }

  // Одиночная запись: сведения прямо в карточке
  const item = items[0];
  const distance = item.distance || {};
  const entry = item.entry || {};

  if (item.kind === 'rogaine') {
    const counts = [];
    if (distance.points) counts.push(`Количество КП: ${distance.points.length}`);
    if (entry.maxScore) counts.push(`Макс. балл: ${entry.maxScore}`);
    if (counts.length) card.append(plainRow(counts.join(' · ')));

    const control = [];
    if (distance.controlTimeMinutes) control.push(`Контр.время: ${distance.controlTimeMinutes} мин`);
    if (distance.penaltyPerMinute || entry.penaltyPerMinute) {
      control.push(`Штраф: ${distance.penaltyPerMinute || entry.penaltyPerMinute} балл/мин`);
    }
    if (control.length) card.append(plainRow(control.join(' · ')));

    const results = Array.isArray(distance.results) ? distance.results.length : 0;
    card.append(plainRow(`Участников: ${results}`));
  } else {
    card.append(detailsLine(item));
  }

  if (entry.mapExt) card.append(mapLine());

  // Свой результат на карточке — как events_my_result в приложении
  const meCode = readJson(STORAGE.identity, { nick: '', code: '' }).code;
  if (meCode) {
    const mine = buildProtocol(distance).find((row) => row.userId === meCode);
    if (mine && mine.status === 'OK') {
      const places = mine.place ? ` · место ${mine.place}` : '';
      card.append(plainRow(`Мой результат: ${formatDuration(mine.elapsed)}${places}`));
    }
  }

  const authorLine = authorRow(entry, true);
  const kindTag = document.createElement('span');
  kindTag.className = 'kind-tag';
  kindTag.textContent = item.kind === 'rogaine' ? 'РОГЕЙН' : '';
  if (kindTag.textContent) authorLine.append(kindTag);
  card.append(authorLine);

  list.append(card);
}

function plainRow(text) {
  const row = document.createElement('p');
  row.className = 'event-meta';
  row.textContent = text;
  return row;
}

/** Строка сведений: «Дистанция: 640 м · КП: 3 · Участников: 1». */
function detailsLine(item) {
  const entry = item.entry || {};
  const distance = item.distance || {};
  const parts = [];
  if (item.kind === 'rogaine') {
    if (distance.points) parts.push(`Количество КП: ${distance.points.length}`);
    if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
  } else {
    if (distance.longInMeters) parts.push(`Дистанция: ${distance.longInMeters} м`);
    if (distance.points) parts.push(`КП: ${distance.points.length}`);
  }
  const results = Array.isArray(distance.results) ? distance.results.length : 0;
  parts.push(`Участников: ${results}`);
  return plainRow(parts.join(' · '));
}

function mapLine() {
  return plainRow('Карта: есть');
}

/** Значки: способ отметки и автор; цвет человечка — как в приложении. */
function iconsRow(withName) {
  const row = document.createElement('div');
  row.className = 'distance-icons';
  row.innerHTML =
    '<svg class="icon small"><use href="icons.svg#mylocation"></use></svg>' +
    '<svg class="icon small author-icon"><use href="icons.svg#person"></use></svg>';
  return row;
}

/** Автор: человечек нужного цвета и имя; у своих — «— Это Вы». */
function authorRow(entry, withName) {
  const row = document.createElement('div');
  row.className = 'author-row';

  const person = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  person.setAttribute('class', 'icon small author-icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', 'icons.svg#person');
  person.append(use);

  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const own = me.code && entry.ownerId && me.code === entry.ownerId;
  person.style.color = !me.code ? '#000000' : own ? '#1565c0' : '#c62828';

  row.append(person);

  if (withName) {
    const name = document.createElement('span');
    name.className = 'author-name';
    name.textContent = (entry.organizer || 'Автор не указан') + (own ? ' — Это Вы' : '');
    row.append(name);
  }
  return row;
}

/** Делает активной выбранную дистанцию группы и открывает её экран. */
function activateItem(item) {
  const saved = readJson(STORAGE.event + '.' + item.id, null);
  const event = saved || {
    id: item.id,
    kind: item.kind,
    key: 'distances/' + item.id + (item.kind === 'rogaine' ? '.rogaine' : '.osport'),
    distance: item.distance,
    entry: item.entry,
  };
  writeJson(STORAGE.event, event);
  state.event = event;
  state.marks = loadMarks(item.id);
  updateSendState();
  openDetail();
}

/* ─────────────────────────── облако ─────────────────────────── */

let cloudEntries = [];

async function openCloud() {
  showTab('cloud');
  $('cloudHint').textContent = 'Загружаю список…';
  $('cloudList').textContent = '';

  try {
    const data = await callFunction('action=list&full=1&rogaine=1');
    cloudEntries = (data.entries || []).slice().sort((a, b) => {
      const left = a.number === undefined ? 0 : Number(a.number);
      const right = b.number === undefined ? 0 : Number(b.number);
      return left - right;
    });
    renderCloud();
  } catch (error) {
    $('cloudHint').textContent = error.message;
  }
}

function renderCloud() {
  const filter = $('cloudSearch').value.trim();

  // Группа — только по groupId; без него запись одиночная, как в приложении
  const groups = new Map();
  cloudEntries.forEach((entry) => {
    const key = entry.groupId ? 'g:' + entry.groupId : 's:' + entry.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  // Поиск по номеру: группа остаётся целиком, если совпал хотя бы один её
  // член — как в CloudFilter.kt
  const matched = [...groups.values()].filter((items) => !filter
    || items.some((entry) => String(entry.number || '').startsWith(filter)));

  const total = matched.length;
  $('cloudHint').textContent = total === 0
    ? 'Ничего не найдено'
    : `Событий в облаке: ${total}`;

  const list = $('cloudList');
  list.textContent = '';

  matched.forEach((items) => {
    const first = items[0];
    const item = document.createElement('button');
    item.className = 'cloud-item';

    const body = document.createElement('div');
    body.className = 'body';

    // У группы впереди значок маршрута, у одиночной записи его нет
    if (items.length > 1) {
      const mark = document.createElement('img');
      mark.src = 'icons/group.png';
      mark.alt = '';
      mark.className = 'cloud-icon';
      body.append(mark);
    }

    const title = document.createElement('span');
    title.className = 'name';
    title.textContent = (first.number ? `№ ${first.number}  ` : '') + (first.name || 'Без названия');
    body.append(title);

    const period = document.createElement('span');
    period.className = 'period';
    period.textContent = formatDate(first.startTime) + ' - ' + formatDate(first.finishTime);
    body.append(period);

    if (items.length > 1) {
      // Дистанции группы: каждая строкой со значком прицела
      items.forEach((entry) => {
        const line = document.createElement('span');
        line.className = 'line with-icon';
        line.innerHTML = '<svg class="icon small"><use href="icons.svg#mylocation"></use></svg>';
        const text = document.createElement('span');
        text.textContent = groupDetails(entry);
        line.append(text);
        body.append(line);
      });
    } else {
      body.append(detailsBlock(first));
      body.append(mapLineCloud(first));
    }

    body.append(authorRowCloud(first));

    // Справа: галочка, если все дистанции записи уже скачаны, иначе стрелка
    const downloaded = items.every((entry) => state.history.some((saved) => saved.id === entry.id));
    const action = document.createElement('span');
    action.className = 'action';
    action.innerHTML = downloaded
      ? '<svg class="icon"><use href="icons.svg#check"></use></svg>'
      : '<svg class="icon"><use href="icons.svg#download"></use></svg>';

    item.append(body, action);
    item.addEventListener('click', () => {
      if (downloaded) {
        activateItem({ id: first.id, kind: first.kind, entry: first, distance: null });
      } else {
        downloadEvent(first);
      }
    });
    list.append(item);
  });
}

/** Сведения о дистанции в строке группы. */
function groupDetails(entry) {
  const parts = [];
  if (entry.kind === 'rogaine') {
    if (entry.checkPointCount) parts.push(`Количество КП: ${entry.checkPointCount}`);
    if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
    if (entry.penaltyPerMinute) parts.push(`Штраф: ${entry.penaltyPerMinute} балл/мин`);
  } else {
    if (entry.lengthMeters) parts.push(`Длина: ${entry.lengthMeters} м`);
    parts.push(`Карта: ${entry.mapExt ? 'есть' : 'нет'}`);
    if (entry.checkPointCount) parts.push(`КП: ${entry.checkPointCount}`);
  }
  parts.push(`Участников: ${entry.participants || 0}`);
  return parts.join(' · ');
}

/** Сведения об одиночной записи: как на карточке облака в приложении. */
function detailsBlock(entry) {
  const wrap = document.createElement('div');
  wrap.className = 'cloud-details';

  if (entry.kind === 'rogaine') {
    const line = document.createElement('span');
    line.className = 'line';
    const parts = [];
    if (entry.checkPointCount) parts.push(`Количество КП: ${entry.checkPointCount}`);
    if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
    if (entry.penaltyPerMinute) parts.push(`Штраф: ${entry.penaltyPerMinute} балл/мин`);
    line.textContent = parts.join(' · ');
    wrap.append(line);

    const row = document.createElement('span');
    row.className = 'line row-line';
    const people = document.createElement('span');
    people.textContent = `Участников: ${entry.participants || 0}`;
    const tag = document.createElement('span');
    tag.className = 'kind-tag';
    tag.textContent = 'Рогейн';
    row.append(people, tag);
    wrap.append(row);
  } else {
    const line = document.createElement('span');
    line.className = 'line';
    const parts = [];
    if (entry.lengthMeters) parts.push(`Длина: ${entry.lengthMeters} м`);
    if (entry.checkPointCount) parts.push(`КП: ${entry.checkPointCount}`);
    parts.push(`Участников: ${entry.participants || 0}`);
    line.textContent = parts.join(' · ');
    wrap.append(line);
  }
  return wrap;
}

/** «Карта: есть/нет» — в облаке строка есть всегда. */
function mapLineCloud(entry) {
  const line = document.createElement('span');
  line.className = 'line';
  line.textContent = `Карта: ${entry.mapExt ? 'есть' : 'нет'}`;
  return line;
}

/** Автор: значок нужного цвета и имя, у своих — «— Это Вы». */
function authorRowCloud(entry) {
  const row = document.createElement('div');
  row.className = 'author-row';

  const person = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  person.setAttribute('class', 'icon small author-icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', 'icons.svg#person');
  person.append(use);

  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const own = me.code && entry.ownerId && me.code === entry.ownerId;
  person.style.color = !me.code ? '#000000' : own ? '#1565c0' : '#c62828';

  const name = document.createElement('span');
  name.className = 'author-name';
  name.textContent = (entry.organizer || 'Автор не указан') + (own ? ' — Это Вы' : '');

  row.append(person, name);
  return row;
}

/** Скачивает одно событие: оно становится активным, но отметку не открывает. */
async function downloadEvent(entry) {
  if (!entry) return;
  setStatus('Скачиваю событие…');
  try {
    const data = await callFunction('action=get&id=' + encodeURIComponent(entry.id));
    if (!data.distance) throw new Error('Сервис не отдал событие');

    const key = 'distances/' + entry.id + (data.kind === 'rogaine' ? '.rogaine' : '.osport');
    const event = { id: entry.id, kind: data.kind, key, distance: data.distance, entry };

    writeJson(STORAGE.event, event);
    writeJson(STORAGE.event + '.' + entry.id, event);
    rememberEvent(event);

    // Группа — карточка с несколькими дистанциями: в приложении они лежат
    // вместе по groupId (или по общему номеру), и на главном видны все.
    // Поэтому скачиваем не только выбранную запись, но и её соседей
    await downloadGroup(entry, event);

    state.event = event;
    state.marks = loadMarks(entry.id);
    setStatus('');
    updateSendState();
    showTab('events');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

/**
 * Скачивает все дистанции одной группы.
 *
 * Правило взято из приложения: записи считаются одной группой, если у них
 * совпадает непустой groupId, а если его нет — общий номер события.
 */
async function downloadGroup(entry, downloaded) {
  let entries = cloudEntries;
  if (!entries.length) {
    const data = await callFunction('action=list&full=1&rogaine=1');
    entries = data.entries || [];
    cloudEntries = entries;
  }

  // Группа определяется ТОЛЬКО groupId. Пустой groupId — запись одиночная,
  // совпадение номеров группой не делает.
  const sameGroup = (candidate) =>
    Boolean(entry.groupId) && candidate.groupId === entry.groupId && candidate.id !== entry.id;

  const items = [{ id: entry.id, kind: downloaded.kind, entry, distance: downloaded.distance }];
  const siblings = entries.filter(sameGroup);

  for (const sibling of siblings) {
    const saved = readJson(STORAGE.event + '.' + sibling.id, null);
    if (saved && saved.distance) {
      items.push({ id: sibling.id, kind: saved.kind, entry: sibling, distance: saved.distance });
      continue;
    }
    try {
      const data = await callFunction('action=get&id=' + encodeURIComponent(sibling.id));
      if (!data.distance) continue;
      const key = 'distances/' + sibling.id + (data.kind === 'rogaine' ? '.rogaine' : '.osport');
      const item = { id: sibling.id, kind: data.kind, key, distance: data.distance, entry: sibling };
      writeJson(STORAGE.event + '.' + sibling.id, item);
      rememberEvent(item);
      items.push({ id: sibling.id, kind: data.kind, entry: sibling, distance: data.distance });
    } catch (error) {
      // Одна недоступная дистанция не должна ломать всю группу
    }
  }

  writeJson(STORAGE.group, { number: entry.number, items });
}

/** Экран группы: только просмотр — название, сроки, список дистанций. */
function openGroup() {
  renderGroup();
  showTab('group');
}

function renderGroup() {
  const group = readJson(STORAGE.group, null);
  const items = group && group.items ? group.items : [];
  if (!items.length) {
    showTab('events');
    return;
  }

  const first = items[0].entry || {};
  $('groupTitle').textContent = (group.number ? `№ ${group.number} ` : '') + (first.name || 'Группа дистанций');
  $('groupSub').textContent = 'Группа дистанций';

  const rows = $('groupRows');
  rows.textContent = '';
  if (first.organizer) rows.append(detailRow(`Организатор: ${first.organizer}`));
  if (first.startTime) {
    rows.append(detailRow(formatDate(first.startTime) + ' - ' + formatDate(first.finishTime)));
  }

  const list = $('groupDistances');
  list.textContent = '';
  items.forEach((item, index) => {
    const distance = item.distance || {};
    const entry = item.entry || {};

    const row = document.createElement('div');
    row.className = 'point';
    if (state.event && state.event.id === item.id) row.classList.add('done');

    const name = document.createElement('span');
    name.className = 'num';
    name.textContent = `Дистанция ${index + 1}`;

    const info = document.createElement('span');
    info.className = 'state';
    const parts = [];
    if (distance.points) parts.push(`КП: ${distance.points.length}`);
    if (entry.lengthMeters) parts.push(`${entry.lengthMeters} м`);
    info.textContent = parts.join(' · ');

    row.append(name, info);
    row.addEventListener('click', () => activateItem(item));
    list.append(row);
  });
}

/* ─────────────────────────── экран дистанции ─────────────────────────── */

function openDetail() {
  renderDetail();
  showTab('detail');
}

function detailRow(text) {
  const row = document.createElement('p');
  row.className = 'detail-row';
  row.textContent = text;
  return row;
}

function renderDetail() {
  const event = state.event;
  if (!event) {
    showTab('events');
    return;
  }

  const entry = event.entry || {};
  const distance = event.distance || {};
  $('detailTitle').textContent = (entry.number ? `№ ${entry.number} ` : '') + (distance.name || 'Событие');
  $('detailSub').textContent = event.kind === 'rogaine' ? 'Рогейн' : 'Дистанция';

  const rows = $('detailRows');
  rows.textContent = '';
  if (entry.organizer) rows.append(detailRow(`Организатор: ${entry.organizer}`));
  if (entry.startTime) {
    rows.append(detailRow(formatDate(entry.startTime) + ' - ' + formatDate(entry.finishTime)));
  }

  const points = distance.points || [];
  const phone = distance.phone || entry.phone;
  if (phone) rows.append(detailRow(`Телефон: ${phone}`));

  const startLat = Number(distance.latitude);
  const startLon = Number(distance.longitude);
  if (Number.isFinite(startLat) && Number.isFinite(startLon) && (startLat || startLon)) {
    rows.append(detailRow('Место старта'));
    rows.append(detailRow(
      `Широта ${startLat.toFixed(5).replace('.', ',')} · Долгота ${startLon.toFixed(5).replace('.', ',')}`
    ));
  }

  if (event.kind === 'rogaine') {
    const counts = [];
    if (points.length) counts.push(`Количество КП: ${points.length}`);
    if (entry.maxScore) counts.push(`Макс. балл: ${entry.maxScore}`);
    if (counts.length) rows.append(detailRow(counts.join(' · ')));
    rows.append(detailRow(entry.mapExt ? 'Карта: есть' : 'Карта: нет'));
    if (distance.controlTimeMinutes) rows.append(detailRow(`Контр.время: ${distance.controlTimeMinutes} мин`));
    if (distance.penaltyPerMinute) rows.append(detailRow(`Штраф: ${distance.penaltyPerMinute} балл/мин`));
    if (distance.description) rows.append(detailRow(distance.description));
  } else {
    rows.append(detailRow(`Количество КП: ${points.length}`));
    if (distance.longInMeters) rows.append(detailRow(`Дистанция: ${distance.longInMeters} м`));
    rows.append(detailRow(entry.mapExt ? 'Карта: есть' : 'Карта: нет'));
    if (distance.description) rows.append(detailRow(distance.description));
  }

  $('detailSend').disabled = !state.marks.some((mark) => mark.finish);

  renderMyMarks();
  showMap(points);
  renderProtocol(distance);
}

/** «Отметки на устройстве»: свои отметки и переход в прогресс, как в приложении. */
function renderMyMarks() {
  const marks = state.marks.slice().sort((left, right) => (left.time || 0) - (right.time || 0));
  $('detailMarks').classList.remove('hidden');
  $('detailMarksEmpty').classList.toggle('hidden', marks.length > 0);

  const list = $('detailMarksList');
  list.textContent = '';
  if (!marks.length) return;

  const intro = document.createElement('button');
  intro.className = 'proto-row';
  intro.innerHTML =
    '<span class="proto-nick">Отметки на устройстве</span>' +
    `<span class="proto-result">${marks.length}</span>`;
  intro.addEventListener('click', () => openMyProgress());
  list.append(intro);
}

/** Открывает прогресс по своим отметкам с устройства. */
function openMyProgress() {
  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const start = state.marks.find((mark) => mark.start);
  const finish = state.marks.find((mark) => mark.finish);
  const points = rogaineMode() ? rogainePoints(state.marks) : 0;

  const row = {
    userId: me.code || 'me',
    nick: me.nick || 'Мои отметки',
    startTime: start ? start.time : 0,
    finishTime: finish ? finish.time : 0,
    elapsed: start && finish ? finish.time - start.time : 0,
    score: points,
    penalty: 0,
    total: points,
    status: start && finish ? 'OK' : 'DNF',
    marks: state.marks,
    place: null,
  };
  openParticipant(row, rogaineMode());
}

/**
 * Карта пунктов — как в приложении.
 *
 * Тайлы OpenStreetMap или OpenTopoMap, красная линия маршрута, значки:
 * старт — треугольник, финиш — двойная окружность, контрольный пункт —
 * окружность с номером справа (номер с белой обводкой). Кнопки «слои» и
 * «на весь экран», подпись источника слева сверху, координаты под картой.
 */
const MAP_KINDS = [
  {
    id: 'osm',
    urls: ['https://tile.openstreetmap.org/'],
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'topo',
    urls: ['https://a.tile.opentopomap.org/', 'https://b.tile.opentopomap.org/', 'https://c.tile.opentopomap.org/'],
    attribution: 'Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
];

const mapState = {
  kind: 0,
  fullscreen: false,
  points: [],
};

function currentMapKind() {
  return MAP_KINDS[mapState.kind % MAP_KINDS.length];
}

function showMap(points) {
  const current = state.event;
  const distance = (current && current.distance) || {};
  const routeVisible = distance.routeVisible !== false;

  const all = (points || []).filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );

  // Как в приложении: при скрытом маршруте на карте остаётся только старт
  let visible = all;
  if (!routeVisible) {
    const start = all.find((point) => isStart(String(codeOf(point)), rogaineMode()));
    const fallback = (Number(distance.latitude) || Number(distance.longitude))
      ? [{ latitude: Number(distance.latitude), longitude: Number(distance.longitude) }]
      : [];
    visible = start ? [start] : fallback;
  }

  mapState.points = visible;

  const box = $('detailMap');
  box.textContent = '';
  const coords = $('mapCoords');

  if (!mapState.points.length) {
    box.classList.add('hidden');
    coords.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  coords.classList.remove('hidden');
  box.classList.toggle('fullscreen', mapState.fullscreen);

  drawMap(box);

  const kind = currentMapKind();
  const attribution = document.createElement('span');
  attribution.className = 'map-attr';
  attribution.textContent = kind.attribution;
  box.append(attribution);

  const controls = document.createElement('div');
  controls.className = 'map-controls';
  controls.innerHTML =
    '<button class="icon-button" id="mapLayers" title="Слои"><svg class="icon"><use href="icons.svg#layers"></use></svg></button>' +
    (mapState.fullscreen
      ? '<button class="icon-button" id="mapFull" title="Свернуть"><svg class="icon"><use href="icons.svg#fullscreen_exit"></use></svg></button>'
      : '<button class="icon-button" id="mapFull" title="На весь экран"><svg class="icon"><use href="icons.svg#fullscreen"></use></svg></button>');
  box.append(controls);

  controls.querySelector('#mapLayers').addEventListener('click', (event) => {
    event.stopPropagation();
    mapState.kind = (mapState.kind + 1) % MAP_KINDS.length;
    saveMapKind();
    showMap(mapState.points);
  });
  controls.querySelector('#mapFull').addEventListener('click', (event) => {
    event.stopPropagation();
    mapState.fullscreen = !mapState.fullscreen;
    showMap(mapState.points);
  });

  const lat = mapState.points.reduce((sum, point) => sum + point.latitude, 0) / mapState.points.length;
  const lon = mapState.points.reduce((sum, point) => sum + point.longitude, 0) / mapState.points.length;
  coords.textContent =
    `Широта ${lat.toFixed(5).replace('.', ',')} · Долгота ${lon.toFixed(5).replace('.', ',')}`;
}

/** Рисует тайлы, линию маршрута и значки пунктов. */
function drawMap(box) {
  const points = mapState.points;
  const kind = currentMapKind();

  const width = box.clientWidth || 360;
  const height = box.clientHeight || 260;

  // Подбор масштаба по границам: карта показывает весь маршрут целиком
  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const projectAt = (level) => {
    const s = 256 * Math.pow(2, level);
    return (lat, lon) => ({
      px: ((lon + 180) / 360) * s,
      py: ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * s,
    });
  };

  let zoom = 16;
  for (let candidate = points.length === 1 ? 15 : 18; candidate >= 3; candidate--) {
    const probe = projectAt(candidate);
    const topLeft = probe(maxLat, minLon);
    const bottomRight = probe(minLat, maxLon);
    const fits = Math.abs(bottomRight.px - topLeft.px) <= width - 60
      && Math.abs(bottomRight.py - topLeft.py) <= height - 60;
    zoom = candidate;
    if (fits) break;
  }

  const scale = 256 * Math.pow(2, zoom);
  const project = projectAt(zoom);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const center = project(centerLat, centerLon);
  const left = center.px - width / 2;
  const top = center.py - height / 2;

  const firstX = Math.floor(left / 256);
  const lastX = Math.floor((left + width) / 256);
  const firstY = Math.floor(top / 256);
  const lastY = Math.floor((top + height) / 256);

  for (let x = firstX; x <= lastX; x++) {
    for (let y = firstY; y <= lastY; y++) {
      const tile = document.createElement('img');
      tile.className = 'tile';
      const host = kind.urls[Math.abs(x + y) % kind.urls.length];
      tile.src = `${host}${zoom}/${x}/${y}.png`;
      tile.style.left = `${x * 256 - left}px`;
      tile.style.top = `${y * 256 - top}px`;
      tile.alt = '';
      box.append(tile);
    }
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'map-overlay');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));

  const positionOf = (point) => {
    const p = project(point.latitude, point.longitude);
    return { x: p.px - left, y: p.py - top };
  };

  // Линия маршрута: как в приложении — красная, по порядку пунктов
  const current = state.event || {};
  const order = (current.distance && current.distance.order) || [];
  const routeVisible = !(current.distance && current.distance.routeVisible === false);
  if (routeVisible && order.length > 1) {
    const route = order
      .map((code) => points.find((point) => String(codeOf(point)) === String(code)))
      .filter(Boolean);
    if (route.length > 1) {
      const line = document.createElementNS(svgNS, 'polyline');
      line.setAttribute('points', route.map((point) => {
        const p = positionOf(point);
        return `${p.x},${p.y}`;
      }).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', '#c62828');
      line.setAttribute('stroke-width', '2');
      svg.append(line);
    }
  }

  points.forEach((point) => {
    const { x, y } = positionOf(point);
    const code = String(codeOf(point));
    const start = isStart(code, rogaineMode());
    const finish = isFinish(code, rogaineMode());
    const radius = 14;

    if (start) {
      const triangle = document.createElementNS(svgNS, 'polygon');
      triangle.setAttribute('points', `${x},${y - radius} ${x - radius},${y + radius} ${x + radius},${y + radius}`);
      triangle.setAttribute('fill', 'none');
      triangle.setAttribute('stroke', '#c62828');
      triangle.setAttribute('stroke-width', '2.5');
      svg.append(triangle);
      return;
    }

    if (finish) {
      [radius, radius * 0.55].forEach((r) => {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', String(r));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#c62828');
        circle.setAttribute('stroke-width', '2.5');
        svg.append(circle);
      });
      return;
    }

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#c62828');
    circle.setAttribute('stroke-width', '2.5');
    svg.append(circle);

    // Номер справа от окружности: белая обводка, чтобы читался на карте
    const halo = document.createElementNS(svgNS, 'text');
    halo.setAttribute('x', String(x + radius + 5));
    halo.setAttribute('y', String(y + 5));
    halo.setAttribute('font-size', '15');
    halo.setAttribute('font-weight', 'bold');
    halo.setAttribute('fill', '#ffffff');
    halo.setAttribute('stroke', '#ffffff');
    halo.setAttribute('stroke-width', '3');
    halo.textContent = code;

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(x + radius + 5));
    label.setAttribute('y', String(y + 5));
    label.setAttribute('font-size', '15');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', '#c62828');
    label.textContent = code;

    svg.append(halo, label);
  });

  box.append(svg);
}

function saveMapKind() {
  try {
    localStorage.setItem('osport.lite.mapkind', String(mapState.kind));
  } catch (error) {
    // Приватный режим может запретить запись
  }
}

function loadMapKind() {
  try {
    const saved = Number(localStorage.getItem('osport.lite.mapkind'));
    if (Number.isFinite(saved) && saved >= 0) mapState.kind = saved % MAP_KINDS.length;
  } catch (error) {
    mapState.kind = 0;
  }
}

/** Время как в приложении: чч:мм:сс или мм:сс. */
function formatDuration(millis) {
  if (!Number.isFinite(millis) || millis <= 0) return '—';
  const total = Math.floor(millis / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function formatClock(millis) {
  if (!Number.isFinite(millis) || millis <= 0) return '—';
  return new Date(millis).toLocaleTimeString('ru-RU');
}

/** Сколько строк протокола видно без «Показать всех». */
const PROTOCOL_PREVIEW_ROWS = 8;

/**
 * Статус результата — те же правила, что в приложении:
 * DNS — не было старта, DNF — нет финиша, DSQ — отметки не по маршруту,
 * иначе «финиш».
 */
function resultStatusOf(row, distance) {
  if (!row.startTime) return 'DNS';
  if (!row.finishTime) return 'DNF';

  const route = (distance.order || []).map((code) => String(code))
    .filter((code) => !isStart(code, false) && !isFinish(code, false));
  if (!route.length) return 'OK';

  const taken = row.marks
    .map((mark) => String(mark.code))
    .filter((code) => !isStart(code, false) && !isFinish(code, false));

  if (taken.length !== route.length) return 'DSQ';
  return taken.every((code, index) => code === route[index]) ? 'OK' : 'DSQ';
}

/** Баллы рогейна: очки пунктов без повторов, старт и финиш не считаются. */
function rogainePoints(marks) {
  const seen = new Set();
  let total = 0;
  (marks || []).forEach((mark) => {
    const code = String(mark.code || '');
    if (!/^[1-9]/.test(code)) return;
    if (seen.has(code)) return;
    seen.add(code);
    total += Number(code[0]) || 0;
  });
  return total;
}

/** Штраф рогейна: неполная минута считается целой, ровно в срок — ноль. */
function rogainePenaltyOf(finishTime, startTime, controlMinutes, penaltyPerMinute) {
  const limit = startTime + (controlMinutes || 0) * 60000;
  const late = finishTime - limit;
  if (late <= 0) return { minutes: 0, points: 0 };
  const minutes = Math.ceil(late / 60000);
  return { minutes, points: minutes * (penaltyPerMinute || 0) };
}

/**
 * Протокол из скачанной дистанции — по правилам приложения:
 * сначала финишировавшие, места с пропуском при равенстве, у рогейна
 * сортировка по баллам и затем по времени.
 */
function buildProtocol(distance) {
  const results = Array.isArray(distance.results) ? distance.results : [];
  const rogaine = rogaineMode();

  const rows = results.map((row) => {
    const marks = Array.isArray(row.marks) ? row.marks : [];
    const status = rogaine ? (row.finishTime ? 'OK' : 'DNF') : resultStatusOf({ ...row, marks }, distance);
    const elapsed = row.startTime && row.finishTime ? row.finishTime - row.startTime : 0;
    const score = rogaine ? rogainePoints(marks) : 0;
    const penalty = rogaine && row.finishTime && row.startTime
      ? rogainePenaltyOf(row.finishTime, row.startTime, distance.controlTimeMinutes, distance.penaltyPerMinute)
      : { minutes: 0, points: 0 };

    return {
      userId: row.userId || '',
      nick: row.nick || row.userId || 'Участник',
      startTime: row.startTime || 0,
      finishTime: row.finishTime || 0,
      elapsed: status === 'OK' ? elapsed : 0,
      score,
      penalty: penalty.points,
      penaltyMinutes: penalty.minutes,
      total: Math.max(0, score - penalty.points),
      status,
      marks,
      place: null,
    };
  });

  const ordered = rows.slice().sort((left, right) => {
    const leftOk = left.status === 'OK' ? 0 : 1;
    const rightOk = right.status === 'OK' ? 0 : 1;
    if (leftOk !== rightOk) return leftOk - rightOk;
    if (rogaine) {
      if (right.total !== left.total) return right.total - left.total;
      return left.elapsed - right.elapsed;
    }
    return left.elapsed - right.elapsed;
  });

  // Место — позиция в протоколе; при равенстве место повторяется, следующее
  // идёт с пропуском (1, 2, 2, 5)
  let lastKey = null;
  let lastPlace = 0;
  let best = null;
  ordered.forEach((row, index) => {
    if (row.status !== 'OK') return;
    const key = rogaine ? `${row.total}/${row.elapsed}` : String(row.elapsed);
    if (key === lastKey) {
      row.place = lastPlace;
    } else {
      row.place = index + 1;
      lastPlace = row.place;
      lastKey = key;
    }
    if (best === null) best = row;
    row.behind = rogaine ? Math.max(0, best.total - row.total) : Math.max(0, row.elapsed - best.elapsed);
  });

  return ordered;
}

let protocolExpanded = false;

/** Протокол: заголовок, число участников, колонки и строки. */
function renderProtocol(distance) {
  const rows = buildProtocol(distance);
  const rogaine = rogaineMode();

  $('detailProtocol').classList.remove('hidden');
  $('protoEmpty').classList.toggle('hidden', rows.length > 0);
  $('protoCount').textContent = `Участников: ${rows.length}`;

  const list = $('protoList');
  list.textContent = '';

  if (rows.length) {
    const head = document.createElement('div');
    head.className = 'proto-row head';
    head.innerHTML =
      '<span class="proto-place">Место</span>' +
      '<span class="proto-nick">Ник</span>' +
      `<span class="proto-result">${rogaine ? 'Баллы' : 'Результат'}</span>` +
      `<span class="proto-behind">${rogaine ? 'Штраф' : 'Отст.'}</span>`;
    list.append(head);

    const shown = protocolExpanded ? rows : rows.slice(0, PROTOCOL_PREVIEW_ROWS);
    shown.forEach((row) => list.append(protocolRow(row, rogaine)));
  }

  const more = $('protoMore');
  more.classList.toggle('hidden', rows.length <= PROTOCOL_PREVIEW_ROWS);
  more.textContent = protocolExpanded ? 'Свернуть' : `Показать всех (${rows.length})`;
}

/** Строка протокола: место (или статус), ник, результат, отставание. */
function protocolRow(row, rogaine) {
  const item = document.createElement('button');
  item.className = 'proto-row';

  const place = document.createElement('span');
  place.className = 'proto-place';
  place.textContent = row.status === 'OK' ? String(row.place) : row.status;

  const nick = document.createElement('span');
  nick.className = 'proto-nick';
  nick.textContent = row.nick;

  const result = document.createElement('span');
  result.className = 'proto-result';
  result.textContent = row.status === 'OK'
    ? (rogaine ? String(row.total) : formatDuration(row.elapsed))
    : '—';

  const behind = document.createElement('span');
  behind.className = 'proto-behind';
  if (row.status !== 'OK') {
    behind.textContent = '';
  } else if (rogaine) {
    behind.textContent = row.penalty ? `−${row.penalty}` : '0';
  } else {
    behind.textContent = row.behind ? '+' + formatDuration(row.behind) : '—';
  }

  item.append(place, nick, result, behind);
  item.addEventListener('click', () => openParticipant(row, rogaine));
  return item;
}

/**
 * Экран участника: сплиты как в приложении.
 *
 * Время отметки, время на этапе (от предыдущей отметки), отставание от
 * лидера по этому же пункту и пометка «не по маршруту», если отметка стоит
 * не в свою очередь.
 */
function openParticipant(row, rogaine) {
  const distance = (state.event && state.event.distance) || {};
  const rows = buildProtocol(distance);
  const leader = rows.find((item) => item.status === 'OK');

  const leaderTimes = new Map();
  if (leader && leader !== row) {
    (leader.marks || []).forEach((mark) => {
      leaderTimes.set(String(mark.code), mark.time);
    });
  }

  $('participantTitle').textContent = row.nick;
  $('participantSub').textContent = rogaine
    ? `Баллы: ${row.total} · штраф ${row.penalty} · место ${row.place || '—'}`
    : `Результат: ${formatDuration(row.elapsed)} · место ${row.place || '—'}`;

  const list = $('participantMarks');
  list.textContent = '';

  const route = (distance.order || []).map((code) => String(code))
    .filter((code) => !isStart(code, rogaine) && !isFinish(code, rogaine));

  const marks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));
  let previous = null;
  let expected = 0;

  marks.forEach((mark) => {
    const code = String(mark.code);
    const startPoint = isStart(code, rogaine);
    const finishPoint = isFinish(code, rogaine);

    // Номер по порядку получают только отметки в свою очередь, как в
    // progressRows: лишняя остаётся без номера и помечается
    let orderNumber = '';
    let offRoute = false;
    if (startPoint) {
      orderNumber = 'Старт';
    } else if (finishPoint) {
      orderNumber = 'Финиш';
    } else if (route.length) {
      if (route[expected] === code) {
        expected += 1;
        orderNumber = String(expected);
      } else {
        offRoute = true;
        orderNumber = '—';
      }
    } else {
      orderNumber = '—';
    }

    const leg = previous ? (mark.time - previous) : null;
    const leaderTime = leaderTimes.get(code);
    const behind = leaderTime && previous ? (mark.time - leaderTime) : null;

    const item = document.createElement('div');
    item.className = 'split-row' + (offRoute ? ' off-route' : '');

    const order = document.createElement('span');
    order.className = 'split-order';
    order.textContent = orderNumber;

    const name = document.createElement('span');
    name.className = 'split-name';
    name.textContent = startPoint ? 'Старт' : finishPoint ? 'Финиш' : `КП ${code}`;

    const clock = document.createElement('span');
    clock.className = 'split-clock';
    clock.textContent = formatClock(mark.time);

    const legText = document.createElement('span');
    legText.className = 'split-leg';
    legText.textContent = leg === null ? '—' : formatDuration(leg);

    const behindText = document.createElement('span');
    behindText.className = 'split-behind';
    if (offRoute) {
      behindText.textContent = 'не по маршруту';
    } else if (behind === null) {
      behindText.textContent = '';
    } else if (behind === 0) {
      behindText.textContent = 'лидер';
    } else {
      behindText.textContent = (behind > 0 ? '+' : '−') + formatDuration(Math.abs(behind));
    }

    item.append(order, name, clock, legText, behindText);
    list.append(item);
    previous = mark.time;
  });

  showTab('participant');
}

/* ─────────────────────────── отметки ─────────────────────────── */

/** Как отмечаются в этой дистанции: «QR» или «GPS» (MarkMode в приложении). */
function qrMode() {
  const distance = (state.event && state.event.distance) || {};
  return String(distance.markMode || '').toUpperCase() === 'QR';
}

function rogaineMode() {
  return Boolean(state.event && state.event.kind === 'rogaine');
}

function labelOf(point) {
  const code = codeOf(point);
  if (isStart(code, rogaineMode())) return 'Старт';
  if (isFinish(code, rogaineMode())) return 'Финиш';
  return rogaineMode() ? `№${code}` : `КП ${code}`;
}

function markedCodes() {
  return new Set(
    state.marks.filter((mark) => !mark.start && !mark.finish).map((mark) => String(mark.code))
  );
}

function findCandidate() {
  if (!state.event) return null;
  const points = (state.event.distance && state.event.distance.points) || [];
  const marked = markedCodes();
  const started = state.marks.some((mark) => mark.start);
  const finished = state.marks.some((mark) => mark.finish);
  if (finished) return null;

  for (const point of points) {
    const code = codeOf(point);
    const start = isStart(code, rogaineMode());
    const finish = isFinish(code, rogaineMode());
    if (start && started) continue;
    if (finish && !started) continue;
    if (!start && !finish && marked.has(code)) continue;
    if (canMark(point, state.position).ok) return point;
  }
  return null;
}

function renderMark() {
  const event = state.event;
  if (!event) {
    $('markTitle').textContent = 'Сначала активируйте событие';
    $('markAccuracy').textContent = 'Выберите событие в облаке.';
    $('markReady').classList.add('hidden');
    setCircle(null, 'Подойдите к пункту', false);
    return;
  }

  const distance = event.distance || {};
  const scanning = qrMode();
  $('markTitle').textContent = distance.name || 'Событие';

  $('qrBox').classList.toggle('hidden', !scanning);
  document.querySelector('.mark-center').classList.toggle('hidden', scanning);
  if (scanning) {
    $('markAccuracy').textContent = 'Отметка автоматическая';
    $('markReady').classList.add('hidden');
    $('markHint').textContent = 'Наведите камеру на QR-код — отметка поставится сама';
    return;
  }

  const position = state.position;
  if (position) {
    const accuracy = Math.round(position.accuracy * 10) / 10;
    $('markAccuracy').textContent = `Погрешность: ${String(accuracy).replace('.', ',')} м`;
  } else {
    $('markAccuracy').textContent = 'Координаты пока не получены';
  }

  const ready = $('markReady');
  const candidate = findCandidate();
  state.candidate = candidate;

  if (!position) {
    ready.textContent = 'Ждём сигнал GPS';
    ready.classList.remove('hidden', 'ok');
  } else if (position.accuracy > MAX_ACCURACY_METERS) {
    ready.textContent = `Точность пока грубая: ±${Math.round(position.accuracy)} м`;
    ready.classList.remove('hidden', 'ok');
  } else if (candidate) {
    ready.textContent = 'Готово — можно отмечать';
    ready.classList.remove('hidden');
    ready.classList.add('ok');
  } else {
    ready.classList.add('hidden');
  }

  if (candidate) setCircle(candidate, labelOf(candidate), true);
  else setCircle(null, 'Подойдите к пункту', false);
}

function setCircle(point, label, ready) {
  const circle = $('bigMark');
  $('markButtonLabel').textContent = label;
  circle.classList.toggle('ready', Boolean(ready));
  circle.disabled = !ready;
}

function markCandidate() {
  const point = state.candidate;
  if (!point || !state.event) {
    if (state.marks.some((mark) => mark.finish)) setStatus('Вы уже финишировали', 'error');
    return;
  }

  const period = periodState(state.event.distance);
  if (period !== 'OK') {
    setStatus(period === 'BEFORE' ? 'Проведение ещё не началось' : 'Время проведения закончилось', 'error');
    return;
  }

  const code = codeOf(point);
  if (isFinish(code, rogaineMode()) && !state.marks.some((mark) => mark.start)) {
    setStatus('Вначале отметьте старт на выбранной дистанции', 'error');
    return;
  }

  state.marks.push({
    code,
    time: Date.now(),
    start: isStart(code, rogaineMode()),
    finish: isFinish(code, rogaineMode()),
  });
  saveMarks();
  renderMark();
  playMarkSound();
  setStatus('Отметка записана', 'good');
}

/** Сканер QR: камера и BarcodeDetector, отметка ставится сама. */
let qrStream = null;
let qrTimer = null;
let qrBusy = false;

function startQrScanner() {
  if (qrTimer !== null) return;
  const video = $('qrVideo');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('Камера недоступна в этом браузере', 'error');
    return;
  }

  if (!('BarcodeDetector' in window)) {
    setStatus('Этот браузер не читает QR-коды. Откройте lite в Chrome на Android.', 'error');
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      qrStream = stream;
      video.srcObject = stream;
      video.play().catch(() => {});
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      qrTimer = setInterval(() => detectOnce(detector, video), 500);
    })
    .catch(() => setStatus('Камера недоступна: проверьте разрешение', 'error'));
}

function detectOnce(detector, video) {
  if (qrBusy || !video.videoWidth) return;
  qrBusy = true;
  detector
    .detect(video)
    .then((codes) => {
      qrBusy = false;
      if (codes && codes.length) handleQrText(codes[0].rawValue);
    })
    .catch(() => {
      qrBusy = false;
    });
}

/** Разбор и отметка по содержимому QR — правила из MarkCodes и RogaineQr. */
function handleQrText(raw) {
  if (!state.event) return;
  const distance = state.event.distance || {};
  const parsed = parsePointQr(raw, distance.ownerId || (state.event.entry || {}).ownerId, rogaineMode());

  if (parsed.error === 'foreign') {
    setStatus('Это не код контрольного пункта — или не вашей дистанции', 'error');
    return;
  }
  if (parsed.error === 'other-kind') {
    setStatus('Код другой дистанции', 'error');
    return;
  }
  if (parsed.error) {
    setStatus('Не удалось прочитать код', 'error');
    return;
  }

  const code = String(parsed.code);
  const point = (distance.points || []).find((item) => String(codeOf(item)) === code);
  if (!point) {
    setStatus('Код другой дистанции', 'error');
    return;
  }

  markByCode(code);
}

/** Отметка по коду: старт, финиш и пункты — как на GPS-экране. */
function markByCode(code) {
  if (state.marks.some((mark) => mark.finish)) {
    setStatus('Вы уже финишировали', 'error');
    return;
  }
  const start = isStart(code, rogaineMode());
  const finish = isFinish(code, rogaineMode());
  if (finish && !state.marks.some((mark) => mark.start)) {
    setStatus('Вначале отметьте старт на выбранной дистанции', 'error');
    return;
  }
  if (!start && !finish && !state.marks.some((mark) => mark.start)) {
    setStatus('Вначале отметьте старт на выбранной дистанции', 'error');
    return;
  }

  state.marks.push({ code, time: Date.now(), start, finish });
  saveMarks();
  playMarkSound();
  renderMark();
  setStatus('Отметка записана', 'good');
}

function stopQrScanner() {
  if (qrTimer !== null) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
  if (qrStream) {
    qrStream.getTracks().forEach((track) => track.stop());
    qrStream = null;
  }
}

function stopWatch() {
  if (state.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

function startWatch() {
  if (state.watchId !== null || !navigator.geolocation) return;
  state.watchId = navigator.geolocation.watchPosition(
    (position) => {
      state.position = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      renderMark();
    },
    (error) => {
      $('markAccuracy').textContent = 'GPS недоступен: ' + error.message;
      $('gpsRetry').classList.remove('hidden');
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
}

/** Звук и вибрация при отметке — как MarkSoundPlayer и MarkVibrationPlayer. */
function playMarkSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    }
  } catch (error) {
    // Звук не обязателен: если браузер запретил, отметка всё равно записана
  }
  if (navigator.vibrate) navigator.vibrate(60);
}

/* ─────────────────────────── профиль и отправка ─────────────────────────── */

function identity() {
  return { nick: $('nick').value.trim(), code: $('code').value.trim().toUpperCase() };
}

function updateSendState() {
  const finished = state.marks.some((mark) => mark.finish);
  $('send').disabled = !state.event || !finished;
  $('sendHint').textContent = finished
    ? 'Результат готов к отправке.'
    : 'Сначала отметьте финиш на дистанции.';
}

async function sendResult() {
  if (!state.marks.length) {
    setStatus('Отметок нет: по этой дистанции ничего не отмечено, отправлять нечего.', 'error');
    return;
  }

  const distanceData = (state.event && state.event.distance) || {};
  const route = (distanceData.order || []).map((code) => String(code))
    .filter((code) => !isStart(code, false) && !isFinish(code, false));
  if (route.length) {
    const taken = state.marks
      .filter((mark) => !mark.start && !mark.finish)
      .map((mark) => String(mark.code));
    const matches = taken.length === route.length && taken.every((code, index) => code === route[index]);
    if (!matches) {
      setStatus('Отметки не соответствуют этой дистанции. Отправлять их нельзя.', 'error');
      return;
    }
  }

  const who = identity();
  if (!who.nick) {
    setStatus('Укажите ник', 'error');
    showTab('profile');
    return;
  }
  if (who.code.length < 6) {
    setStatus('Укажите код профиля', 'error');
    showTab('profile');
    return;
  }
  writeJson(STORAGE.identity, who);

  const event = state.event;
  const payload = Object.assign({}, event.distance, {
    results: [buildResult(event.distance, state.marks, who)],
  });

  setStatus('Отправляю результат…');
  try {
    await callFunction('action=result&key=' + encodeURIComponent(event.key), payload);
    setStatus('Результат отправлен', 'good');
    $('send').disabled = true;
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

/* ─────────────────────────── запуск ─────────────────────────── */

function bind() {
  $('tabEvents').addEventListener('click', () => showTab('events'));
  $('tabMark').addEventListener('click', () => showTab('mark'));
  $('tabProfile').addEventListener('click', () => showTab('profile'));

  $('openCloud').addEventListener('click', openCloud);
  $('cloudRefresh').addEventListener('click', openCloud);
  $('cloudBack').addEventListener('click', () => showTab('events'));
  $('cloudSearch').addEventListener('input', renderCloud);

  $('groupBack').addEventListener('click', () => showTab('events'));
  $('participantBack').addEventListener('click', () => openDetail());
  $('protoMore').addEventListener('click', () => {
    protocolExpanded = !protocolExpanded;
    renderProtocol(state.event.distance || {});
  });
  $('detailBack').addEventListener('click', () => ($('groupScreen').classList.contains('hidden') ? showTab('events') : openGroup()));
  $('detailMark').addEventListener('click', () => showTab('mark'));
  // «Отправить отметки»: если ник и код уже заданы — отправляем сразу,
  // иначе ведём в профиль, где их вводят
  $('detailSend').addEventListener('click', () => {
    const who = identity();
    if (!who.nick || who.code.length < 6) {
      setStatus('Укажите ник и код профиля', 'error');
      showTab('profile');
      return;
    }
    sendResult();
  });
  $('gpsRetry').addEventListener('click', () => {
    state.watchId = null;
    $('gpsRetry').classList.add('hidden');
    startWatch();
  });

  $('bigMark').addEventListener('click', markCandidate);
  $('send').addEventListener('click', sendResult);

  const saved = readJson(STORAGE.identity, { nick: '', code: '' });
  $('nick').value = saved.nick || '';
  $('code').value = saved.code || '';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  registerServiceWorker();
  // Выбор карты запоминается, как в приложении
  loadMapKind();

  state.history = loadHistory();
  const saved = readJson(STORAGE.event, null);
  if (saved && saved.distance) {
    state.event = saved;
    state.marks = loadMarks(saved.id);
    updateSendState();
  }
  showTab('events');
});
