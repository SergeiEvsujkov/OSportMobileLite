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
  settings: 'osport.lite.settings',
  active: 'osport.lite.active',
};

const state = {
  event: null,
  activeId: null,   // id активированной дистанции
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

/** Сообщение внизу — как Snackbar: само гаснет через 4 секунды. */
let statusTimer = null;

function setStatus(text, kind = '') {
  const node = $('status');
  node.textContent = text;
  node.className = 'status' + (kind ? ' ' + kind : '');

  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  if (text) {
    statusTimer = setTimeout(() => {
      node.textContent = '';
      node.className = 'status';
      statusTimer = null;
    }, 4000);
  }
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* ─────────────────────────── вкладки ─────────────────────────── */

/**
 * Навигация между экранами.
 *
 * Каждый переход пишется в историю браузера, поэтому системная кнопка «назад»
 * возвращает на предыдущий экран, а не закрывает приложение.
 */
let navStack = ['events'];
let ignoreNextPop = false;   // выход из полного экрана кнопкой не меняет экран

function showTab(name, options = {}) {
  const push = options.push !== false;

  // Экран отметки без активной дистанции не открывается: сначала активируйте
  if (name === 'mark' && (!state.event || state.activeId !== state.event.id)) {
    setStatus('Сначала активируйте событие', 'error');
    return;
  }

  // Переход на другой экран убирает прошлое сообщение
  setStatus('');
  $('homeScreen').classList.toggle('hidden', name !== 'events');
  $('groupScreen').classList.toggle('hidden', name !== 'group');
  $('participantScreen').classList.toggle('hidden', name !== 'participant');
  $('settingsScreen').classList.toggle('hidden', name !== 'settings');
  $('detailScreen').classList.toggle('hidden', name !== 'detail');
  $('cloudScreen').classList.toggle('hidden', name !== 'cloud');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  $('tabEvents').classList.toggle('active',
    name === 'events' || name === 'cloud' || name === 'detail' || name === 'group'
    || name === 'participant');
  $('tabMark').classList.toggle('active', name === 'mark');
  $('tabProfile').classList.toggle('active', name === 'profile');

  if (push && navStack[navStack.length - 1] !== name) {
    navStack.push(name);
    history.pushState({ depth: navStack.length }, '');
  }

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
  const activeId = state.activeId;

  if (items.length > 1) {
    // Вся карточка группы открывает группу, как в приложении
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
    try {
      openGroup();
    } catch (error) {
      setStatus('Ошибка экрана группы: ' + error.message, 'error');
    }
  });
  }

  if (first.startTime) {
    const period = document.createElement('p');
    period.className = 'event-meta';
    period.textContent = formatDate(first.startTime) + ' - ' + formatDate(first.finishTime);
    card.append(period);
  }

  if (items.length > 1) {
    // Группа: автор один на всю карточку, дистанции — во вложенных рамках
    card.append(authorRow(first, true, false, items[0].distance));
    items.forEach((item) => {
      const inner = document.createElement('div');
      inner.className = 'distance-card';
      if (event && event.id === item.id) inner.classList.add('active');

      // Начатая дистанция внутри группы подсвечивается сама, а не вся карточка
      if (item.id === activeId) inner.classList.add('active-event');
      inner.append(detailsLine(item), iconsRow(false, item.entry, item.distance));
      if (item.entry && item.entry.mapExt) inner.append(mapLine());
      inner.addEventListener('click', (event) => {
        // Дистанция внутри карточки: не даём событию дойти до группы
        event.stopPropagation();
        activateItem(item);
      });
      card.append(inner);
    });
    list.append(card);
    return;
  }

  // Одиночная запись: сведения прямо в карточке
  const item = items[0];
  const distance = item.distance || {};
  const entry = item.entry || {};

  if (item.id === activeId) card.classList.add('active-event');

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

  const authorLine = authorRow(entry, true, true, distance);
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
  const starts = startAliasCodes(distance);
  const checkpoints = (distance.order || [])
    .filter((code) => !starts.has(String(code)))
    .filter((code) => Number(code) >= 31 && Number(code) <= 99).length;

  const parts = [];
  if (item.kind === 'rogaine') {
    if (checkpoints) parts.push(`Количество КП: ${checkpoints}`);
    if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
  } else {
    if (distance.longInMeters) parts.push(`Дистанция: ${distance.longInMeters} м`);
    if (checkpoints) parts.push(`КП: ${checkpoints}`);
  }
  const results = Array.isArray(distance.results) ? distance.results.length : 0;
  parts.push(`Участников: ${results}`);
  return plainRow(parts.join(' · '));
}

function mapLine() {
  return plainRow('Карта: есть');
}

/**
 * Цвет человечка — как tint в EventsScreen: без профиля чёрный, свой синий,
 * с моим результатом зелёный, чужой красный.
 */
function personColor(entry, distance) {
  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  if (!me.code) return '#000000';
  if (entry && entry.ownerId && me.code === entry.ownerId) return '#1565c0';

  const results = (distance && distance.results) || [];
  const mine = results.some((row) => row && row.userId === me.code);
  return mine ? '#2e7d32' : '#c62828';
}

/** Значки: способ отметки и автор; цвет человечка — как в приложении. */
function iconsRow(withName, entry = {}, distance = {}) {
  const row = document.createElement('div');
  row.className = 'distance-icons';
  row.innerHTML =
    '<svg class="icon small"><use href="icons.svg#mylocation"></use></svg>' +
    '<svg class="icon small author-icon"><use href="icons.svg#person"></use></svg>';

  // Цвет как в приложении: чёрный без профиля, синий свой, зелёный с моим
  // результатом, красный чужой
  const person = row.querySelector('.author-icon');
  if (person) person.style.color = personColor(entry, distance);
  return row;
}

