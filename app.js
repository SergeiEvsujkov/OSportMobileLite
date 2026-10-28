/**
 * OSportMobile Lite — участник: нашёл событие, скачал, отметился, отправил.
 *
 * Экран отметки повторяет приложение: название события, погрешность, режим
 * отметки, большой круг по центру и подсказка внизу. Круг красный, пока пункт
 * далеко, и зелёный, когда можно отмечаться.
 */

const CONFIG = {
  functionUrl: 'https://functions.yandexcloud.net/d4eebmhdf007eak5nkbo',
};

const $ = (id) => document.getElementById(id);

const STORAGE = {
  event: 'osport.lite.event',
  marks: 'osport.lite.marks',
  identity: 'osport.lite.identity',
};

const state = {
  entry: null,
  event: null,
  marks: [],
  position: null,
  watchId: null,
  candidate: null,
  tab: 'events',
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

function saveEvent(event) {
  state.event = event;
  writeJson(STORAGE.event, event);
}

function saveMarks() {
  if (state.event) writeJson(marksKey(state.event.id), state.marks);
}

function loadMarks() {
  return state.event ? readJson(marksKey(state.event.id), []) : [];
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

/* ─────────────────────────── вкладки ─────────────────────────── */

function showTab(name) {
  state.tab = name;
  $('homeScreen').classList.toggle('hidden', name !== 'events');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  for (const [id, tab] of [['tabEvents', 'events'], ['tabMark', 'mark'], ['tabProfile', 'profile']]) {
    $(id).classList.toggle('active', name === tab);
  }

  if (name === 'mark') {
    startWatch();
    renderMark();
  }
  if (name === 'profile') {
    updateSendState();
  }
}

/* ─────────────────────────── событие ─────────────────────────── */

function formatPeriod(start, finish) {
  if (!start || !finish) return '';
  const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return `${new Date(start).toLocaleString('ru-RU', options)} — ${new Date(finish).toLocaleString('ru-RU', options)}`;
}

async function findByNumber(number) {
  const data = await callFunction('action=list&full=1&rogaine=1');
  const entries = data.entries || [];
  const found = entries.find((entry) => String(entry.number) === String(number));
  if (!found) throw new Error(`Событие с номером ${number} не найдено`);
  state.entry = found;
  renderEntry(found);
}

function renderEntry(entry) {
  $('eventCard').classList.remove('hidden');
  $('eventName').textContent = entry.name || 'Без названия';
  $('eventNumber').textContent = entry.number ? `№ ${entry.number}` : 'без номера';
  $('eventOrganizer').textContent = entry.organizer ? `Организатор: ${entry.organizer}` : 'Организатор не указан';
  $('eventPeriod').textContent = formatPeriod(entry.startTime, entry.finishTime);

  const details = [];
  if (entry.checkPointCount) details.push(`${entry.checkPointCount} КП`);
  if (entry.kind === 'rogaine' && entry.maxScore) details.push(`максимум ${entry.maxScore} баллов`);
  if (entry.kind === 'distance' && entry.lengthMeters) details.push(`${entry.lengthMeters} м`);
  if (entry.participants) details.push(`участников: ${entry.participants}`);
  $('eventDetails').textContent = details.join(' · ');
  $('eventHint').textContent = 'Скачивание сохраняет событие на устройстве: дальше оно работает без сети.';
}

async function downloadEvent() {
  const entry = state.entry;
  if (!entry) return;
  setStatus('Скачиваю событие…');
  try {
    const data = await callFunction('action=get&id=' + encodeURIComponent(entry.id));
    if (!data.distance) throw new Error('Сервис не отдал событие');
    const key = 'distances/' + entry.id + (data.kind === 'rogaine' ? '.rogaine' : '.osport');
    saveEvent({ id: entry.id, kind: data.kind, key, distance: data.distance });
    state.marks = loadMarks();
    // Сообщение о скачивании не показываем: сразу видно сам экран отметки
    setStatus('');
    showTab('mark');
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

/** Пункт, у которого мы сейчас стоим: первый, куда можно отметиться. */
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
    $('markAccuracy').textContent = 'Скачайте событие на вкладке «События».';
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

  if (candidate) {
    setCircle(candidate, labelOf(candidate), true);
  } else {
    setCircle(null, 'Подойдите к пункту', false);
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
  if (!point || !state.event) return;

  const period = periodState(state.event.distance);
  if (period !== 'OK') {
    setStatus(period === 'BEFORE' ? 'Проведение ещё не началось' : 'Время проведения закончилось', 'error');
    return;
  }

  const code = codeOf(point);
  const started = state.marks.some((mark) => mark.start);
  if (isFinish(code, rogaineMode()) && !started) {
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

function saveIdentity() {
  writeJson(STORAGE.identity, identity());
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
  saveIdentity();

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

  $('find').addEventListener('click', async () => {
    const number = $('number').value.trim();
    if (!number) {
      setStatus('Введите номер события', 'error');
      return;
    }
    setStatus('Ищу событие…');
    try {
      await findByNumber(number);
      setStatus('');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  $('number').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('find').click();
  });

  $('download').addEventListener('click', downloadEvent);
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
  showTab('events');

  const saved = readJson(STORAGE.event, null);
  if (saved && saved.distance) {
    state.event = saved;
    state.marks = loadMarks();
    updateSendState();
  }
});
