/**
 * OSportMobile Lite — участник: нашёл событие, скачал, отметился, отправил.
 *
 * Всё хранится на устройстве (localStorage): событие, отметки, кто отправляет.
 * Создавать и править события нельзя — это только прохождение.
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
  event: null,       // { id, kind, key, distance }
  marks: [],
  position: null,    // { lat, lon, accuracy }
  watchId: null,
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

function loadSavedEvent() {
  return readJson(STORAGE.event, null);
}

function saveMarks() {
  if (!state.event) return;
  writeJson(marksKey(state.event.id), state.marks);
}

function loadMarks() {
  if (!state.event) return [];
  return readJson(marksKey(state.event.id), []);
}

/* ─────────────────────────── облако ─────────────────────────── */

function setStatus(text, isError = false) {
  const node = $('status');
  node.textContent = text;
  node.classList.toggle('error', isError);
}

function formatPeriod(start, finish) {
  if (!start || !finish) return '';
  const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return `${new Date(start).toLocaleString('ru-RU', options)} — ${new Date(finish).toLocaleString('ru-RU', options)}`;
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
    const reason = parsed && parsed.reason ? `: ${parsed.reason}` : '';
    throw new Error((parsed && parsed.error ? parsed.error : `Ошибка ${response.status}`) + reason);
  }
  return parsed;
}

/* ─────────────────────────── событие ─────────────────────────── */

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
  $('eventHint').textContent = 'Скачивание сохраняет событие на устройстве: после этого его можно пройти без сети.';
}

function openMarks(event) {
  saveEvent(event);
  state.marks = loadMarks();
  $('markCard').classList.remove('hidden');
  $('openMark').disabled = false;
  renderMarks();
  startWatch();
}

/* ─────────────────────────── отметки ─────────────────────────── */

function rogaineMode() {
  return Boolean(state.event && state.event.kind === 'rogaine');
}

function eventStartCode() {
  return rogaineMode() ? START_CODE_ROGAINE : START_CODE;
}

function eventFinishCode() {
  return rogaineMode() ? FINISH_CODE_ROGAINE : FINISH_CODE;
}

function eventPeriodState() {
  const distance = state.event && state.event.distance;
  return distance ? periodState(distance) : 'OK';
}

function markStart() {
  if (eventPeriodState() !== 'OK') {
    setStatus('Сейчас вне промежутка проведения — отметиться нельзя', true);
    return;
  }
  if (state.marks.some((mark) => mark.start)) {
    setStatus('Старт уже отмечен');
    return;
  }
  state.marks.push({ code: eventStartCode(), time: Date.now(), start: true });
  saveMarks();
  renderMarks();
  setStatus('Старт отмечен');
}

function markFinish() {
  if (!state.marks.some((mark) => mark.start)) {
    setStatus('Сначала отметьте старт', true);
    return;
  }
  if (state.marks.some((mark) => mark.finish)) {
    setStatus('Финиш уже отмечен');
    return;
  }
  if (eventPeriodState() === 'BEFORE') {
    setStatus('Время проведения ещё не наступило', true);
    return;
  }
  state.marks.push({ code: eventFinishCode(), time: Date.now(), finish: true });
  saveMarks();
  renderMarks();
  setStatus('Финиш отмечен — можно отправлять результат');
}

function markPoint(point) {
  if (!state.marks.some((mark) => mark.start)) {
    setStatus('Сначала отметьте старт', true);
    return;
  }
  if (state.marks.some((mark) => mark.finish)) {
    setStatus('Вы уже финишировали', true);
    return;
  }
  if (eventPeriodState() !== 'OK') {
    setStatus('Сейчас вне промежутка проведения — отметиться нельзя', true);
    return;
  }
  const verdict = canMark(point, state.position);
  if (!verdict.ok) {
    setStatus(verdict.reason, true);
    return;
  }
  const code = codeOf(point);
  state.marks.push({ code, time: Date.now(), start: false, finish: false });
  saveMarks();
  renderMarks();
  setStatus(`Пункт ${code} отмечен`);
}

