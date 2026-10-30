/**
 * OSportMobile Lite — участник: выбрал событие в облаке, скачал, отметился, отправил.
 *
 * Главный экран повторяет приложение: карточки событий со вложенными дистанциями.
 * Создания, архива и фильтров нет — lite только проходит.
 */

const CONFIG = {
  // Хранилище, откуда берутся карты дистанций (как DEFAULT_BUCKET в приложении)
  mapBucketUrl: 'https://storage.yandexcloud.net/osport-mobile',
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
  screen: 'osport.lite.screen',   // какой экран был открыт
  vkNames: 'osport.lite.vkNames', // ник по каждому профилю ВК на этом устройстве
  pendingResults: 'osport.lite.pendingResults', // результаты, которые не удалось отправить
};

const state = {
  event: null,
  activeId: null,   // id активированной дистанции
  marks: [],
  position: null,
  watchId: null,
  candidate: null,
  history: [],
  // Экран отметки: подтверждение QR, отказы и аварийная отметка
  pendingQr: null,
  autoQrCode: null,
  outcomeHints: '',
  outcomeUntil: 0,
  autoMarked: null,
  manualRefused: false,
  outcomeTimer: null,
  emergencyKey: null,
  emergencyAt: 0,
  emergencyDismissed: false,
  emergencyPoint: null,
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
  const brief = {
    id: event.id,
    kind: event.kind,
    entry: event.entry,
    groupId: (event.entry && event.entry.groupId) || '',
  };
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
  // Метка времени и no-store: иначе браузер отдаёт прошлый каталог,
  // и изменения в облаке видны не сразу
  const url = `${CONFIG.functionUrl}?${query}&t=${Date.now()}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
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
  // Открытие экрана отметки: сначала чистим отметки по правилам старта и финиша
  if (name === 'mark') {
    sanitizeMarks();
    state.pendingQr = null;
    state.autoQrCode = null;
    state.manualRefused = false;
    state.emergencyKey = null;
    state.emergencyDismissed = false;
  }
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

  // Запоминаем экран: после обновления приложения остаёмся там же, а не на главном
  writeJson(STORAGE.screen, { name, eventId: state.event && state.event.id });

  if (name === 'profile') {
    renderProfileState();
    renderVkOneTap();
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

  // Скачанное — это записи в истории. Сохранённая копия события, которой там
  // нет, считается сиротой (осталась от удалённой группы) и не показывается
  const downloadedIds = new Set((state.history || []).map((item) => item.id));

  const group = readJson(STORAGE.group, null);
  const groupItems = ((group && group.items) || [])
    .filter((item) => downloadedIds.has(item.id));

  const event = state.event;
  const singleItems = event && event.distance && downloadedIds.has(event.id)
    ? [{ id: event.id, kind: event.kind, entry: event.entry, distance: event.distance }]
    : [];

  const items = groupItems.length ? groupItems : singleItems;

  $('homeHint').classList.toggle('hidden', items.length > 0);
  if (!items.length) return;

  const first = items[0].entry || {};
  const card = document.createElement('div');
  card.className = 'event-card';

  const head = document.createElement('div');
  head.className = 'event-head';

  // Значок есть только у группы: у одиночной дистанции логотипа нет
  if (items.length > 1) {
    const icon = document.createElement('span');
    icon.className = 'event-icon';
    const mark = document.createElement('img');
    mark.src = 'icons/group.png';
    mark.alt = '';
    mark.className = 'event-icon-img';
    icon.append(mark);
    head.append(icon);
  }

  const title = document.createElement('span');
  title.className = 'event-title';
  const number = items.length > 1
    ? (group && group.number)
    : (items[0].entry && items[0].entry.number);
  title.textContent = (number ? `№ ${number} ` : '') + (first.name || 'Без названия');
  head.append(title);
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
      if (pendingResultFor(item.id)) inner.append(pendingRow());
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

  // Вся карточка открывает событие: в приложении карточка кликабельна целиком
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => activateItem(item));

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
    if (mine) {
      const places = mine.place ? ` · место ${mine.place}` : '';
      card.append(plainRow(`Мой результат: ${formatDuration(mine.elapsed)}${places}`));
    }
  }
  if (pendingResultFor(item.id)) card.append(pendingRow());

  const authorLine = authorRow(entry, true, true, distance);
  const kindTag = document.createElement('span');
  kindTag.className = 'kind-tag';
  kindTag.textContent = item.kind === 'rogaine' ? 'РОГЕЙН' : '';
  if (kindTag.textContent) authorLine.append(kindTag);
  card.append(authorLine);

  list.append(card);
}

/**
 * Есть ли по записи неотправленный результат.
 *
 * Очередь хранит ключи вида `distances/<id>.osport`, поэтому сверяем по id.
 */
function pendingResultFor(id) {
  const list = readJson(STORAGE.pendingResults, []);
  return list.some((item) => String(item.key || '').includes('/' + id + '.'));
}

/**
 * Одинаковый результат: тот же участник, время и отметки.
 *
 * Ник и время записи не сравниваются — это подпись и служебное поле.
 * Порядок отметок важен: он и есть прохождение.
 */
function sameResult(a, b) {
  if (!a || !b) return false;
  if (String(a.userId) !== String(b.userId)) return false;
  if (Number(a.startTime) !== Number(b.startTime)) return false;
  if (Number(a.finishTime) !== Number(b.finishTime)) return false;
  const left = Array.isArray(a.marks) ? a.marks : [];
  const right = Array.isArray(b.marks) ? b.marks : [];
  if (left.length !== right.length) return false;
  return left.every((mark, index) =>
    String(mark && mark.code) === String(right[index] && right[index].code) &&
    Number(mark && mark.time) === Number(right[index] && right[index].time));
}

/**
 * Сливает результаты облака с локальными.
 *
 * Свои результаты, которых в облаке ещё нет (очередь не отправилась), должны
 * оставаться видимыми: иначе обновление из облака «съедало» бы только что
 * записанный результат.
 */
function mergeResults(cloudResults, localResults) {
  const pending = readJson(STORAGE.pendingResults, []);
  const pendingUsers = new Set(pending.map((item) => String((item.result || {}).userId)));

  // Версия результата: время финиша, у незавершённого — последняя отметка
  const lastMarkTime = (row) => {
    const marks = (row && Array.isArray(row.marks)) ? row.marks : [];
    return marks.reduce((max, mark) => Math.max(max, Number(mark && mark.time) || 0), 0);
  };
  const version = (row) =>
    Number(row && row.finishTime) || lastMarkTime(row) || Number(row && row.updatedAt) || 0;

  // Ключ строки — участник + номер попытки: у «оставлять оба» их несколько
  const attemptOf = (row) => Math.max(1, Number(row && row.attempt) || 1);
  const rowKey = (row) => String(row.userId) + '#' + attemptOf(row);

  const merged = new Map();
  const alreadyThere = (row) =>
    Array.from(merged.values()).some((other) => sameResult(other, row));
  (localResults || []).forEach((row) => {
    if (!row || !row.userId) return;
    // Одинаковый результат второй раз не храним
    if (alreadyThere(row)) return;
    merged.set(rowKey(row), row);
  });
  (cloudResults || []).forEach((row) => {
    if (!row || !row.userId) return;
    const key = String(row.userId);
    // Неотправленный свой результат не затираем никогда
    if (pendingUsers.has(key)) return;
    // И одинаковый результат не добавляем: он уже есть
    if (alreadyThere(row)) return;
    const storageKey = rowKey(row);
    const local = merged.get(storageKey);
    if (!local) {
      merged.set(storageKey, row);
      return;
    }
    if (version(row) >= version(local)) merged.set(storageKey, row);
  });
  return Array.from(merged.values());
}

/**
 * Обновляет скачанное из облака: карточки, результаты и протоколы.
 *
 * Правило одно для ориентирования и рогейна: у обоих запись обновляется
 * целиком из облака, а отметки и активность остаются на устройстве.
 */
async function syncFromCloud() {
  const ids = new Set();
  (state.history || []).forEach((item) => ids.add(item.id));
  const savedGroup = readJson(STORAGE.group, null);
  ((savedGroup && savedGroup.items) || []).forEach((item) => ids.add(item.id));
  if (state.event) ids.add(state.event.id);
  if (state.activeId) ids.add(state.activeId);

  if (!ids.size) {
    setStatus('Скачанных событий нет: обновлять нечего', 'error');
    return;
  }

  setStatus(`Обновляю из облака… (записей: ${ids.size})`);
  let updated = 0;
  let missing = 0;
  try {
    const list = await callFunction('action=list&full=1&rogaine=1');
    cloudEntries = list.entries || [];
    const byId = new Map(cloudEntries.map((entry) => [entry.id, entry]));

    for (const id of ids) {
      const entry = byId.get(id);
      if (!entry) {
        // Запись скачана, но в облаке её нет — говорим об этом прямо
        missing += 1;
        continue;
      }
      try {
        const full = await callFunction('action=get&id=' + encodeURIComponent(id));
        if (!full.distance) continue;
        const previous = readJson(STORAGE.event + '.' + id, null);
        const localResults = (previous && previous.distance && previous.distance.results) || [];
        const distance = Object.assign({}, full.distance, {
          results: mergeResults(full.distance.results, localResults),
        });
        const item = {
          id,
          kind: entry.kind,
          key: 'distances/' + id + (entry.kind === 'rogaine' ? '.rogaine' : '.osport'),
          distance,
          entry,
        };
        writeJson(STORAGE.event + '.' + id, item);
        rememberEvent(item);
        updated += 1;

        if (savedGroup) {
          savedGroup.items = (savedGroup.items || []).map(
            (member) => (member.id === id ? Object.assign({}, member, item) : member)
          );
        }
        if (state.event && state.event.id === id) {
          state.event = item;
          writeJson(STORAGE.event, item);
        }
      } catch (error) {
        // Одна недоступная запись не должна ломать остальные
      }
    }

    if (savedGroup) writeJson(STORAGE.group, savedGroup);
    renderHome();
    if (state.event) renderDetail();
    if (updated) setStatus(`Обновлено из облака: ${updated} из ${ids.size}`, 'good');
    else if (missing) setStatus(`В облаке не найдено записей: ${missing}`, 'error');
    else setStatus('В облаке нет изменений');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

/** Строка «результат не отправлен» — красноватая, как очередь в приложении. */
function pendingRow() {
  const row = plainRow('Результат не отправлен: отправится, когда появится связь');
  row.classList.add('pending');
  return row;
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
 * Подсказки при отправке результата — те же слова, что в Android
 * (`send_hint_*`, `send_confirm_*`, `send_done_*`, `send_queued_*`).
 *
 * Правило записи: 'update' — прежний результат заменяется новым,
 * 'first' — в протоколе остаётся первый, 'both' — обе строки с местами.
 */
const RESUBMIT_TEXTS = {
  hint: {
    update: 'Результат будет добавлен в протокол. При повторной отправке прежний результат заменится новым.',
    first: 'Результат будет добавлен в протокол. Повторная отправка в протокол не попадёт.',
    both: 'Результат будет добавлен в протокол. При повторной отправке у вас будет две строки, обе с местом.'
  },
  confirmTitle: {
    update: 'Отправить ещё раз?',
    first: 'Результат уже есть',
    both: 'Будет две строки'
  },
  confirmBody: {
    update: (was, now) => `Ваш результат в протоколе (${was}) будет заменён новым (${now}). Место пересчитается.`,
    first: (was, now) => `В протоколе останется первый результат: ${was}. Новая попытка (${now}) сохранится в облаке, но в протокол не войдёт.`,
    both: (was, now) => `В протоколе появятся обе ваши попытки: ${was} и ${now} — вторая с пометкой «дубль». Каждая получит своё место.`
  },
  done: {
    update: (now) => `Результат отправлен. В протоколе ваш результат: ${now}.`,
    first: (was) => `Результат уже есть: в протоколе прежний — ${was}. Новая попытка сохранена, в таблицу не вошла.`,
    both: (now) => `Добавлена вторая строка: ${now}, помечена «дубль». Теперь у вас две строки в протоколе.`
  },
  queued: {
    update: (now) => `Результат сохранён и уйдёт, когда появится связь. Тогда прежний результат в протоколе заменится новым (${now}).`,
    first: (was) => `Результат сохранён и уйдёт, когда появится связь. В протоколе останется первый результат — ${was}; новая попытка сохранена, но в таблицу не войдёт.`,
    both: (was, now) => `Результат сохранён и уйдёт, когда появится связь. Тогда в протоколе будет две ваши строки: ${was} и ${now} («дубль»).`
  },
  link: 'Что будет при отправке?',
  authorNote: 'Правило задаёт автор записи: «обновлять», «не обновлять» или «оставлять оба». Если автор его изменит, протокол пересоберётся по новому правилу.',
  dnf: 'Прежний результат — DNF (не финишировал)',
  nothing: 'Отправлять нечего: отметьте старт и финиш'
};

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
  const qr = String((distance && distance.markMode) || '').toUpperCase() === 'QR';
  row.innerHTML =
    `<svg class="icon small"><use href="icons.svg#${qr ? 'qrcode' : 'mylocation'}"></use></svg>` +
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

  if (withIcon) {
    // Способ отметки — слева от автора, как в приложении
    const mode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mode.setAttribute('class', 'icon small');
    const modeUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const qr = String((distance && distance.markMode) || '').toUpperCase() === 'QR';
    modeUse.setAttribute('href', qr ? 'icons.svg#qrcode' : 'icons.svg#mylocation');
    mode.append(modeUse);
    row.append(mode);
    person.style.marginLeft = '8px';
    row.append(person);
  }

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

  // Принадлежность к группе — по полю groupId самого события, как в приложении
  const groupId = String((event.entry && event.entry.groupId) || '');
  const inGroup = groupId !== '';
  $('detailDelete').classList.toggle('hidden', inGroup);

  // Номер дистанции внутри группы: соседи с тем же groupId по номеру из облака
  const number = (item) => Number(item.entry && item.entry.number) || 0;
  const ordinal = inGroup
    ? groupItems
      .filter((item) => String((item.entry && item.entry.groupId) || '') === groupId)
      .sort((left, right) => number(left) - number(right))
      .findIndex((item) => item.id === event.id) + 1
    : 0;

  // Карта из облака: кнопка есть только когда карта у дистанции есть
  $('detailMapDownload').classList.toggle('hidden', !entry.mapExt);
  // Как в приложении: у одиночной дистанции и у рогейна подписи нет,
  // «Дистанция N» — только у дистанции в группе
  $('detailSub').textContent = ordinal > 0 ? `Дистанция ${ordinal}` : '';

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

  // Что будет при повторной отправке: подсказка про правило автора
  const sendPolicy = String(distance.resubmit || 'update');
  const sendHintText = (RESUBMIT_TEXTS.hint[sendPolicy] || RESUBMIT_TEXTS.hint.update);
  let sendHint = $('detailSendHint');
  if (!sendHint) {
    sendHint = document.createElement('p');
    sendHint.id = 'detailSendHint';
    sendHint.className = 'meta';
    $('detailSend').before(sendHint);
  }
  sendHint.textContent = sendHintText;

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

  let mapPoints;
  if (event.kind === 'rogaine') {
    // У рогейна порядка пунктов нет: на карте показываем ВСЕ пункты
    mapPoints = points.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    );
    mapState.showRoute = false;
  } else {
    mapPoints = orderCodes
      .map((code) => byCode.get(String(code)))
      .filter((point) => point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  }

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

  // Как в приложении: без профиля участник начать не может. Только подсказка,
  // экран не меняем — человек остаётся там, где нажимал
  const who = identity();
  if (!who.nick || who.code.length < 6) {
    setStatus('Сначала войдите в профиль (вкладка «Профиль»)', 'error');
    return;
  }

  // Участнику нельзя начать после окончания события (у автора проверки нет)
  if (entry.finishTime && Date.now() > entry.finishTime) {
    setStatus('Событие уже закончилось', 'error');
    return;
  }

  // Правило как в приложении (domain/CheckpointCoverage.kt):
  // GPS — координаты нужны ВСЕМ пунктам; QR — только старту, номера пунктов
  // читаются с табличек, и координаты остальных для прохождения не нужны
  const points = distance.points || [];
  let missing;
  if (qrMode()) {
    const starts = startAliasCodes(distance);
    const startPoint = points.find((point) => starts.has(String(codeOf(point))));
    if (startPoint) {
      missing = !Number.isFinite(startPoint.latitude) || !Number.isFinite(startPoint.longitude);
    } else {
      // Старта нет отдельной точкой — берём координаты самого события
      const lat = Number(distance.latitude);
      const lon = Number(distance.longitude);
      missing = !Number.isFinite(lat) || !Number.isFinite(lon) || (!lat && !lon);
    }
    if (missing) {
      setStatus('Не указаны координаты старта: без них дистанцию не начать', 'error');
      return;
    }
  } else {
    missing = points.some(
      (point) => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
    );
  }
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

  // Остаёмся на этом же экране: дистанция просто перестаёт быть активной
  renderDetail();
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

  renderProfileState();
  setStatus('Вы вышли из профиля');
}

/** Скачивает карту дистанции из облака — как downloadMap в приложении. */
async function downloadCloudMap() {
  if (!state.event) return;

  try {
    // Расширение спрашиваем у облака: карту могли заменить на другую
    const answer = await callFunction('action=mapinfo&id=' + encodeURIComponent(state.event.id));
    const ext = String((answer && answer.ext) || '');

    if (!ext) {
      setStatus('Карты в облаке нет', 'error');
      return;
    }

    // Файл лежит в хранилище: maps/<id>.<ext>. Открываем его браузером:
    // скачать в «Загрузки» нельзя — хранилище не разрешает чтение из браузера
    const url = `${CONFIG.mapBucketUrl}/maps/${encodeURIComponent(state.event.id)}.${ext}`;
    setStatus('Открываю карту…');
    window.open(url, '_blank');
  } catch (error) {
    setStatus('Не удалось скачать карту. Попробуйте позже.', 'error');
  }
}

/* ─────────────────────────── вход через ВК ─────────────────────────── */

/** Идентификатор Web-приложения ВК (создано в кабинете VK ID). */
const VK_APP_ID = 54866229;

/**
 * Адрес возврата — ОДНА константа, а не location.pathname.
 *
 * ВК сверяет redirect_uri с «Доверенным Redirect URL» в кабинете посимвольно.
 * Страница открывается то как «…/OSportMobileLite/», то как
 * «…/OSportMobileLite/index.html» — при вычислении на ходу адрес менялся,
 * и виджет отвечал ошибкой. Константа убирает эту разницу.
 */
const VK_REDIRECT_URL = 'https://sergeievsujkov.github.io/OSportMobileLite/';

/** Сборка SDK: сначала наша копия из репозитория, CDN — запасные. */
const VK_SDK_URLS = [
  'vkid-sdk.js',
  'https://unpkg.com/@vkid/sdk@3.0.0/dist-sdk/umd/index.js',
];

let vkOneTapRendered = false;

/** Код профиля из VK ID — правило VkProfileCode в приложении, менять нельзя. */
function vkProfileCode(vkId) {
  const digits = String(vkId);
  if (!/^\d+$/.test(digits) || digits.length > 12) return '';
  const padded = digits.padStart(12, '0');
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let index = 0; index < padded.length; index++) {
    code += alphabet[Number(padded[index]) + 10 + index];
  }
  return code;
}

/** Подгружает SDK по требованию: офлайн вход невозможен. */
function loadVkSdk() {
  const ready = () => window.VKIDSDK || window.VKID || null;
  if (ready()) return Promise.resolve(ready());

  const trySource = (url) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => (ready() ? resolve(ready()) : reject(new Error('SDK не загрузился')));
    script.onerror = () => reject(new Error('SDK не загрузился'));
    document.head.append(script);
  });

  return VK_SDK_URLS.reduce(
    (chain, url) => chain.catch(() => trySource(url)),
    Promise.reject(new Error('SDK не загрузился'))
  );
}

/** Запомнить ник для профиля ВК: при следующем входе он подставится снова. */
function rememberVkNick(vkId, nick) {
  if (!vkId || !nick) return;
  const names = readJson(STORAGE.vkNames, {});
  names[String(vkId)] = nick;
  writeJson(STORAGE.vkNames, names);
}

/** Прежний ник этого профиля ВК на устройстве, если он был задан. */
function knownVkNick(vkId) {
  const names = readJson(STORAGE.vkNames, {});
  return String(names[String(vkId)] || '').trim();
}

/** Сохраняет профиль, полученный от ВК: ник, код профиля из VK ID и фото. */
function saveVkProfile(user) {
  const vkId = Number(user.user_id || user.id || 0);
  const code = vkProfileCode(vkId);
  if (!code) throw new Error('ВК не вернул идентификатор пользователя');

  // Свой прежний ник важнее имени из ВК: человек уже выбрал, как подписываться
  const fromVk = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const nick = knownVkNick(vkId) || fromVk || ('ВК ' + vkId);
  rememberVkNick(vkId, nick);

  writeJson(STORAGE.identity, {
    nick,
    code,
    vkId,
    photo: user.avatar || user.photo_200 || '',
  });

  vkOneTapRendered = false;
  renderProfileState();
  setStatus('Вход выполнен', 'good');
}

/**
 * Кнопка входа ВК — виджет One Tap в режиме Callback, как в примере VK:
 * страница никуда не уходит, код приходит в событии и меняется на токен.
 */
async function renderVkOneTap() {
  const me = identity();
  const signedIn = Boolean(me.nick) && me.code.length >= 6;

  if (signedIn || vkOneTapRendered) return;

  try {
    const VKID = await loadVkSdk();

    VKID.Config.init({
      app: VK_APP_ID,
      redirectUrl: VK_REDIRECT_URL,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: '',
    });

    const oneTap = new VKID.OneTap();
    oneTap
      .render({ container: $('vkOneTap'), showAlternativeLogin: true })
      .on(VKID.WidgetEvents.ERROR, (error) => {
        // Показываем всё, что пришло: по коду видно, чья это ошибка — ВК или сети
        console.error('VK ID widget error', error);
        let detail = '';
        try {
          detail = error && (error.error_description || error.error_text
            || error.message || error.code || JSON.stringify(error));
        } catch (ignored) {
          detail = '';
        }
        setStatus('ВК: ' + (detail || 'ошибка виджета'), 'error');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const tokens = await VKID.Auth.exchangeCode(payload.code, payload.device_id);
          const info = await VKID.Auth.userInfo(tokens.access_token);
          saveVkProfile((info && info.user) || {});
        } catch (error) {
          setStatus('Не удалось войти через ВК: ' + error.message, 'error');
        }
      });

    vkOneTapRendered = true;
  } catch (error) {
    setStatus('Не удалось загрузить ВК: ' + error.message, 'error');
  }
}

/**
 * Возврат из ВК редиректом: страница открылась с ?code=…
 *
 * Так бывает, когда вход начали в приложении, а подтверждение прошло в браузере:
 * результат приходит параметрами адреса. Меняем код на профиль и убираем
 * параметры из адреса, чтобы повторная загрузка ничего не делала.
 */
async function handleVkRedirectReturn() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return;
  const deviceId = params.get('device_id') || '';

  try {
    const VKID = await loadVkSdk();
    VKID.Config.init({
      app: VK_APP_ID,
      redirectUrl: VK_REDIRECT_URL,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: '',
    });
    const tokens = await VKID.Auth.exchangeCode(code, deviceId);
    const info = await VKID.Auth.userInfo(tokens.access_token);
    saveVkProfile((info && info.user) || {});
    setStatus('Вход выполнен', 'good');
    history.replaceState({}, '', location.pathname);
  } catch (error) {
    setStatus('Не удалось войти через ВК: ' + error.message, 'error');
  }
}

/**
 * Возврат в приложение после входа в другой вкладке.
 *
 * Профиль хранится в общем хранилище сайта, поэтому достаточно перечитать его
 * при появлении окна: приложение сразу покажет вход, хотя он был в браузере.
 */
function refreshIdentityFromStorage() {
  renderProfileState();
  renderHome();
  if (state.event) renderDetail();
}

/** Показывает блок профиля по состоянию: гость или вошедший. */
function renderProfileState() {
  const me = identity();
  const signedIn = Boolean(me.nick) && me.code.length >= 6;

  $('profileGuest').classList.toggle('hidden', signedIn);
  $('profileSigned').classList.toggle('hidden', !signedIn);

  if (!signedIn) return;

  const data = readJson(STORAGE.identity, {});
  $('profileNick').textContent = me.nick;

  const photo = data.photo || '';
  $('profilePhoto').classList.toggle('hidden', !photo);
  $('profilePhotoStub').classList.toggle('hidden', Boolean(photo));
  if (photo) $('profilePhoto').src = photo;
}

/** Совместимость: прежнее имя функции. */
function updateProfileButtons() {
  renderProfileState();
}

/** Окно «Изменить ник»: код профиля остаётся прежним. */
function openNickDialog() {
  const me = identity();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Изменить ник';

  const hint = document.createElement('p');
  hint.textContent = 'Ник виден в протоколе и на карточках событий. Код профиля не меняется.';

  const input = document.createElement('input');
  input.className = 'input';
  input.type = 'text';
  input.maxLength = 20;
  input.value = me.nick;

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const save = document.createElement('button');
  save.className = 'button';
  save.textContent = 'Сохранить';
  save.addEventListener('click', () => {
    const nick = input.value.trim();
    if (nick.length < 3) {
      setStatus('Ник короче трёх знаков', 'error');
      return;
    }
    const data = readJson(STORAGE.identity, {});
    writeJson(STORAGE.identity, { ...data, nick });
    if (data.vkId) rememberVkNick(data.vkId, nick);
    overlay.remove();
    renderProfileState();
    setStatus('Ник изменён', 'good');
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'Отмена';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(save, cancel);
  modal.append(title, hint, input, actions);
  overlay.append(modal);
  document.body.append(overlay);
  input.focus();
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
  const groupItems = (group && group.items) || [];

  // Признак группы мог не сохраниться — тогда удаляем всю сохранённую группу,
  // иначе на главном остаётся одна из её дистанций
  const members = groupId
    ? groupItems.filter((item) => (item.groupId || '') === groupId)
    : groupItems;
  const ids = (members.length ? members : groupItems).map((item) => item.id);

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

  // Убираем сохранённое событие, даже если открыто было другое
  const storedEvent = readJson(STORAGE.event, null);
  if (storedEvent && ids.includes(storedEvent.id)) {
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // приватный режим
    }
    if (state.event && state.event.id === storedEvent.id) state.event = null;
  }
  if (state.event && ids.includes(state.event.id)) {
    state.event = null;
    state.marks = [];
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

  const storedEvent = readJson(STORAGE.event, null);
  if (storedEvent && storedEvent.id === eventId) {
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // приватный режим
    }
  }

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
  sanitizeMarks();
  // Отметок нет — открывать нечего: говорим об этом, как приложение
  if (!state.marks.length) {
    setStatus('Отметок нет: по этой дистанции ничего не отмечено', 'error');
    return;
  }

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
  // «Отметки на устройстве»: своё правило показа — только дистанция, ник
  // и отметки, без времени, результата и места
  openParticipant(row, rogaineMode(), false);
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

/** Мировые пиксели Меркатора для широты и долготы на заданном масштабе. */
function mercatorPx(latitude, longitude, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const latRad = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * size,
  };
}

/** Обратный перевод: мировые пиксели → широта и долгота. */
function mercatorLatLon(x, y, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const longitude = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

/**
 * Жесты карты: во время касания слой карты двигается transform-ом — плавно,
 * без перерисовки; на отпускании масштаб и центр пересчитываются и карта
 * перерисовывается чётко.
 */
function bindMapGestures(box) {
  if (box.dataset.gestures === 'on') return;
  box.dataset.gestures = 'on';

  const pointers = new Map();
  let startDistance = 0;
  let startZoom = 16;
  let startCenterPx = null;
  let startMiddle = null;
  let startPoint = null;
  let lastScale = 1;
  let lastMiddle = null;
  let lastPoint = null;

  const layer = () => box.querySelector('.map-layer');

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

  const applyTransform = (scale, tx, ty) => {
    const node = layer();
    if (!node) return;
    node.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  box.addEventListener('pointerdown', (event) => {
    box.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      startPoint = { x: event.clientX, y: event.clientY };
      startMiddle = { x: event.clientX, y: event.clientY };
      startZoom = mapState.zoom || 16;
      startCenterPx = mapState.center
        ? mercatorPx(mapState.center.latitude, mapState.center.longitude, startZoom)
        : null;
      startDistance = 0;
    }

    if (pointers.size === 2) {
      startDistance = distance();
      startMiddle = middle();
      startZoom = mapState.zoom || 16;
      startCenterPx = mapState.center
        ? mercatorPx(mapState.center.latitude, mapState.center.longitude, startZoom)
        : null;
    }
  });

  box.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!startMiddle) return;

    if (pointers.size >= 2 && startDistance > 0) {
      lastScale = Math.min(6, Math.max(0.2, distance() / startDistance));
      lastMiddle = middle();
      applyTransform(lastScale, lastMiddle.x - startMiddle.x, lastMiddle.y - startMiddle.y);
    } else if (pointers.size === 1 && startPoint) {
      lastPoint = { x: event.clientX, y: event.clientY };
      applyTransform(1, lastPoint.x - startPoint.x, lastPoint.y - startPoint.y);
    }
  });

  const finish = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size > 0) return;

    const node = layer();
    if (!node || !startMiddle || !startCenterPx) {
      if (node) node.style.transform = '';
      startMiddle = null;
      return;
    }

    // Значения берём из последнего движения: после отпускания пальцев
    // расстояние между ними уже не измерить
    const scale = lastScale;
    const tx = startDistance > 0
      ? (lastMiddle ? lastMiddle.x - startMiddle.x : 0)
      : (lastPoint ? lastPoint.x - startPoint.x : 0);
    const ty = startDistance > 0
      ? (lastMiddle ? lastMiddle.y - startMiddle.y : 0)
      : (lastPoint ? lastPoint.y - startPoint.y : 0);

    if (startDistance > 0) {
      // Щипок: масштаб меняется на целые уровни, центр держим под пальцами
      const nextZoom = Math.min(19, Math.max(3, Math.round(startZoom + Math.log2(scale))));
      const ratio = Math.pow(2, nextZoom - startZoom);
      mapState.zoom = nextZoom;
      mapState.center = mercatorLatLon(
        startCenterPx.x * ratio - tx,
        startCenterPx.y * ratio - ty,
        nextZoom
      );
    } else if (tx || ty) {
      // Перетаскивание: сдвиг в пикселях переводим в координаты
      mapState.center = mercatorLatLon(startCenterPx.x - tx, startCenterPx.y - ty, startZoom);
    }

    node.style.transform = '';
    startMiddle = null;
    startPoint = null;
    startDistance = 0;
    redrawMap();
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

  // Всё содержимое карты живёт в одном слое: во время жеста его двигаем
  // transform-ом (плавно), а после жеста перерисовываем чётко
  const layer = document.createElement('div');
  layer.className = 'map-layer';
  box.append(layer);

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
      layer.append(tile);
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

  layer.append(svg);
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
  const allResults = Array.isArray(distance.results) ? distance.results : [];
  // Правило события применяет УСТРОЙСТВО: сервер хранит все попытки
  const policy = String(distance.resubmit || 'update');
  const version = (row) => Number(row && row.updatedAt) || Number(row && row.finishTime) || 0;
  const byUser = new Map();
  if (policy === 'both') {
    allResults.forEach((row) => {
      if (!row || !row.userId) return;
      byUser.set(String(row.userId) + '#' + (Number(row.attempt) || 1), row);
    });
  } else {
    allResults.forEach((row) => {
      if (!row || !row.userId) return;
      const key = String(row.userId);
      const current = byUser.get(key);
      if (!current) { byUser.set(key, row); return; }
      const better = policy === 'first'
        ? version(row) < version(current)
        : version(row) > version(current);
      if (better) byUser.set(key, row);
    });
  }
  const results = Array.from(byUser.values());
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
      // Дополнительная попытка помечается прямо в подписи строки
      nick: (row.nick || row.userId || 'Участник') + (row.duplicate ? ' · дубль' : ''),
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
    head.className = 'proto-row head' + (rogaine ? ' rogaine' : '');
    head.innerHTML = rogaine
      ? '<span class="proto-nick">Ник</span>' +
        '<span class="proto-time">Время (результат)</span>' +
        '<span class="proto-score">Баллы</span>' +
        '<span class="proto-place">Место</span>'
      : '<span class="proto-place">Место</span>' +
        '<span class="proto-nick">Ник</span>' +
        '<span class="proto-result">Результат</span>' +
        '<span class="proto-behind">Отст.</span>';
    list.append(head);

    const shown = protocolExpanded ? rows : rows.slice(0, PROTOCOL_PREVIEW_ROWS);
    shown.forEach((row) => list.append(rogaine ? protocolRowRogaine(row) : protocolRow(row, false)));
  }

  const more = $('protoMore');
  more.classList.toggle('hidden', rows.length <= PROTOCOL_PREVIEW_ROWS);
  more.textContent = protocolExpanded ? 'Свернуть' : `Показать всех (${rows.length})`;
}

/**
 * Строка протокола рогейна: ник, время от старта до финиша, баллы после
 * штрафа и место. У DNF времени нет — прочерк, вместо места — статус.
 */
function protocolRowRogaine(row) {
  const item = document.createElement('button');
  item.className = 'proto-row rogaine';

  const nick = document.createElement('span');
  nick.className = 'proto-nick';
  nick.textContent = row.nick;

  const time = document.createElement('span');
  time.className = 'proto-time';
  time.textContent = row.status === 'OK' ? formatDuration(row.elapsed) : '—';

  const score = document.createElement('span');
  score.className = 'proto-score';
  score.textContent = String(row.total);

  const place = document.createElement('span');
  place.className = 'proto-place';
  place.textContent = row.status === 'OK' ? String(row.place) : row.status;

  item.append(nick, time, score, place);
  item.addEventListener('click', () => openParticipant(row, true));
  return item;
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
function openParticipant(row, rogaine, fromProtocol = true) {
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
  // В «Моих отметках» времени, результата, баллов и места нет: там только
  // дистанция, ник и свои отметки, как в приложении
  if (fromProtocol) {
    summaryRow('Время старта', row.startTime ? formatClock(row.startTime) : '—');
    summaryRow('Время финиша', row.finishTime ? formatClock(row.finishTime) : '—');
    summaryRow(
      'Результат',
      row.status === 'DNF' ? 'DNF' : (row.startTime && row.finishTime ? formatDuration(row.elapsed) : '—')
    );
    if (rogaine) {
      summaryRow('Баллы без штрафа', String(row.score ?? 0));
      summaryRow('Штраф', String(row.penalty ?? 0));
      summaryRow('Баллы', String(row.total ?? 0));
    }
    if (row.place) summaryRow('Место', String(row.place));
  }

  const list = $('participantMarks');
  list.textContent = '';
  const marks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));

  const starts = startAliasCodes(distance);
  let number = 0;
  let previous = null;
  // Пункты, отмеченные хотя бы раз: повтор номера не получает, а помечается
  // словом «дубль» — как на экране сплита в приложении
  const seen = new Set();

  marks.forEach((mark) => {
    const code = String(mark.code);
    const startPoint = starts.has(code);
    const finishPoint = isFinish(code, rogaine);
    // Из протокола повтор помечается «дубль» и номера не получает; в «Моих
    // отметках» нумеруются все отметки подряд, включая повторные
    const checkpoint = fromProtocol && rogaine && !startPoint && !finishPoint && /^[1-9]/.test(code);
    const repeat = checkpoint && seen.has(code);
    if (checkpoint) seen.add(code);
    const leg = previous === null ? null : mark.time - previous;

    let label;
    if (startPoint) {
      label = '(Старт)';
    } else if (finishPoint) {
      label = '(Финиш)';
    } else {
      if (!repeat) number += 1;
      label = `(${code})`;
    }

    const item = document.createElement('div');
    item.className = 'split-row';

    const num = document.createElement('span');
    num.className = 'split-number';
    if (startPoint || finishPoint) num.textContent = '';
    else if (repeat) num.textContent = 'дубль';
    else num.textContent = number + '.';

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

  // Своя отметка: сумма баллов одной строкой под таблицей, не в сводке.
  // Прежнюю строку убираем, иначе при повторном открытии они копились бы
  const oldTotal = $('myMarksTotal');
  if (oldTotal) oldTotal.remove();
  if (!fromProtocol && rogaine) {
    const total = document.createElement('p');
    total.className = 'meta';
    total.id = 'myMarksTotal';
    total.textContent = `Баллы: ${row.total ?? 0}`;
    list.after(total);
  }

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
  // Принимает и пункт, и сам код: у QR подпись строится по коду из таблички,
  // и без этого номер превращался в пустую строку
  const code = typeof point === 'string' || typeof point === 'number'
    ? String(point)
    : codeOf(point);
  if (isStart(code, rogaineMode())) return 'Старт';
  if (isFinish(code, rogaineMode())) return 'Финиш';
  return String(code);
}

function markedCodes() {
  return new Set(
    state.marks.filter((mark) => !mark.start && !mark.finish).map((mark) => String(mark.code))
  );
}

/** Сколько держится подтверждение отметки, как в приложении. */
const MARKED_MESSAGE_MILLIS = 3000;
/** Сколько ждать уточнения места, прежде чем предложить аварийную отметку. */
const EMERGENCY_WAIT_MILLIS = 5000;
/** Через сколько код считается ушедшим из кадра. */
const CODE_GONE_MILLIS = 1000;

/** Старт или финиш этот код: подпись и правила у них особые. */
function startOrFinishOf(code) {
  if (isStart(code, rogaineMode())) return 'start';
  if (isFinish(code, rogaineMode())) return 'finish';
  return null;
}

/** Склонение числа: 1 балл, 2 балла, 5 баллов. */
function plural(count, one, few, many) {
  const value = Math.abs(Number(count) || 0) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Точка в зоне пункта: допуск — погрешность пункта + погрешность приёмника + 5 м. */
function inZone(point, position) {
  if (!point || !position) return false;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return false;
  const allowed = (point.accuracyMeters || 0) + position.accuracy + 5;
  return distanceMeters(position.lat, position.lon, point.latitude, point.longitude) <= allowed;
}

/** Пункт, у которого стоит участник. loose — без ограничения погрешности. */
function findMarkPoint(loose) {
  if (!state.event || !state.position) return null;
  if (!loose && state.position.accuracy > MAX_ACCURACY_METERS) return null;
  const points = (state.event.distance && state.event.distance.points) || [];
  for (const point of points) {
    if (inZone(point, state.position)) return point;
  }
  return null;
}

/** Подпись отметки до записи: номер пункта, баллы рогейна и дубль. */
function markLabelFor(code) {
  const rogaine = rogaineMode();
  const checkpoint = rogaine && /^[1-9]/.test(String(code));
  const known = state.marks || [];
  const duplicate = checkpoint && known.some((mark) => String(mark.code) === String(code));
  return {
    number: labelOf(code),
    score: checkpoint && !duplicate ? Number(String(code)[0]) : null,
    duplicate,
    total: checkpoint
      ? rogainePoints([...known, { code: String(code), time: 0 }])
      : null,
  };
}

/** Исход отметки: те же слова, что в приложении. */
function outcomeText(kind) {
  return {
    recorded: 'Отметка записана',
    finish: 'Вы уже финишировали',
    start: 'Вначале отметьте старт на выбранной дистанции',
    foreign: 'Код другой дистанции',
    unknown: 'Это не код контрольного пункта — или не вашей дистанции',
    skipped: 'Код пропущен',
  }[kind] || '';
}

/** Показать исход на 3 секунды и подписи отметки рогейна. */
function showOutcome(kind, label, code) {
  const text = $('markOutcome');
  const lines = [outcomeText(kind)];

  // У записанной отметки рогейна сразу под исходом — номер пункта, баллы
  // и сумма: одна строка на каждое значение, без отдельных элементов,
  // которые могли остаться скрытыми
  if (kind === 'recorded' && label && rogaineMode()) {
    lines.push(label.number);
    if (label.duplicate) {
      lines.push('дублирующая отметка, баллов нет');
    } else if (label.score !== null) {
      lines.push(`${label.score} ${plural(label.score, 'балл', 'балла', 'баллов')}`);
    }
    if (label.total !== null) {
      lines.push(`итого: ${label.total} ${plural(label.total, 'балл', 'балла', 'баллов')}`);
    }
  }

  text.textContent = lines.join('\n');
  text.classList.remove('hidden');

  // Дублируем исход всплывающей строкой: она видна при любом размере окна
  // камеры и не зависит от верстки нижнего блока
  if (kind === 'recorded' && rogaineMode() && label) {
    setStatus(lines.join(' · '), 'good');
    // Итог дублируем прямо под номером пункта в панели: туда смотрит участник
    state.outcomeHints = lines.slice(1).join('\n');
    state.outcomeUntil = Date.now() + MARKED_MESSAGE_MILLIS;
    const hints = $('qrHints');
    hints.textContent = state.outcomeHints;
    hints.classList.remove('hidden');
  }
  text.classList.toggle('error', kind !== 'recorded' && kind !== 'skipped');
  $('markLabels').classList.add('hidden');

  if (kind === 'skipped') setStatus(outcomeText(kind), 'good');

  clearTimeout(state.outcomeTimer);
  state.outcomeTimer = setTimeout(() => {
    text.classList.add('hidden');
  }, MARKED_MESSAGE_MILLIS);
}

/** Подсказка под кнопкой: порядок важнее — отказ, грубая точность, старт/финиш, режим. */
function renderHint(point, rough, auto) {
  const hint = $('markHint');
  hint.classList.remove('error');

  if (state.manualRefused) {
    hint.textContent = 'Включена автоматическая отметка: нажимать не нужно. '
      + 'Чтобы отмечаться вручную, выключите «Автоматическую отметку» в настройках.';
    hint.classList.add('error');
    return;
  }
  if (rough) {
    hint.textContent = 'Ждём точное местоположение: погрешность больше 15 метров. '
      + 'Отметка включится сама, как только приёмник уточнит место.';
    return;
  }
  // Слова про ручной старт и финиш нужны только при включённой
  // автоматической отметке: в ручном режиме это и так очевидно
  if (point && auto) {
    const kind = startOrFinishOf(codeOf(point));
    if (kind === 'start') {
      hint.textContent = 'Старт отмечается только вручную — нажмите кнопку';
      return;
    }
    if (kind === 'finish') {
      hint.textContent = 'Финиш отмечается только вручную — нажмите кнопку';
      return;
    }
  }
  hint.textContent = auto
    ? 'Подойдите к пункту — отметка поставится сама, нажимать не нужно'
    : 'Кнопка станет зелёной у пункта — тогда нажмите';
}

/** Отрисовка экрана отметки по состоянию: GPS и QR. */
function renderMark() {
  const event = state.event;
  const auto = Boolean(settings().autoMark);
  const mode = $('markMode');
  mode.textContent = auto ? 'Отметка автоматическая' : 'Отметка ручная';
  mode.classList.toggle('auto', auto);

  if (!event) {
    $('markTitle').textContent = 'Сначала активируйте событие';
    $('markAccuracy').textContent = 'Выберите событие в облаке.';
    $('markReady').classList.add('hidden');
    setCircle(null, 'Подойдите к пункту', false);
    renderHint(null, false, auto);
    return;
  }

  const distance = event.distance || {};
  const scanning = qrMode();
  $('markTitle').textContent = distance.name || 'Событие';
  $('qrBox').classList.toggle('hidden', !scanning);
  document.querySelector('.mark-center').classList.toggle('hidden', scanning);

  if (scanning) {
    $('markAccuracy').textContent = identity().nick || 'Профиль не заполнен';
    $('markReady').classList.add('hidden');
    $('markHint').classList.remove('hidden');
    renderHint(null, false, auto);
    $('markHint').textContent = auto
      ? 'Наведите камеру на QR-код — отметка поставится сама, нажимать не нужно'
      : 'Наведите камеру на QR-код и нажмите «ОТМЕТИТЬ»';
    renderQrConfirm();
    return;
  }

  const position = state.position;
  if (position) {
    const accuracy = Math.round(position.accuracy * 10) / 10;
    $('markAccuracy').textContent = `Погрешность: ${String(accuracy).replace('.', ',')} м`;
  } else {
    $('markAccuracy').textContent = 'Координаты пока не получены';
  }

  const point = findMarkPoint(false);
  state.candidate = point;
  const rough = Boolean(position) && position.accuracy > MAX_ACCURACY_METERS;

  const ready = $('markReady');
  if (!position) {
    ready.textContent = 'Ждём сигнал GPS';
    ready.classList.remove('hidden', 'ok');
  } else if (rough) {
    ready.textContent = `Точность пока грубая: ±${Math.round(position.accuracy)} м`;
    ready.classList.remove('hidden', 'ok');
  } else if (point) {
    ready.textContent = 'Готово — можно отмечать';
    ready.classList.remove('hidden');
    ready.classList.add('ok');
  } else {
    ready.classList.add('hidden');
  }

  if (point) setCircle(point, labelOf(codeOf(point)), true);
  else setCircle(null, 'Подойдите к пункту', false);

  // Автоматическая отметка: одна на пункт, старт и финиш не автоматизируются
  const code = point ? codeOf(point) : null;
  const kind = point ? startOrFinishOf(code) : null;
  if (auto && code && !kind) {
    if (state.autoMarked !== code) {
      state.autoMarked = code;
      state.manualRefused = false;
      markByCode(code);
    }
  } else if (!code) {
    state.autoMarked = null;
  }

  handleEmergency(point, position, rough);
  renderHint(point, rough, auto);
}

/** Кнопка отметки: цвет и подпись зависят от того, можно ли отмечать. */
function setCircle(point, label, ready) {
  const circle = $('bigMark');
  $('markButtonLabel').textContent = label;
  circle.classList.toggle('ready', Boolean(ready));
  circle.disabled = !ready;
}

/** Нажатие круглой кнопки. */
function markCandidate() {
  const auto = Boolean(settings().autoMark);
  const point = state.candidate;
  if (!point || !state.event) {
    if (state.marks.some((mark) => mark.finish)) showOutcome('finish');
    return;
  }

  const code = codeOf(point);
  const kind = startOrFinishOf(code);
  // Автоматическая отметка включена: ручная не выполняется, экран объясняет
  if (auto && !kind) {
    state.manualRefused = true;
    renderMark();
    return;
  }
  state.manualRefused = false;
  markByCode(code);
}

/**
 * Оставляет только отметки текущего прохода: после последнего старта
 * и до первого финиша.
 *
 * Правило приложения: новый старт стирает прежние отметки, а после финиша
 * ничего не записывается. Чистка нужна и для отметок, записанных старыми
 * сборками, где сброса ещё не было.
 */
function sanitizeMarks() {
  const marks = state.marks || [];
  let startAt = -1;
  marks.forEach((mark, index) => {
    if (mark.start) startAt = index;
  });
  let cleaned = startAt >= 0 ? marks.slice(startAt) : marks;
  const finishAt = cleaned.findIndex((mark) => mark.finish);
  if (finishAt >= 0) cleaned = cleaned.slice(0, finishAt + 1);
  if (cleaned.length !== marks.length || startAt > 0) {
    state.marks = cleaned;
    saveMarks();
  }
  return cleaned;
}

/** Запись отметки: одно правило и одни слова для кнопки, автоматики и QR. */
function markByCode(code, options = {}) {
  const start = isStart(code, rogaineMode());
  const finish = isFinish(code, rogaineMode());
  // Старт отмечается и после финиша: он начинает протокол заново и стирает
  // прежние отметки, поэтому блокировать его нечем
  if (!start && state.marks.some((mark) => mark.finish)) {
    showOutcome('finish');
    return 'finish';
  }
  if (!start && !state.marks.some((mark) => mark.start)) {
    showOutcome('start');
    return 'start';
  }

  const label = markLabelFor(code);
  if (start) {
    // Новая отметка старта начинает протокол заново
    state.marks = [{ code, time: Date.now(), start: true, finish: false }];
  } else {
    state.marks.push({ code, time: Date.now(), start: false, finish: Boolean(finish) });
  }
  state.autoMarked = options.auto ? String(code) : state.autoMarked;
  saveMarks();
  playMarkSound();
  renderMark();
  showOutcome('recorded', label);

  if (finish && settings().autoSend && identity().nick && identity().code.length >= 6) {
    sendResult();
  }
  return 'recorded';
}

/** Аварийная отметка: стоим в зоне 5 секунд при грубой погрешности. */
function handleEmergency(point, position, rough) {
  const loose = rough ? findMarkPoint(true) : null;
  const key = loose ? String(codeOf(loose)) : null;
  const dialog = $('emergencyDialog');

  if (key === null) {
    state.emergencyKey = null;
    state.emergencyDismissed = false;
    dialog.classList.add('hidden');
    return;
  }
  if (state.emergencyKey !== key) {
    state.emergencyKey = key;
    state.emergencyAt = Date.now();
    state.emergencyDismissed = false;
    dialog.classList.add('hidden');
    return;
  }
  if (state.emergencyDismissed || dialog.classList.contains('hidden') === false) return;

  if (Date.now() - state.emergencyAt >= EMERGENCY_WAIT_MILLIS) {
    const pointCoords = { lat: loose.latitude, lon: loose.longitude };
    const meters = distanceMeters(pointCoords.lat, pointCoords.lon, position.lat, position.lon);
    $('emergencyText').textContent =
      `Приёмник не может уточнить место: погрешность ${Math.round(position.accuracy)} метров, `
      + `а до пункта ${Math.round(meters)} метров. Обычно при такой погрешности отметка не ставится — `
      + 'рядом с пунктом оказался бы участок в десятки метров.\n\n'
      + 'Вы стоите внутри зоны пункта, посчитанной по этой погрешности, поэтому отметку можно '
      + 'поставить вручную. Запись будет сделана, но место определено грубо: при проверке организатор '
      + 'увидит это по погрешности.\n\n'
      + 'Лучше отойти от деревьев и стен и подождать уточнения. Если ждать нечего — подтвердите отметку.';
    $('emergencyText').style.whiteSpace = 'pre-line';
    state.emergencyPoint = codeOf(loose);
    dialog.classList.remove('hidden');
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
        qrTimer = setInterval(() => {
          detectOnce(detector, video);
          checkQrGone();
        }, 250);
      } else {
        qrTimer = setInterval(() => {
          detectWithJsQr(video);
          checkQrGone();
        }, 250);
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

/** Разбор кода с камеры: показываем подтверждение, отметка — по кнопке. */
function handleQrText(raw) {
  if (!state.event || !qrMode()) return;
  const distance = state.event.distance || {};
  const owner = distance.ownerId || (state.event.entry || {}).ownerId || '';
  const parsed = parsePointQr(raw, owner, rogaineMode());

  let code = null;
  let foreign = false;
  if (parsed.error === 'other-kind' || parsed.error === 'foreign') {
    foreign = true;
  } else if (!parsed.error) {
    code = String(parsed.code);
    // В QR коды двузначные («01», «02», «57»), а в базе ориентирования числа
    // без ведущего нуля: «02» — это финиш 2, «01» — старт (3 или 1).
    // Без приведения верный код финиша искали строкой «02» и не находили
    if (!rogaineMode() && /^[0-9]+$/.test(code)) {
      const numeric = String(Number(code));
      if (numeric === '1') {
        const hasStart = (distance.points || []).some((item) => String(codeOf(item)) === '3');
        code = hasStart ? '3' : '1';
      } else {
        code = numeric;
      }
    }
    if (!(distance.points || []).some((item) => String(codeOf(item)) === code)) {
      code = null;
      foreign = true;
    }
  }

  // До отметки известен только номер пункта. Баллы и сумму не считаем вовсе:
  // сумма обязана измениться ровно после записи, а не при наведении камеры
  const label = code
    ? { code, number: labelOf(code), score: null, duplicate: false, total: null }
    : null;
  state.pendingQr = { raw, code, label, foreign, seenAt: Date.now() };
  state.manualRefused = false;
  state.outcomeHints = '';
  renderQrConfirm();

  // Автоматическая отметка: код в кадре — отмечаемся без нажатия, один раз на код.
  // Старт и финиш автоматика не ставит.
  if (settings().autoMark && label && !startOrFinishOf(code) && state.autoQrCode !== code) {
    state.autoQrCode = code;
    markByCode(code, { auto: true });
  }
}

/** Панель подтверждения QR: подпись пункта, предупреждение и кнопки. */
function renderQrConfirm() {
  const box = $('qrConfirm');
  if (!box) return;
  const pending = state.pendingQr;
  if (!qrMode() || !pending) {
    box.classList.add('hidden');
    $('qrHints').classList.add('hidden');
    return;
  }

  const label = pending.label;
  $('qrLabel').textContent = label ? label.number : '';
  const warning = $('qrWarning');
  const auto = Boolean(settings().autoMark);

  let text = '';
  if (!label) {
    text = pending.foreign
      ? 'Код другой дистанции'
      : 'Это не код контрольного пункта — или не вашей дистанции';
  } else if (auto) {
    const kind = startOrFinishOf(label.code);
    if (kind === 'start') text = 'Старт отмечается только вручную: нажмите «Отметить»';
    if (kind === 'finish') text = 'Финиш отмечается только вручную: нажмите «Отметить»';
    if (!kind) text = 'Включена автоматическая отметка: отмечать вручную не нужно';
  }
  warning.textContent = text;
  warning.classList.toggle('hidden', !text);
  $('qrMark').disabled = !label;

  // До отметки показываем ТОЛЬКО номер пункта. После записи под номером
  // ещё 3 секунды висят баллы и «итого» — так же, как подпись отметки
  // в приложении остаётся на экране
  const hints = $('qrHints');
  if (state.outcomeHints && state.outcomeUntil > Date.now()) {
    hints.textContent = state.outcomeHints;
    hints.classList.remove('hidden');
  } else {
    state.outcomeHints = '';
    hints.classList.add('hidden');
  }

  box.classList.remove('hidden');
}

/** Код ушёл из кадра — подтверждение и кнопки убираем, как в приложении. */
function checkQrGone() {
  if (!state.pendingQr) return;
  if (Date.now() - state.pendingQr.seenAt >= CODE_GONE_MILLIS) {
    state.pendingQr = null;
    state.autoQrCode = null;
    state.manualRefused = false;
    renderQrConfirm();
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
  const saved = readJson(STORAGE.identity, { nick: '', code: '' });
  return { nick: String(saved.nick || '').trim(), code: String(saved.code || '').trim().toUpperCase() };
}

/** Состояние отправки на экране дистанции; на профиле её больше нет. */
function updateSendState() {
  if (!$('send')) return;
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
  const result = buildResult(event.distance, state.marks, who);
  // Номер попытки назначает СЕРВЕР: клиент отправляет результат как есть

  // Такой результат уже есть: второй раз не записываем и не отправляем
  if ((event.distance.results || []).some((row) => sameResult(row, result))) {
    setStatus('Этот результат уже есть. Повторно он не записан.', 'warn');
    return;
  }

  // Как в приложении: результат сначала ложится в дистанцию на устройстве,
  // экраны обновляются сразу, а отправка в облако идёт после
  const results = (event.distance.results || [])
    .filter((row) => String(row.userId) !== String(result.userId));
  results.push(result);
  event.distance = Object.assign({}, event.distance, { results });
  writeJson(STORAGE.event, event);
  writeJson(STORAGE.event + '.' + event.id, event);
  rememberEvent(event);
  renderHome();
  renderDetail();

  // Тело — дистанция целиком с нашим результатом: функция ждёт id и order,
  // а результаты сливает по участникам, поэтому чужие не затрутся
  const payload = Object.assign({}, event.distance, { results: [result] });

  setStatus('Результат сохранён, отправляю…');
  try {
    await callFunction('action=result&key=' + encodeURIComponent(event.key), payload);
    setStatus('Результат отправлен', 'good');
    renderHome();
    renderDetail();
    flushPendingResults().catch(() => {});
  } catch (error) {
    queueResult(event.key, result, payload);
    setStatus('Результат сохранён, отправится позже: ' + error.message, 'error');
  }
}

/** Отложенный результат: храним, пока облако не ответит. */
function queueResult(key, result, payload) {
  const list = readJson(STORAGE.pendingResults, []);
  const filtered = list.filter(
    (item) => !(item.key === key && String(item.result.userId) === String(result.userId))
  );
  filtered.push({ key, result, payload });
  writeJson(STORAGE.pendingResults, filtered);
}

/** Пробуем отправить отложенные результаты — при запуске и после удачной отправки. */
async function flushPendingResults() {
  const list = readJson(STORAGE.pendingResults, []);
  if (!list.length) return;
  const left = [];
  for (const item of list) {
    // Старые записи очереди без полного тела отправить нельзя: функция требует
    // id и порядок пунктов. Результат уже лежит на устройстве, и его можно
    // отправить кнопкой заново — такую запись просто убираем из очереди
    if (!item.payload) continue;
    try {
      await callFunction('action=result&key=' + encodeURIComponent(item.key), item.payload);
    } catch (error) {
      left.push(item);
    }
  }
  writeJson(STORAGE.pendingResults, left);
}

/* ─────────────────────────── запуск ─────────────────────────── */

/**
 * Протягивание вниз на главном и в облаке обновляет данные из облака.
 *
 * На главном это полное обновление скачанного (карточки, результаты,
 * протоколы), в облаке — перечитывание каталога. Жест работает только когда
 * страница прокручена к самому верху, чтобы не мешать обычной прокрутке.
 */
function bindPullToRefresh() {
  const indicator = $('pullIndicator');
  const THRESHOLD = 70;

  // Жест вешаем на сам экран, а не на документ: так его не перехватывают
  // карта и кнопки, и он не конфликтует с прокруткой списков
  const screens = [$('homeScreen'), $('cloudScreen')];

  const atTop = () => {
    const scrolled = window.scrollY
      || (document.scrollingElement && document.scrollingElement.scrollTop)
      || 0;
    return scrolled <= 0;
  };

  const refresh = (screen) => {
    // Протяжка вниз: на главном — проверка хранилища, на экране облака —
    // перечитывание каталога. Просто заход на главный ничего не запрашивает
    if (screen === $('homeScreen')) syncFromCloud().catch(() => {});
    else openCloud();
  };

  screens.forEach((screen) => {
    if (!screen) return;
    let startY = null;
    let pulled = 0;

    const show = (text, offset) => {
      indicator.classList.remove('hidden');
      indicator.textContent = text;
      indicator.style.transform = `translateX(-50%) translateY(${Math.min(offset, 90)}px)`;
    };
    const hide = () => {
      indicator.classList.add('hidden');
      indicator.style.transform = '';
    };

    screen.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1 || !atTop()) return;
      startY = event.touches[0].clientY;
      pulled = 0;
    }, { passive: true });

    screen.addEventListener('touchmove', (event) => {
      if (startY === null) return;
      pulled = Math.max(0, event.touches[0].clientY - startY);
      if (pulled <= 4) return;
      // Свой жест: иначе браузер делает «потянуть для обновления» страницы
      if (event.cancelable) event.preventDefault();
      show(pulled >= THRESHOLD ? 'Отпустите, чтобы обновить' : 'Потяните, чтобы обновить', pulled);
    }, { passive: false });

    const finish = () => {
      if (startY === null) return;
      const should = pulled >= THRESHOLD;
      startY = null;
      pulled = 0;
      hide();
      if (should) refresh(screen);
    };

    screen.addEventListener('touchend', finish, { passive: true });
    screen.addEventListener('touchcancel', () => {
      startY = null;
      pulled = 0;
      hide();
    }, { passive: true });
  });
}

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

  bindPullToRefresh();
  $('homeRefresh').addEventListener('click', () => {
    syncFromCloud().catch(() => {});
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
  // Назад с дистанции: откуда пришли — туда и возвращаемся.
  // Экран группы при открытии дистанции прячется, поэтому смотрим историю,
  // а не видимость экрана
  $('detailBack').addEventListener('click', () => {
    const previous = navStack[navStack.length - 2];
    if (previous === 'group') {
      renderGroup();
      showTab('group', { push: false });
    } else {
      showTab('events', { push: false });
    }
  });
  $('profileSignOut').addEventListener('click', openSignOutDialog);
  $('detailMarksButton').addEventListener('click', openMyProgress);
  $('detailMapDownload').addEventListener('click', downloadCloudMap);
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

  // Подтверждение кода с камеры: «Отметить» и «Отменить», как в приложении
  $('qrMark').addEventListener('click', () => {
    const pending = state.pendingQr;
    if (!pending || !pending.code) return;
    const kind = startOrFinishOf(pending.code);
    if (settings().autoMark && !kind) {
      state.manualRefused = true;
      $('markHint').textContent = 'Включена автоматическая отметка: нажимать не нужно. '
        + 'Чтобы отмечаться вручную, выключите «Автоматическую отметку» в настройках.';
      $('markHint').classList.add('error');
      return;
    }
    markByCode(pending.code);
  });

  $('qrSkip').addEventListener('click', () => {
    state.pendingQr = null;
    state.autoQrCode = null;
    state.manualRefused = false;
    renderQrConfirm();
    showOutcome('skipped');
  });

  // Аварийная отметка: подтверждение или отказ
  $('emergencyConfirm').addEventListener('click', () => {
    $('emergencyDialog').classList.add('hidden');
    state.emergencyDismissed = true;
    if (state.emergencyPoint) markByCode(String(state.emergencyPoint));
  });
  $('emergencyWait').addEventListener('click', () => {
    $('emergencyDialog').classList.add('hidden');
    state.emergencyDismissed = true;
  });

  // Профиль: рисуем состояние и, если гость, кнопку входа ВК
  renderProfileState();
  renderVkOneTap();

  // Код поддержки нажимается и открывает ту же страницу, что зашита в коде
  $('supportQr').addEventListener('click', () => {
    window.open('https://spasibomir.ru/pay/35620', '_blank', 'noopener');
  });
  $('profileChangeNick').addEventListener('click', openNickDialog);
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

document.addEventListener('DOMContentLoaded', async () => {
  // Отложенные результаты: пробуем при запуске, затем по таймеру и при
  // появлении сети — очередь должна разбираться сама, без действий человека
  flushPendingResults().catch(() => {});
  setInterval(() => flushPendingResults().catch(() => {}), 20000);
  window.addEventListener('online', () => flushPendingResults().catch(() => {}));

  // Возврат из ВК: параметры адреса или уже сохранённый профиль
  handleVkRedirectReturn().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshIdentityFromStorage();
  });
  bind();
  updateProfileButtons();
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

  // Сохранённую копию поднимаем только если событие есть в списке скачанных
  const downloaded = (state.history || []).some((item) => saved && item.id === saved.id);
  if (saved && saved.distance && downloaded) {
    state.event = saved;
    state.marks = loadMarks(saved.id);
    updateSendState();
  } else if (saved && saved.distance) {
    // Запись осталась от удалённой группы: убираем, чтобы не всплывала на главном
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // приватный режим
    }
  }
  // «Открывать экран отметки при запуске» — как в приложении
  const activeRestored = saved && saved.distance && state.activeId === saved.id;

  // При открытии всегда главный экран. Исключение — настройка «открывать
  // экран отметки при запуске», и только если дистанция активна
  const first = activeRestored && settings().showOnStart ? 'mark' : 'events';

  // Под текущим экраном всегда лежит главный: «назад» из события ведёт
  // на список событий, а не закрывает приложение
  navStack = ['events'];
  history.replaceState({ depth: 1 }, '');

  showTab(first, { push: first !== 'events' });

  // Проверка хранилища при старте приложения: один раз за запуск.
  // При каждом возврате на главный её нет — только кнопка и протяжка
  syncFromCloud().catch(() => {});
});
