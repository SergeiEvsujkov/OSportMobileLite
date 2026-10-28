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
  $('detailScreen').classList.toggle('hidden', name !== 'detail');
  $('cloudScreen').classList.toggle('hidden', name !== 'cloud');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  $('tabEvents').classList.toggle('active',
    name === 'events' || name === 'cloud' || name === 'detail');
  $('tabMark').classList.toggle('active', name === 'mark');
  $('tabProfile').classList.toggle('active', name === 'profile');

  if (name === 'mark') {
    startWatch();
    renderMark();
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
  const entries = cloudEntries.filter(
    (entry) => !filter || String(entry.number || '').startsWith(filter)
  );

  $('cloudHint').textContent = entries.length === 0
    ? 'Ничего не найдено'
    : `Событий в облаке: ${entries.length}`;

  const list = $('cloudList');
  list.textContent = '';

  entries.forEach((entry) => {
    const item = document.createElement('button');
    item.className = 'cloud-item';

    const body = document.createElement('div');
    body.className = 'body';

    const title = document.createElement('span');
    title.className = 'name';
    title.textContent = (entry.number ? `№ ${entry.number}  ` : '') + (entry.name || 'Без названия');

    const period = document.createElement('span');
    period.className = 'period';
    period.textContent = formatDate(entry.startTime) + ' - ' + formatDate(entry.finishTime);

    const details = document.createElement('span');
    details.className = 'line';
    const parts = [];
    if (entry.kind === 'rogaine') {
      if (entry.checkPointCount) parts.push(`Количество КП: ${entry.checkPointCount}`);
      if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
    } else {
      if (entry.lengthMeters) parts.push(`Длина: ${entry.lengthMeters} м`);
      if (entry.checkPointCount) parts.push(`КП: ${entry.checkPointCount}`);
    }
    if (entry.participants) parts.push(`Участников: ${entry.participants}`);
    details.textContent = parts.join(' · ');

    const author = document.createElement('span');
    author.className = 'line muted';
    author.textContent = entry.organizer || 'Автор не указан';

    body.append(title, period, details, author);

    const downloaded = state.history.some((saved) => saved.id === entry.id);
    const action = document.createElement('span');
    action.className = 'action';
    action.innerHTML = downloaded
      ? '<svg class="icon"><use href="icons.svg#check"></use></svg>'
      : '<svg class="icon"><use href="icons.svg#download"></use></svg>';

    item.append(body, action);
    // Уже скачанное не загружаем заново: сразу активируем и открываем отметку
    item.addEventListener('click', () => {
      if (downloaded) {
        activateEvent(entry.id);
      } else {
        downloadEvent(entry);
      }
    });
    list.append(item);
  });
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
  rows.append(detailRow(`Количество КП: ${points.length}`));
  if (event.kind === 'rogaine') {
    if (distance.maxScore) rows.append(detailRow(`Макс. балл: ${distance.maxScore}`));
  } else if (distance.longInMeters) {
    rows.append(detailRow(`Дистанция: ${distance.longInMeters} м`));
  }
  rows.append(detailRow(entry.mapExt ? 'Карта: есть' : 'Карта: нет'));

  $('detailSend').disabled = !state.marks.some((mark) => mark.finish);
}

/* ─────────────────────────── отметки ─────────────────────────── */

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
  $('markTitle').textContent = distance.name || 'Событие';

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
  if (!point || !state.event) return;

  const period = periodState(state.event.distance);
  if (period !== 'OK') {
    setStatus(period === 'BEFORE' ? 'Проведение ещё не началось' : 'Время проведения закончилось', 'error');
    return;
  }

  const code = codeOf(point);
  if (isFinish(code, rogaineMode()) && !state.marks.some((mark) => mark.start)) {
    setStatus('Сначала отметьте старт', 'error');
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
  setStatus(`Отметка записана: ${labelOf(point)}`, 'good');
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
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
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

  $('detailBack').addEventListener('click', () => showTab('events'));
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

  state.history = loadHistory();
  const saved = readJson(STORAGE.event, null);
  if (saved && saved.distance) {
    state.event = saved;
    state.marks = loadMarks(saved.id);
    updateSendState();
  }
  showTab('events');
});