function renderMarks() {
  const event = state.event;
  if (!event) return;
  const distance = event.distance || {};
  const points = distance.points || [];
  const order = distance.order || [];

  const startMark = state.marks.find((mark) => mark.start);
  const finishMark = state.marks.find((mark) => mark.finish);
  const marked = new Set(
    state.marks.filter((mark) => !mark.start && !mark.finish).map((mark) => String(mark.code))
  );

  const parts = [];
  if (startMark) parts.push(`старт ${new Date(startMark.time).toLocaleTimeString('ru-RU')}`);
  parts.push(`отмечено ${marked.size} из ${points.length}`);
  if (finishMark) parts.push(`финиш ${new Date(finishMark.time).toLocaleTimeString('ru-RU')}`);
  $('marksSummary').textContent = parts.join(' · ');

  const period = eventPeriodState();
  $('markPeriod').textContent =
    period === 'OK' ? 'Промежуток проведения идёт'
      : period === 'BEFORE' ? 'Проведение ещё не началось'
        : 'Время проведения закончилось';

  $('markStart').disabled = Boolean(startMark);
  $('markFinish').disabled = !startMark || Boolean(finishMark);
  $('sendCard').classList.toggle('hidden', !finishMark);

  const list = $('pointsList');
  list.textContent = '';
  points
    .filter((point) => !isStart(codeOf(point), rogaineMode()) && !isFinish(codeOf(point), rogaineMode()))
    .forEach((point) => {
      const code = codeOf(point);
      const done = marked.has(code);
      const orderIndex = order.findIndex((value) => String(value) === code);

      const row = document.createElement('div');
      row.className = 'point' + (done ? ' done' : '');

      const label = document.createElement('span');
      label.className = 'code';
      label.textContent = orderIndex >= 0 ? `${orderIndex + 1}. №${code}` : `№${code}`;

      const stateText = document.createElement('span');
      stateText.className = 'state';
      stateText.textContent = done ? 'отмечен' : '';

      const button = document.createElement('button');
      button.className = 'button secondary';
      button.textContent = done ? 'отмечен' : 'Отметить';
      button.disabled = done;
      button.addEventListener('click', () => markPoint(point));

      row.append(label, stateText, button);
      list.append(row);
    });
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
      $('markPosition').textContent =
        `GPS: погрешность ${Math.round(position.coords.accuracy)} м` +
        ` · ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    },
    (error) => {
      $('markPosition').textContent = 'GPS недоступен: ' + error.message;
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
}

/* ─────────────────────────── отправка ─────────────────────────── */

function readIdentity() {
  return readJson(STORAGE.identity, { nick: '', code: '' });
}

function saveIdentity(identity) {
  writeJson(STORAGE.identity, identity);
}

async function sendResult() {
  const identity = {
    nick: $('nick').value.trim(),
    code: $('code').value.trim().toUpperCase(),
  };
  if (!identity.nick) {
    setStatus('Укажите ник', true);
    return;
  }
  if (identity.code.length < 6) {
    setStatus('Укажите код профиля (он в приложении на вкладке «Профиль»)', true);
    return;
  }
  saveIdentity(identity);

  const event = state.event;
  const result = buildResult(event.distance, state.marks, identity);
  const payload = Object.assign({}, event.distance, { results: [result] });

  setStatus('Отправляю результат…');
  try {
    await callFunction('action=result&key=' + encodeURIComponent(event.key), payload);
    setStatus('Результат отправлен');
    $('send').disabled = true;
  } catch (error) {
    setStatus(error.message, true);
  }
}

/* ─────────────────────────── запуск ─────────────────────────── */

function bind() {
  $('find').addEventListener('click', async () => {
    const number = $('number').value.trim();
    if (!number) {
      setStatus('Введите номер события', true);
      return;
    }
    setStatus('Ищу событие…');
    try {
      await findByNumber(number);
      setStatus('');
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  $('number').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('find').click();
  });

  $('download').addEventListener('click', async () => {
    const entry = state.entry;
    if (!entry) return;
    setStatus('Скачиваю событие…');
    try {
      const data = await callFunction('action=get&id=' + encodeURIComponent(entry.id));
      if (!data.distance) throw new Error('Сервис не отдал событие');
      const key = 'distances/' + entry.id + (data.kind === 'rogaine' ? '.rogaine' : '.osport');
      openMarks({ id: entry.id, kind: data.kind, key, distance: data.distance });
      setStatus('Событие скачано');
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  $('openMark').addEventListener('click', () => {
    if (state.event) {
      $('markCard').classList.remove('hidden');
      startWatch();
    }
  });

  $('markStart').addEventListener('click', markStart);
  $('markFinish').addEventListener('click', markFinish);
  $('send').addEventListener('click', sendResult);

  const identity = readIdentity();
  $('nick').value = identity.nick || '';
  $('code').value = identity.code || '';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  registerServiceWorker();
  $('version').textContent = 'каркас 0.3';

  const saved = loadSavedEvent();
  if (saved && saved.distance) {
    state.event = saved;
    state.marks = loadMarks();
    $('markCard').classList.remove('hidden');
    $('openMark').disabled = false;
    renderMarks();
  }
});