/** Автор: человечек нужного цвета и имя; у своих — «— Это Вы». */
function authorRow(entry, withName, withIcon = true, distance = {}) {
  const row = document.createElement('div');
  row.className = 'author-row';

  const person = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  person.setAttribute('class', 'icon small author-icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', 'icons.svg#person');
  person.append(use);

  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const own = me.code && entry.ownerId && me.code === entry.ownerId;
  person.style.color = personColor(entry, distance);

  if (withIcon) row.append(person);

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

/* ─────────────────────────── настройки ─────────────────────────── */

/** Настройки — те же ключи, что в AppSettings.kt; языка нет, он только русский. */
const DEFAULT_SETTINGS = {
  theme: 'system',
  large: false,
  showOnStart: false,
  autoMark: false,
  autoSend: false,
  sound: true,
  vibration: true,
};

function settings() {
  return Object.assign({}, DEFAULT_SETTINGS, readJson(STORAGE.settings, {}));
}

function saveSettings(next) {
  writeJson(STORAGE.settings, next);
  applySettings();
}

function applySettings() {
  const current = settings();
  if (current.theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.dataset.theme = current.theme;
  }
  document.body.classList.toggle('large', Boolean(current.large));
}

function openSettings() {
  renderSettings();
  showTab('settings');
}

function renderSettings() {
  const current = settings();
  $('setLarge').checked = current.large;
  $('setShowOnStart').checked = current.showOnStart;
  $('setAutoMark').checked = current.autoMark;
  $('setAutoSend').checked = current.autoSend;
  $('setSound').checked = current.sound;
  $('setVibration').checked = current.vibration;
  document.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.theme === current.theme);
  });
}

function updateSetting(key, value) {
  const next = settings();
  next[key] = value;
  saveSettings(next);
}

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
  person.style.color = personColor(entry);

  const name = document.createElement('span');
  name.className = 'author-name';
  name.textContent = (entry.organizer || 'Автор не указан') + (own ? ' — Это Вы' : '');

  row.append(person, name);
  return row;
}

