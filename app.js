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
};

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
    'Скачивание события целиком появится вместе с действием get в функции: ' +
    'сейчас в браузере доступны только сведения из каталога.';
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

  $('download').addEventListener('click', () => {
    setStatus(
      'Скачивание события целиком — следующий шаг: нужно действие get в функции.',
      true
    );
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
  $('version').textContent = 'каркас 0.1';
});
