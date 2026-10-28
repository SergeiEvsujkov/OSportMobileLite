/**
 * OSportMobile Lite — каркас.
 *
 * Что уже есть: найти событие по номеру в облаке и показать его карточку.
 * Чего ещё нет: скачивание события целиком, отметки, отправка результата.
 *
 * Облачная функция живёт по адресу ниже. Браузер сможет её вызвать только
 * после того, как функция начнёт отвечать на CORS-запросы (заголовки
 * Access-Control-Allow-Origin и ответ на OPTIONS) — это следующий шаг.
 */

const CONFIG = {
  functionUrl: 'https://functions.yandexcloud.net/d4eebmhdf007eak5nkbo',
  // Куда браузер ходит за событием целиком. Появится вместе с действием `get`.
  eventUrl: null,
};

const $ = (id) => document.getElementById(id);

const state = {
  entry: null,
  event: null,
};

const STORAGE_KEY = 'osport.lite.event';

/** Скачанное событие переживает перезагрузку страницы. */
function saveEvent(event) {
  state.event = event;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch (error) {
    // Приватный режим может запретить запись — работаем без сохранения
  }
}

function loadSavedEvent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setStatus(text, isError = false) {
  const node = $('status');
  node.textContent = text;
  node.classList.toggle('error', isError);
}

function formatPeriod(start, finish) {
  if (!start || !finish) return '';
  const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const from = new Date(start).toLocaleString('ru-RU', options);
  const to = new Date(finish).toLocaleString('ru-RU', options);
  return `${from} — ${to}`;
}

async function callFunction(action, extra = '') {
  const url = `${CONFIG.functionUrl}?${action}${extra}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch (error) {
    // fetch падает именно так, когда сервер не разрешил запрос из браузера
    throw new Error(
      'Сервис не разрешил запрос из браузера (CORS). Это настройка функции — следующий шаг.'
    );
  }
  if (!response.ok) {
    throw new Error(`Сервис ответил ошибкой ${response.status}`);
  }
  return response.json();
}

async function findByNumber(number) {
  const data = await callFunction('action=list&full=1&rogaine=1');
  const entries = data.entries || [];
  const found = entries.find((entry) => String(entry.number) === String(number));

  if (!found) {
    throw new Error(`Событие с номером ${number} не найдено`);
  }

  state.entry = found;
  renderEvent(found);
}

function renderEvent(entry) {
  $('eventCard').classList.remove('hidden');
  $('eventName').textContent = entry.name || 'Без названия';
  $('eventNumber').textContent = entry.number ? `№ ${entry.number}` : 'без номера';
  $('eventOrganizer').textContent = entry.organizer
    ? `Организатор: ${entry.organizer}`
    : 'Организатор не указан';
  $('eventPeriod').textContent = formatPeriod(entry.startTime, entry.finishTime);

  const details = [];
  if (entry.kind === 'rogaine') {
    if (entry.checkPointCount) details.push(`${entry.checkPointCount} КП`);
    if (entry.maxScore) details.push(`максимум ${entry.maxScore} баллов`);
  } else {
    if (entry.checkPointCount) details.push(`${entry.checkPointCount} КП`);
    if (entry.lengthMeters) details.push(`${entry.lengthMeters} м`);
  }
  if (entry.participants) details.push(`участников: ${entry.participants}`);
  $('eventDetails').textContent = details.join(' · ');

  $('eventHint').textContent =
    'Скачивание сохраняет событие на устройстве: после этого его можно пройти без сети.';
}

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

      saveEvent({ id: entry.id, kind: data.kind, distance: data.distance });

      const points = data.distance.points || [];
      $('marksSummary').textContent = `Пунктов в событии: ${points.length}`;
      $('openMark').disabled = false;
      $('markCard').classList.remove('hidden');
      $('eventHint').textContent = 'Событие сохранено на устройстве. Дальше — отметки.';
      setStatus('Событие скачано');
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {
    // В подкаталоге Pages путь может отличаться — это не критично для каркаса
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  registerServiceWorker();
  $('version').textContent = 'каркас 0.2';

  // Ранее скачанное событие показываем сразу: страницу могли открыть без сети
  const saved = loadSavedEvent();
  if (saved && saved.distance) {
    state.event = saved;
    const points = saved.distance.points || [];
    $('marksSummary').textContent = `Пунктов в событии: ${points.length}`;
    $('markCard').classList.remove('hidden');
    $('openMark').disabled = false;
  }
});