/** Скачивает одно событие: оно становится активным, но отметку не открывает. */
async function downloadEvent(entry) {
  if (!entry) return;

  // На главном помещается одно событие: пока скачанное не удалено корзиной,
  // новое не скачиваем
  const downloaded = (state.history || []).filter((item) => item.id !== entry.id);
  if (downloaded.length) {
    setStatus('Сначала удалите скачанное событие корзиной', 'error');
    return;
  }

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

/** Экран группы — как в приложении: сроки, количество дистанций, автор, карта и дистанции. */
function openGroup() {
  try {
    renderGroup();
  } catch (error) {
    setStatus('Ошибка экрана группы: ' + error.message, 'error');
    return;
  }
  showTab('group');
}

function renderGroup() {
  const group = readJson(STORAGE.group, null);
  const items = (group && group.items) || [];
  if (!items.length) {
    setStatus('Группа не найдена: скачайте событие заново', 'error');
    return;
  }

  const first = items[0].entry || {};
  const firstDistance = items[0].distance || {};
  $('groupTitle').textContent = first.name || 'Группа дистанций';
  $('groupSub').textContent = '';

  const rows = $('groupRows');
  rows.textContent = '';
  if (first.startTime) {
    rows.append(detailRow(formatDate(first.startTime) + ' - ' + formatDate(first.finishTime)));
  }
  rows.append(detailRow(`Количество дистанций: ${items.length}`));
  if (first.organizer) rows.append(detailRow(`Организатор: ${first.organizer}`));

  // Общая карта группы: пункты всех дистанций, нумерация по порядку появления
  const labels = new Map();
  let position = 0;
  items.forEach((item) => {
    const distance = item.distance || {};
    (distance.order || []).forEach((code) => {
      const numeric = Number(code);
      if (!(numeric >= 31 && numeric <= 99)) return;
      const key = String(code);
      if (!labels.has(key)) {
        position += 1;
        labels.set(key, `${position} - ${key.padStart(2, '0')}`);
      }
    });
  });

  const byCode = new Map();
  items.forEach((item) => {
    ((item.distance || {}).points || []).forEach((point) => {
      const key = String(codeOf(point));
      if (!byCode.has(key)) byCode.set(key, point);
    });
  });

  const allPoints = [];
  labels.forEach((label, code) => {
    const point = byCode.get(code);
    if (point) allPoints.push(point);
  });

  const startLat = Number(firstDistance.latitude);
  const startLon = Number(firstDistance.longitude);
  const startCode = items.some((item) => item.kind === 'rogaine') ? '01' : '1';
  const hasStart = allPoints.some((point) => startAliasCodes(firstDistance).has(String(codeOf(point))));
  if (!hasStart && Number.isFinite(startLat) && Number.isFinite(startLon) && (startLat || startLon)) {
    allPoints.unshift({ code: startCode, latitude: startLat, longitude: startLon, accuracyMeters: 0 });
  }
  items.forEach((item) => {
    ((item.distance || {}).points || []).forEach((point) => {
      const code = String(codeOf(point));
      if (isFinish(code, item.kind === 'rogaine') && !allPoints.includes(point)) allPoints.push(point);
    });
  });

  mapState.labels = labels;
  mapState.showRoute = false;
  showMapOn($('groupMap'), allPoints);

  const list = $('groupDistances');
  list.textContent = '';
  items.forEach((item, index) => {
    const distance = item.distance || {};
    const entry = item.entry || {};
    const starts = startAliasCodes(distance);
    const order = distance.order || [];
    const checkpoints = order
      .filter((code) => !starts.has(String(code)))
      .filter((code) => Number(code) >= 31 && Number(code) <= 99).length;

    const card = document.createElement('div');
    card.className = 'group-distance';

    const head = document.createElement('div');
    head.className = 'head';
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = `Дистанция ${index + 1}`;
    const mode = document.createElement('span');
    mode.className = 'mode';
    mode.textContent = String(distance.markMode || entry.markMode || '').toUpperCase() === 'QR' ? 'QR' : 'GPS';
    head.append(title, mode);

    const length = document.createElement('p');
    length.className = 'line';
    length.textContent = `Длина : ${distance.longInMeters || entry.lengthMeters || 0} м`;

    const points = document.createElement('p');
    points.className = 'line';
    points.textContent = `КП: ${checkpoints}`;

    const participants = document.createElement('p');
    participants.className = 'line';
    const results = Array.isArray(distance.results) ? distance.results.length : 0;
    participants.textContent = `Участников: ${results}`;

    card.append(head, length, points, participants);
    card.addEventListener('click', () => activateItem(item));
    list.append(card);
  });
}

/* ─────────────────────────── экран дистанции ─────────────────────────── */

function openDetail() {
  resetMapView();
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
  $('detailTitle').textContent = distance.name || 'Событие';

  // Подпись «Дистанция N» — номер дистанции внутри группы, как в приложении
  const group = readJson(STORAGE.group, null);
  const groupItems = (group && group.items) || [];
  const indexInGroup = groupItems.findIndex((item) => item.id === event.id);

  // У дистанции в группе корзины нет: удаляется только вся группа
  const inGroup = indexInGroup >= 0;
  $('detailDelete').classList.toggle('hidden', inGroup);
  $('detailSub').textContent = event.kind === 'rogaine'
    ? 'Рогейн'
    : (indexInGroup >= 0 ? `Дистанция ${indexInGroup + 1}` : 'Дистанция');

  const rows = $('detailRows');
  rows.textContent = '';
  if (entry.organizer) rows.append(detailRow(`Организатор: ${entry.organizer}`));
  if (entry.startTime) {
    rows.append(detailRow(formatDate(entry.startTime) + ' - ' + formatDate(entry.finishTime)));
  }

  const points = distance.points || [];
  const phone = distance.phone || entry.phone;
  if (phone) rows.append(detailRow(`Телефон: ${phone}`));

  if (event.kind === 'rogaine') {
    const counts = [];
    const rogainePoints = points.filter(
      (point) => String(codeOf(point)) !== '01' && String(codeOf(point)) !== '02'
    );
    if (rogainePoints.length) counts.push(`Количество КП: ${rogainePoints.length}`);
    if (entry.maxScore) counts.push(`Макс. балл: ${entry.maxScore}`);
    if (counts.length) rows.append(detailRow(counts.join(' · ')));
    rows.append(detailRow(entry.mapExt ? 'Карта: есть' : 'Карта: нет'));
    if (distance.controlTimeMinutes) rows.append(detailRow(`Контр.время: ${distance.controlTimeMinutes} мин`));
    if (distance.penaltyPerMinute) rows.append(detailRow(`Штраф: ${distance.penaltyPerMinute} балл/мин`));
    if (distance.description) rows.append(detailRow(distance.description));
  } else {
    const orderCodes = distance.order || [];
    const starts = startAliasCodes(distance);
    const checkpoints = orderCodes
      .filter((code) => !starts.has(String(code)))
      .filter((code) => Number(code) >= 31 && Number(code) <= 99).length;
    rows.append(detailRow(`Количество КП: ${checkpoints}`));
    if (distance.longInMeters) rows.append(detailRow(`Дистанция: ${distance.longInMeters} м`));
    rows.append(detailRow(entry.mapExt ? 'Карта: есть' : 'Карта: нет'));
    if (distance.description) rows.append(detailRow(distance.description));
  }

  $('detailSend').disabled = !state.marks.some((mark) => mark.finish);

  // Активна ли эта дистанция: кнопка «Активировать» / «Деактивировать»
  const active = state.activeId === event.id;
  const activateButton = $('detailActivate');
  activateButton.textContent = active ? 'Деактивировать' : 'Активировать';
  activateButton.className = 'button' + (active ? ' outlined' : '');

  // В файле дистанции старта часто нет: он лежит в координатах события.
  // Добавляем его как точку карты, иначе треугольника не видно
  // Точки карты — только те, что есть в маршруте, плюс старт из координат
  // события. Точка, совпавшая со стартом, не рисуется: это тот же старт
  const startCode = event.kind === 'rogaine' ? '01' : '1';
  const startLat = Number(distance.latitude);
  const startLon = Number(distance.longitude);
  const orderCodes = distance.order || [];
  const byCode = new Map(points.map((point) => [String(codeOf(point)), point]));

  let mapPoints = orderCodes
    .map((code) => byCode.get(String(code)))
    .filter((point) => point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  const startPoint = byCode.get(startCode);
  const hasStart = Boolean(startPoint);
  const startLocation = startPoint
    ? { latitude: startPoint.latitude, longitude: startPoint.longitude }
    : (Number.isFinite(startLat) && Number.isFinite(startLon) && (startLat || startLon)
      ? { latitude: startLat, longitude: startLon }
      : null);

  const near = (a, b) => a && b && distanceMeters(a.latitude, a.longitude, b.latitude, b.longitude) < 3;
  mapPoints = mapPoints.filter((point) => String(codeOf(point)) === startCode
    || !near(point, startLocation));

  if (!hasStart && startLocation) {
    mapPoints = [{ code: startCode, ...startLocation, accuracyMeters: 0 }, ...mapPoints];
  }

  showMap(mapPoints);
  renderProtocol(distance);
}

/** Активация дистанции — кнопка «Активировать», как в приложении. */
function activateDistance() {
  if (!state.event) return;
  const entry = state.event.entry || {};
  const distance = state.event.distance || {};

  // Одна активная дистанция на оба вида спорта: как anotherDistanceActive в приложении
  if (state.activeId && state.activeId !== state.event.id) {
    setStatus('Сначала деактивируйте активную дистанцию', 'error');
    return;
  }

  // Как в приложении: без профиля участник начать не может
  const who = identity();
  if (!who.nick || who.code.length < 6) {
    setStatus('Сначала войдите в профиль (вкладка «Профиль»)', 'error');
    showTab('profile');
    return;
  }

  // Участнику нельзя начать после окончания события (у автора проверки нет)
  if (entry.finishTime && Date.now() > entry.finishTime) {
    setStatus('Событие уже закончилось', 'error');
    return;
  }

  // Без координат всех пунктов дистанцию начинать нельзя
  const missing = (distance.points || []).some(
    (point) => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
  );
  if (missing) {
    setStatus('Не все координаты указаны: такую дистанцию нельзя загрузить для прохождения', 'error');
    return;
  }

  state.activeId = state.event.id;
  writeJson(STORAGE.active, state.event.id);
  state.marks = loadMarks(state.event.id);
  updateSendState();
  renderDetail();
  setStatus('Теперь Вы можете производить отметку на этой дистанции', 'good');
}

/** Деактивация: отметки остаются на устройстве, дистанция перестаёт быть активной. */
function deactivateDistance() {
  stopWatch();
  stopQrScanner();
  const eventId = state.event && state.event.id;
  state.activeId = null;
  try {
    localStorage.removeItem(STORAGE.active);
  } catch (error) {
    // приватный режим — просто не сохраняем
  }

  // В приложении выгрузка стирает отметки этой дистанции
  if (eventId) {
    try {
      localStorage.removeItem(marksKey(eventId));
    } catch (error) {
      // ничего страшного
    }
  }
  state.marks = [];

  renderDetail();
  showTab('events');
  setStatus('Дистанция выгружена, отметки не производятся');
}

/** Выход из профиля — как signOut в AppViewModel: отметки и активность снимаются. */
function signOut() {
  const eventId = state.activeId || (state.event && state.event.id);
  stopWatch();
  stopQrScanner();

  // Отметки загруженной дистанции стираются вместе с профилем
  if (eventId) {
    try {
      localStorage.removeItem(marksKey(eventId));
      localStorage.removeItem(STORAGE.event);
      localStorage.removeItem(STORAGE.event + '.' + eventId);
    } catch (error) {
      // приватный режим
    }
  }

  state.activeId = null;
  try {
    localStorage.removeItem(STORAGE.active);
  } catch (error) {
    // приватный режим
  }

  state.event = null;
  state.marks = [];

  // Профиль очищается: гость может снова задать ник и код
  try {
    localStorage.removeItem(STORAGE.identity);
  } catch (error) {
    // приватный режим
  }

  $('nick').value = '';
  $('code').value = '';
  setStatus('Вы вышли из профиля');
}

/** Окно «Выйти из профиля?» — как в приложении. */
function openSignOutDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Выйти из профиля?';

  const hint = document.createElement('p');
  hint.textContent = 'Вы точно хотите выйти? Отметки удалятся.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Выйти';
  confirm.addEventListener('click', () => {
    overlay.remove();
    signOut();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отмена';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** Окно «Удалить событие?» — как в приложении. */
function openDeleteDialog(eventId) {
  const name = ($('detailTitle') && $('detailTitle').textContent) || 'Событие';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Удалить событие?';

  const hint = document.createElement('p');
  hint.textContent = `Дистанция «${name}» будет удалена с устройства вместе со своими отметками и результатами. `
    + 'Вы можете снова загрузить её из облака.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Удалить';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deleteEvent(eventId);
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отмена';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** Окно «Удалить событие?» для группы. */
function openGroupDeleteDialog(groupId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Удалить группу?';

  const hint = document.createElement('p');
  hint.textContent = 'Все дистанции группы, их пункты и результаты будут удалены с устройства';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Удалить';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deleteGroup(groupId);
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отмена';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** Удаляет всю группу: каждую дистанцию и её отметки. */
function deleteGroup(groupId) {
  const group = readJson(STORAGE.group, null);
  const members = ((group && group.items) || []).filter((item) => (item.groupId || groupId) === groupId);
  const ids = members.map((item) => item.id);

  stopWatch();
  stopQrScanner();

  ids.forEach((id) => {
    try {
      localStorage.removeItem(marksKey(id));
      localStorage.removeItem(STORAGE.event + '.' + id);
    } catch (error) {
      // приватный режим
    }
  });

  state.history = (state.history || []).filter((item) => !ids.includes(item.id));
  saveHistory();

  if (state.activeId && ids.includes(state.activeId)) {
    state.activeId = null;
    try {
      localStorage.removeItem(STORAGE.active);
    } catch (error) {
      // приватный режим
    }
  }

  if (state.event && ids.includes(state.event.id)) {
    state.event = null;
    state.marks = [];
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // приватный режим
    }
  }

  try {
    localStorage.removeItem(STORAGE.group);
  } catch (error) {
    // приватный режим
  }

  renderHome();
  showTab('events');
  setStatus('Событие удалено');
}

/** Удаляет событие с устройства: запись, отметки, активность и группу. */
function deleteEvent(eventId) {
  stopWatch();
  stopQrScanner();

  try {
    localStorage.removeItem(marksKey(eventId));
    localStorage.removeItem(STORAGE.event + '.' + eventId);
  } catch (error) {
    // приватный режим
  }

  state.history = (state.history || []).filter((item) => item.id !== eventId);
  saveHistory();

  if (state.activeId === eventId) {
    state.activeId = null;
    try {
      localStorage.removeItem(STORAGE.active);
    } catch (error) {
      // приватный режим
    }
  }

  if (state.event && state.event.id === eventId) {
    state.event = null;
    state.marks = [];
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // приватный режим
    }
  }

  const group = readJson(STORAGE.group, null);
  if (group && (group.items || []).some((item) => item.id === eventId)) {
    localStorage.removeItem(STORAGE.group);
  }

  renderHome();
  showTab('events');
  setStatus('Событие удалено');
}

/** Окно подтверждения деактивации — как UnloadDialog в приложении. */
function openDeactivateDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Деактивировать дистанцию?';

  const hint = document.createElement('p');
  hint.textContent = 'Отметиться по ней больше нельзя, пока не загрузите её снова. ВАШИ ОТМЕТКИ БУДУТ ОЧИЩЕНЫ.';

  const warning = document.createElement('p');
  warning.textContent = 'Если Вы не отправили результат прохождения дистанции, то он будет удалён с устройства.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  // «Отправить отметки» — сначала отправка, потом деактивация
  const sendAndExit = document.createElement('button');
  sendAndExit.className = 'button';
  sendAndExit.textContent = 'Отправить отметки';
  sendAndExit.addEventListener('click', async () => {
    overlay.remove();

    // Без отметок отправлять нечего: деактивируем и говорим об этом
    if (!state.marks.length) {
      deactivateDistance();
      setStatus('Отметок нет: по этой дистанции ничего не отмечено, отправлять нечего.', 'error');
      return;
    }

    // Отметки не от этой дистанции: спрашиваем отдельно
    if (!marksMatchDistance()) {
      openMismatchDialog();
      return;
    }

    await sendResult();
    deactivateDistance();
  });

  const exit = document.createElement('button');
  exit.className = 'button outlined';
  exit.textContent = 'Не отправлять отметки и деактивировать';
  exit.addEventListener('click', () => {
    overlay.remove();
    deactivateDistance();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отмена';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(sendAndExit, exit, cancel);
  modal.append(title, hint, warning, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** Подходят ли отметки этой дистанции: коды из маршрута, старт или финиш. */
function marksMatchDistance() {
  const distance = (state.event && state.event.distance) || {};
  const rogaine = rogaineMode();
  const starts = startAliasCodes(distance);
  const allowed = new Set((distance.order || []).map((code) => String(code)));
  starts.forEach((code) => allowed.add(code));

  const finishCode = rogaine ? '02' : '2';
  allowed.add(finishCode);

  return state.marks.every((mark) => allowed.has(String(mark.code)));
}

/** «Отметки не от этой дистанции?» — как в приложении. */
function openMismatchDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Отметки не от этой дистанции?';

  const hint = document.createElement('p');
  hint.textContent = 'Отметки не соответствуют этой дистанции. Отправлять их нельзя. Отменить деактивацию или всё равно деактивировать?';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Всё равно деактивировать';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deactivateDistance();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отменить деактивацию';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
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
  zoom: null,      // null — подобрать по границам при первом показе
  center: null,    // { latitude, longitude }
  labels: null,    // подписи пунктов для группы: код → «1 - 31»
  showRoute: true, // у группы линия маршрута не рисуется
  box: null,       // контейнер карты, которую сейчас показываем
  coords: null,    // подпись координат внутри карты (у группы её нет)
};

function currentMapKind() {
  return MAP_KINDS[mapState.kind % MAP_KINDS.length];
}

function resetMapView() {
  mapState.zoom = null;
  mapState.center = null;
  mapState.labels = null;
  mapState.showRoute = true;
}

/** Показывает карту группы в её контейнере: подписи заданы, линия не рисуется. */
function showMapOn(box, points) {
  mapState.points = (points || []).filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );
  mapState.zoom = null;
  mapState.center = null;

  box.classList.toggle('hidden', mapState.points.length === 0);
  if (!mapState.points.length) return;

  box.textContent = '';
  box.classList.remove('fullscreen');
  mapState.box = box;
  mapState.coords = null;
  drawMap(box);
  addMapChrome(box);
  bindMapGestures(box);
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
  if (!mapState.points.length) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.classList.toggle('fullscreen', mapState.fullscreen);

  drawMap(box);

  addMapChrome(box);

  const lat = mapState.points.reduce((sum, point) => sum + point.latitude, 0) / mapState.points.length;
  const lon = mapState.points.reduce((sum, point) => sum + point.longitude, 0) / mapState.points.length;
  const coords = document.createElement('span');
  coords.className = 'map-coords';
  coords.textContent =
    `Широта ${lat.toFixed(5).replace('.', ',')} · Долгота ${lon.toFixed(5).replace('.', ',')}`;
  box.append(coords);

  // Карта запоминает контейнер и координаты: по ним перерисовывается при жестах
  mapState.box = box;
  mapState.coords = coords.textContent;

  // Жесты: щипок — масштаб, перетаскивание — сдвиг карты
  bindMapGestures(box);
}

/** Рисует тайлы, линию маршрута и значки пунктов. */
/** Азимут от точки к точке: 0 — север, дальше по часовой стрелке. */
function bearingDegrees(fromLat, fromLon, toLat, toLon) {
  const rad = (value) => (value * Math.PI) / 180;
  const fromLatRad = rad(fromLat);
  const toLatRad = rad(toLat);
  const deltaLon = rad(toLon - fromLon);
  const y = Math.sin(deltaLon) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad)
    - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Значки карты: название подложки и кнопки «слои» и «на весь экран». */
function addMapChrome(box) {
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
    redrawMap();
  });

  controls.querySelector('#mapFull').addEventListener('click', (event) => {
    event.stopPropagation();
    // Разворачиваем карту средствами страницы: системный полноэкранный режим
    // браузера не используем, иначе Chrome показывает свою подсказку о выходе
    mapState.fullscreen = !mapState.fullscreen;
    redrawMap();

    if (mapState.fullscreen) {
      // Своя запись в истории: системная «назад» сначала свернёт карту
      history.pushState({ fullscreen: true }, '');
    } else if (history.state && history.state.fullscreen) {
      // Вышли кнопкой: убираем лишнюю запись, не меняя экран
      ignoreNextPop = true;
      history.back();
    }
  });
}

/** Перерисовывает ту карту, что сейчас на экране: дистанции или группы. */
function redrawMap() {
  const box = mapState.box;
  if (!box) return;

  box.textContent = '';
  box.classList.toggle('fullscreen', Boolean(mapState.fullscreen));
  drawMap(box);

  if (mapState.coords) {
    const coords = document.createElement('span');
    coords.className = 'map-coords';
    coords.textContent = mapState.coords;
    box.append(coords);
  }

  addMapChrome(box);
}

/** Жесты карты: щипок меняет масштаб сразу, перетаскивание сдвигает центр. */
function bindMapGestures(box) {
  if (box.dataset.gestures === 'on') return;
  box.dataset.gestures = 'on';

  const pointers = new Map();
  let startDistance = 0;
  let startZoom = 0;
  let startCenter = null;
  let startMiddle = null;
  let lastRender = 0;

  const distance = () => {
    const values = [...pointers.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  };

  const middle = () => {
    const values = [...pointers.values()];
    if (values.length < 2) return { x: 0, y: 0 };
    return { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 };
  };

  const renderThrottled = () => {
    const now = Date.now();
    if (now - lastRender < 80) return;
    lastRender = now;
    redrawMap();
  };

  box.addEventListener('pointerdown', (event) => {
    box.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      startMiddle = { x: event.clientX, y: event.clientY };
      startCenter = mapState.center ? { ...mapState.center } : null;
    }
    if (pointers.size === 2) {
      startDistance = distance();
      startZoom = mapState.zoom || 16;
      startCenter = mapState.center ? { ...mapState.center } : null;
    }
  });

  box.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Щипок: масштаб меняется на ходу, а не только после отпускания
    if (pointers.size >= 2 && startDistance > 0) {
      const ratio = distance() / startDistance;
      const zoom = Math.min(19, Math.max(3, Math.round(startZoom + Math.log2(ratio || 1))));
      if (zoom !== mapState.zoom) {
        mapState.zoom = zoom;
        renderThrottled();
      }
    }
  });

  const finish = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    // Щипок закончился: фиксируем масштаб по последнему расстоянию
    if (pointers.size < 2 && startDistance > 0) {
      startDistance = 0;
      startMiddle = null;
      startCenter = null;
      renderThrottled();
      return;
    }

    // Перетаскивание закончилось
    if (pointers.size === 0 && startCenter && startMiddle) {
      const zoom = mapState.zoom || 16;
      const scale = 256 * Math.pow(2, zoom);
      const dx = startMiddle.x - event.clientX;
      const dy = startMiddle.y - event.clientY;
      if (dx || dy) {
        const lon = startCenter.longitude + (dx / scale) * 360;
        const latRad = (startCenter.latitude * Math.PI) / 180;
        const mercator = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        const newMercator = mercator - (dy / scale) * 2 * Math.PI;
        const lat = ((2 * Math.atan(Math.exp(newMercator)) - Math.PI / 2) * 180) / Math.PI;
        mapState.center = { latitude: lat, longitude: lon };
        redrawMap();
      }
      startMiddle = null;
      startCenter = null;
    }
  };

  box.addEventListener('pointerup', finish);
  box.addEventListener('pointercancel', finish);

  box.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoom = (mapState.zoom || 16) + (event.deltaY < 0 ? 1 : -1);
    mapState.zoom = Math.min(19, Math.max(3, zoom));
    redrawMap();
  }, { passive: false });
}

