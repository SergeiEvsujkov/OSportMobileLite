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
  $('cloudScreen').classList.toggle('hidden', name !== 'cloud');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  $('tabEvents').classList.toggle('active', name === 'events' || name === 'cloud');
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
function renderHome() {
  const list = $('eventsList');
  list.textContent = '';

  // Одно событие может содержать несколько дистанций — показываем их вместе
  const groups = new Map();
  state.history.forEach((item) => {
    const number = item.entry && item.entry.number ? String(item.entry.number) : item.id;
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push(item);
  });

  $('homeHint').classList.toggle('hidden', groups.size > 0);

  [...groups.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([number, items]) => {
      const first = items[0].entry || {};
      const card = document.createElement('div');
      card.className = 'event-card';

      const head = document.createElement('div');
      head.className = 'event-head';

      const icon = document.createElement('span');
      icon.className = 'event-icon';
      icon.textContent = items[0].kind === 'rogaine' ? '🥾' : '🗺';

      const title = document.createElement('span');
      title.className = 'event-title';
      title.textContent = (number && number !== items[0].id ? `№ ${number} ` : '') + (first.name || 'Без названия');

      head.append(icon, title);
      card.append(head);

      const period = document.createElement('p');
      period.className = 'event-meta';
      period.textContent = formatDate(first.startTime) + ' - ' + formatDate(first.finishTime);
      if (first.startTime) card.append(period);

      const author = document.createElement('p');
      author.className = 'event-meta';
      author.textContent = first.organizer || 'Автор не указан';
      card.append(author);

      items.forEach((item) => {
        const entry = item.entry || {};
        const inner = document.createElement('div');
        inner.className = 'distance-card';

        const line = document.createElement('p');
        line.className = 'distance-line';
        const parts = [];
        if (item.kind === 'rogaine') {
          if (entry.checkPointCount) parts.push(`КП: ${entry.checkPointCount}`);
          if (entry.maxScore) parts.push(`Макс. балл: ${entry.maxScore}`);
        } else {
          if (entry.lengthMeters) parts.push(`Дистанция: ${entry.lengthMeters} м`);
          if (entry.checkPointCount) parts.push(`КП: ${entry.checkPointCount}`);
        }
        parts.push(`Участников: ${entry.participants || 0}`);
        line.textContent = parts.join(' · ');

        const map = document.createElement('p');
        map.className = 'distance-line';
        map.textContent = entry.hasMap ? 'Карта: есть' : 'Карта: нет';

        const icons = document.createElement('div');
        icons.className = 'distance-icons';
        icons.textContent = '◎ 👤';

        inner.append(line, map, icons);
        inner.addEventListener('click', () => activateEvent(item.id));
        card.append(inner);
      });

      list.append(card);
    });
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
    action.textContent = downloaded ? '✓' : '⤓';

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

    state.event = event;
    state.marks = loadMarks(entry.id);
    setStatus('');
    updateSendState();
    showTab('events');
  } catch (error) {
    setStatus(error.message, 'error');
  }
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