/**
 * Подпись пункта на карте, как checkPointOrderLabel в приложении:
 * «1 - 31» — номер по порядку, дефис, код двумя знаками; у рогейна — код.
 */
function mapLabelOf(point, order) {
  const code = String(codeOf(point));

  // Номер по порядку получают только контрольные пункты (31…99), как
  // routeOrderNumbers: у старта, финиша и служебных кодов подписи нет
  if (!rogaineMode()) {
    let position = 0;
    const numbers = [];
    order.forEach((value) => {
      const numeric = Number(value);
      const isCheckpoint = numeric >= 31 && numeric <= 99;
      if (isCheckpoint) {
        position += 1;
        if (String(value) === code) numbers.push(position);
      }
    });
    if (!numbers.length) return null;
    return numbers.join('/') + ' - ' + code.padStart(2, '0');
  }

  // Рогейн: подпись — сам код, старт и финиш без подписи
  const start = isStart(code, true);
  const finish = isFinish(code, true);
  return start || finish ? null : code;
}

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

  // Масштаб и центр: если пользователь уже двигал карту — берём его значения,
  // иначе подбираем по границам и запоминаем
  let finalZoom = zoom;
  let finalCenter = { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 };
  if (mapState.zoom && mapState.center) {
    finalZoom = mapState.zoom;
    finalCenter = mapState.center;
  } else {
    mapState.zoom = finalZoom;
    mapState.center = finalCenter;
  }

  const scale = 256 * Math.pow(2, finalZoom);
  const project = projectAt(finalZoom);
  zoom = finalZoom;
  const center = project(finalCenter.latitude, finalCenter.longitude);
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
  const routeVisible = mapState.showRoute
    && !(current.distance && current.distance.routeVisible === false);
  // Линия маршрута: красная, 1.6, круглые концы, каждый отрезок укорочен
  // на радиус значка (14) с обеих сторон — как RouteLineOverlay
  const MARKER_RADIUS = 14;
  if (routeVisible && order.length > 1) {
    const startCode = rogaineMode() ? '01' : '1';
    const hasStartInOrder = order.some((code) => String(code) === startCode);
    const hasStartPoint = points.some((point) => String(codeOf(point)) === startCode);
    const routeCodes = (!hasStartInOrder && hasStartPoint) ? [startCode, ...order] : order;

    const route = routeCodes
      .map((code) => points.find((point) => String(codeOf(point)) === String(code)))
      .filter(Boolean);

    for (let index = 0; index + 1 < route.length; index++) {
      const from = positionOf(route[index]);
      const to = positionOf(route[index + 1]);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (length <= MARKER_RADIUS * 2) continue;

      const ux = dx / length;
      const uy = dy / length;
      const segment = document.createElementNS(svgNS, 'line');
      segment.setAttribute('x1', String(from.x + ux * MARKER_RADIUS));
      segment.setAttribute('y1', String(from.y + uy * MARKER_RADIUS));
      segment.setAttribute('x2', String(to.x - ux * MARKER_RADIUS));
      segment.setAttribute('y2', String(to.y - uy * MARKER_RADIUS));
      segment.setAttribute('stroke', '#c62828');
      segment.setAttribute('stroke-width', '1.6');
      segment.setAttribute('stroke-linecap', 'round');
      svg.append(segment);
    }
  }

  points.forEach((point) => {
    const { x, y } = positionOf(point);
    const code = String(codeOf(point));
    const start = isStart(code, rogaineMode());
    const finish = isFinish(code, rogaineMode());
    const radius = 14;

    if (start) {
      // Вершина смотрит на первый пункт маршрута, если направление известно
      const routeNext = order
        .map((code) => points.find((item) => String(codeOf(item)) === String(code)))
        .filter(Boolean)
        .find((item) => item !== point);
      const direction = routeNext
        ? bearingDegrees(point.latitude, point.longitude, routeNext.latitude, routeNext.longitude)
        : null;

      const triangle = document.createElementNS(svgNS, 'polygon');
      triangle.setAttribute('points', `${x},${y - radius} ${x - radius},${y + radius} ${x + radius},${y + radius}`);
      if (direction !== null) triangle.setAttribute('transform', `rotate(${direction} ${x} ${y})`);
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

    const markerLabel = mapState.labels
      ? mapState.labels.get(String(code))
      : mapLabelOf(point, order);
    if (!markerLabel) return;

    // Номер справа от окружности: белая обводка, чтобы читался на карте
    const halo = document.createElementNS(svgNS, 'text');
    halo.setAttribute('x', String(x + radius + 5));
    halo.setAttribute('y', String(y + 5));
    halo.setAttribute('font-size', '15');
    halo.setAttribute('font-weight', 'bold');
    halo.setAttribute('fill', '#ffffff');
    halo.setAttribute('stroke', '#ffffff');
    halo.setAttribute('stroke-width', '3');
    halo.textContent = markerLabel;

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(x + radius + 5));
    label.setAttribute('y', String(y + 5));
    label.setAttribute('font-size', '15');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', '#c62828');
    label.textContent = markerLabel;

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

/** Время в сплитах: ноль показывается как 0:00. */
function formatSplitTime(millis) {
  const value = Number.isFinite(millis) ? Math.max(0, millis) : 0;
  const total = Math.floor(value / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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

  const starts = startAliasCodes(distance);
  const route = (distance.order || []).map((code) => String(code))
    .filter((code) => !starts.has(code) && !isFinish(code, false));
  if (!route.length) return 'OK';

  const taken = row.marks
    .map((mark) => String(mark.code))
    .filter((code) => !starts.has(code) && !isFinish(code, false));

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
 * Экран «Сплит участника» — как в приложении.
 *
 * Сверху сводка (дистанция, ник, время старта и финиша, результат, место),
 * ниже таблица «№ п/п | Время отметки (номер КП)»: у пункта номер по порядку,
 * время этапа и накопленное время. Старт и финиш — без номера.
 */
function openParticipant(row, rogaine) {
  const distance = (state.event && state.event.distance) || {};

  const summary = $('participantSummary');
  summary.textContent = '';
  const summaryRow = (label, value) => {
    const line = document.createElement('div');
    line.className = 'line';
    const left = document.createElement('span');
    left.textContent = label;
    const right = document.createElement('span');
    right.textContent = value;
    line.append(left, right);
    summary.append(line);
  };

  summaryRow('Дистанция', distance.name || '—');
  summaryRow('Ник', row.nick);
  if (row.startTime) summaryRow('Время старта', formatClock(row.startTime));
  if (row.finishTime) summaryRow('Время финиша', formatClock(row.finishTime));
  summaryRow('Результат', formatDuration(row.elapsed));
  if (row.place) summaryRow('Место', String(row.place));

  const list = $('participantMarks');
  list.textContent = '';
  const marks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));

  const starts = startAliasCodes(distance);
  let number = 0;
  let previous = null;

  marks.forEach((mark) => {
    const code = String(mark.code);
    const startPoint = starts.has(code);
    const finishPoint = isFinish(code, rogaine);
    const leg = previous === null ? null : mark.time - previous;

    let label;
    if (startPoint) {
      label = '(Старт)';
    } else if (finishPoint) {
      label = '(Финиш)';
    } else {
      number += 1;
      label = `(${code})`;
    }

    const item = document.createElement('div');
    item.className = 'split-row';

    const num = document.createElement('span');
    num.className = 'split-number';
    num.textContent = startPoint || finishPoint ? '' : number + '.';

    const value = document.createElement('span');
    value.className = 'split-value';

    const first = document.createElement('span');
    first.className = 'split-line';
    first.textContent = leg === null ? label : `${label} ${formatSplitTime(leg)}`;

    const second = document.createElement('span');
    second.className = 'split-line total';
    const elapsed = row.startTime && mark.time ? mark.time - row.startTime : 0;
    second.textContent = formatSplitTime(elapsed);

    value.append(first, second);
    item.append(num, value);
    list.append(item);

    previous = mark.time;
  });

  showTab('participant');
}

/* ─────────────────────────── отметки ─────────────────────────── */

/**
 * Коды, которые считаются стартом.
 *
 * Старт и «место старта» — одна точка: кроме кода старта сюда попадают пункты,
 * стоящие в тех же координатах (у события старт может быть записан как
 * обычный пункт, например кодом 3).
 */
function startAliasCodes(distance) {
  const codes = new Set([rogaineMode() ? '01' : '1']);
  const lat = Number((distance || {}).latitude);
  const lon = Number((distance || {}).longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon)) {
    ((distance || {}).points || []).forEach((point) => {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
      if (distanceMeters(lat, lon, point.latitude, point.longitude) < 3) {
        codes.add(String(codeOf(point)));
      }
    });
  }
  return codes;
}

/** Как отмечаются в этой дистанции: «QR» или «GPS» (MarkMode в приложении). */
function qrMode() {
  const distance = (state.event && state.event.distance) || {};
  return String(distance.markMode || '').toUpperCase() === 'QR';
}

function rogaineMode() {
  return Boolean(state.event && state.event.kind === 'rogaine');
}

/** Подпись пункта по правилам Labels.kt: «Старт», «Финиш» или код. */
function labelOf(point) {
  const code = codeOf(point);
  if (isStart(code, rogaineMode())) return 'Старт';
  if (isFinish(code, rogaineMode())) return 'Финиш';
  return String(code);
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

  // Автоматическая отметка: у пункта записываем сами, как в приложении
  const currentSettings = settings();
  if (currentSettings.autoMark && candidate) {
    const code = codeOf(candidate);
    if (state.autoMarked !== code) {
      state.autoMarked = code;
      markByCode(code);
    }
  } else if (!candidate) {
    state.autoMarked = null;
  }
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

  if (isFinish(code, rogaineMode()) && settings().autoSend
    && identity().nick && identity().code.length >= 6) {
    sendResult();
  }
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

  // В Chrome на Android есть встроенный BarcodeDetector, в Safari его нет —
  // там работает резервный декодер jsQR
  const native = 'BarcodeDetector' in window;
  if (!native && typeof jsQR === 'undefined') {
    setStatus('Камера есть, но читать QR этот браузер не умеет', 'error');
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      qrStream = stream;
      video.srcObject = stream;
      video.play().catch(() => {});
      if (native) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        qrTimer = setInterval(() => detectOnce(detector, video), 500);
      } else {
        qrTimer = setInterval(() => detectWithJsQr(video), 500);
      }
    })
    .catch(() => setStatus('Камера недоступна: проверьте разрешение', 'error'));
}

/** Резервный путь для iPhone: кадр в canvas и разбор через jsQR. */
const qrCanvas = document.createElement('canvas');

function detectWithJsQr(video) {
  if (qrBusy || !video.videoWidth) return;
  qrBusy = true;

  const width = Math.min(640, video.videoWidth);
  const height = Math.round(video.videoHeight * (width / video.videoWidth));
  qrCanvas.width = width;
  qrCanvas.height = height;
  const context = qrCanvas.getContext('2d');
  context.drawImage(video, 0, 0, width, height);

  try {
    const image = context.getImageData(0, 0, width, height);
    const found = jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' });
    qrBusy = false;
    if (found && found.data) handleQrText(found.data);
  } catch (error) {
    qrBusy = false;
  }
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

  if (finish && settings().autoSend && identity().nick && identity().code.length >= 6) {
    sendResult();
  }
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
  const current = settings();
  if (current.sound) try {
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
  if (current.vibration && navigator.vibrate) navigator.vibrate(60);
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

  $('openSettings').addEventListener('click', openSettings);
  $('settingsBack').addEventListener('click', () => showTab('events'));

  document.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      updateSetting('theme', chip.dataset.theme);
      renderSettings();
    });
  });
  $('setLarge').addEventListener('change', (event) => updateSetting('large', event.target.checked));
  $('setShowOnStart').addEventListener('change', (event) => updateSetting('showOnStart', event.target.checked));
  $('setAutoMark').addEventListener('change', (event) => updateSetting('autoMark', event.target.checked));
  $('setAutoSend').addEventListener('change', (event) => updateSetting('autoSend', event.target.checked));
  $('setSound').addEventListener('change', (event) => updateSetting('sound', event.target.checked));
  $('setVibration').addEventListener('change', (event) => updateSetting('vibration', event.target.checked));
  $('settingsReset').addEventListener('click', () => {
    if (!window.confirm('Вернуть настройки к значениям по умолчанию?')) return;
    saveSettings(Object.assign({}, DEFAULT_SETTINGS));
    renderSettings();
    setStatus('Настройки сброшены', 'good');
  });

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
  $('profileSignOut').addEventListener('click', openSignOutDialog);
  $('detailMarksButton').addEventListener('click', openMyProgress);
  $('detailDelete').addEventListener('click', () => {
    if (state.event) openDeleteDialog(state.event.id);
  });
  $('groupDelete').addEventListener('click', () => {
    const group = readJson(STORAGE.group, null);
    const items = (group && group.items) || [];
    if (!items.length) return;
    openGroupDeleteDialog(items[0].groupId || '');
  });
  $('detailActivate').addEventListener('click', () => {
    if (state.activeId === state.event.id) {
      openDeactivateDialog();
    } else {
      activateDistance();
    }
  });
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

  // Отладка веба: если профиль не заведён, подставляем профиль приложения,
  // чтобы работать так, как будто вход уже выполнен
  // Отладка: профиль приложения подставляется ОДИН раз, чтобы выход из
  // профиля не отменялся сам собой при следующем запуске
  const seeded = readJson('osport.lite.seeded', false);
  const seededIdentity = readJson(STORAGE.identity, null);
  if (!seeded && (!seededIdentity || !seededIdentity.code
    || String(seededIdentity.code).length < 6)) {
    writeJson(STORAGE.identity, { nick: 'Серёга Евс', code: 'ABCHLFLJQKPP' });
  }
  // Признак ставим и тогда, когда профиль уже был: выход не должен
  // отменяться подстановкой при следующем запуске
  if (!seeded) writeJson('osport.lite.seeded', true);

  const saved = readJson(STORAGE.identity, { nick: '', code: '' });
  $('nick').value = saved.nick || '';
  $('code').value = saved.code || '';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Уход из приложения (сворачивание, выгрузка вкладки): сохраняем всё сразу
function flushState() {
  if (!state.event) return;
  writeJson(STORAGE.event, state.event);
  if (state.activeId) writeJson(STORAGE.active, state.activeId);
  saveMarks();
}

window.addEventListener('pagehide', flushState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushState();
});

// Системная кнопка «назад»: на предыдущий экран
window.addEventListener('popstate', () => {
  // Выход кнопкой из полного экрана: экран не меняется
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }

  // «Назад» в полном экране сворачивает карту и оставляет тот же экран
  if (mapState.fullscreen) {
    mapState.fullscreen = false;
    redrawMap();
    history.pushState({ depth: navStack.length }, '');
    return;
  }

  if (navStack.length > 1) navStack.pop();
  const previous = navStack[navStack.length - 1] || 'events';
  showTab(previous, { push: false });
});

document.addEventListener('DOMContentLoaded', () => {
  bind();
  registerServiceWorker();
  // Выбор карты запоминается, как в приложении
  loadMapKind();
  applySettings();

  state.history = loadHistory();
  // Активация и отметки переживают перезапуск и перезагрузку телефона:
  // активной считается дистанция из STORAGE.active, даже если последней
  // открывали другую
  state.activeId = readJson(STORAGE.active, null);

  let saved = readJson(STORAGE.event, null);
  if (state.activeId && (!saved || saved.id !== state.activeId)) {
    const activeSaved = readJson(STORAGE.event + '.' + state.activeId, null);
    const fromHistory = (state.history || []).find((item) => item.id === state.activeId);
    const candidate = (activeSaved && activeSaved.distance)
      ? activeSaved
      : (fromHistory
        ? {
          id: fromHistory.id,
          kind: fromHistory.kind,
          distance: fromHistory.distance,
          entry: fromHistory.entry,
        }
        : null);
    if (candidate) {
      saved = candidate;
      writeJson(STORAGE.event, candidate);
    }
  }

  if (saved && saved.distance) {
    state.event = saved;
    state.marks = loadMarks(saved.id);
    updateSendState();
  }
  // «Открывать экран отметки при запуске» — как в приложении
  const activeRestored = saved && saved.distance && state.activeId === saved.id;
  const first = activeRestored && settings().showOnStart ? 'mark' : 'events';
  navStack = [first];
  history.replaceState({ depth: 1 }, '');
  showTab(first, { push: false });
});
