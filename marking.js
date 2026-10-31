/**
 * Отметки в веб-версии.
 *
 * Правила те же, что в приложении:
 *  • отметка возможна только внутри промежутка проведения;
 *  • старт — первая отметка, финиш — последняя;
 *  • по GPS отметка ставится, если расстояние до пункта не больше
 *    «погрешность пункта + погрешность приёмника + 5 м».
 *
 * Результат собирается из отметок и уходит в облако тем же действием result,
 * что и из приложения.
 */

const START_CODE = 1;
const FINISH_CODE = 2;
const START_CODE_ROGAINE = '01';
const FINISH_CODE_ROGAINE = '02';
const GPS_SLACK_METERS = 5;
const MAX_ACCURACY_METERS = 15;

/** Расстояние между двумя точками на земле, метры. */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function periodState(event, now = Date.now()) {
  if (now < event.startTime) return 'BEFORE';
  if (now > event.finishTime) return 'AFTER';
  return 'OK';
}

/** Можно ли отметить пункт из текущего положения. */
function canMark(point, position) {
  if (!position) return { ok: false, reason: 'Нет данных GPS: ждём спутники.' };
  if (position.accuracy > MAX_ACCURACY_METERS) {
    return {
      ok: false,
      reason: `Погрешность ${Math.round(position.accuracy)} м больше ${MAX_ACCURACY_METERS} м — ждём уточнения.`,
    };
  }
  const allowed = (point.accuracyMeters || 0) + position.accuracy + GPS_SLACK_METERS;
  const actual = distanceMeters(position.lat, position.lon, point.latitude, point.longitude);
  if (actual > allowed) {
    return {
      ok: false,
      reason: `До пункта ${Math.round(actual)} м, а можно ${Math.round(allowed)} м — подойдите ближе.`,
    };
  }
  return { ok: true, reason: '' };
}

/** Код пункта в виде строки: у ориентирования числа, у рогейна строки. */
function codeOf(point) {
  return point.code === undefined || point.code === null ? '' : String(point.code);
}

/**
 * Старт: у рогейна код «01», у ориентирования в данных бывает и 1, и 3.
 *
 * В облачных дистанциях старт хранится кодом 3 (MarkCodes.START), а в старых
 * записях и в коде QR — как 1/«01». Раньше здесь проверялась только единица,
 * поэтому старт с кодом 3 не считался стартом и приложение отвечало
 * «Вначале отметьте старт».
 */
function isStart(code, rogaine) {
  if (rogaine) return String(code) === START_CODE_ROGAINE;
  const value = Number(code);
  return value === START_CODE || value === 3;
}

function isFinish(code, rogaine) {
  return rogaine ? code === FINISH_CODE_ROGAINE : Number(code) === FINISH_CODE;
}

/** Отметки пунктов, без старта и финиша — в порядке времени. */
function pointMarks(marks) {
  return marks.filter((mark) => !mark.start && !mark.finish);
}

/**
 * Отметки одной попытки: от последнего старта до первого финиша.
 *
 * После финиша отмечаться можно, но в результат идут только отметки этого
 * отрезка. Без старта попытки нет — результат получает DNS.
 */
function attemptMarks(marks, rogaine) {
  const list = marks || [];
  let startAt = -1;
  list.forEach((mark, index) => {
    if (isStart(mark.code, rogaine)) startAt = index;
  });
  if (startAt < 0) return [];
  const attempt = list.slice(startAt);
  const finishAt = attempt.findIndex((mark) => isFinish(mark.code, rogaine));
  return finishAt >= 0 ? attempt.slice(0, finishAt + 1) : attempt;
}

/** Собрать результат для отправки в облако. */
function buildResult(event, marks, identity) {
  const attempt = attemptMarks(marks, rogaineMode());
  const start = attempt.find((mark) => isStart(mark.code, rogaineMode()));
  const finish = attempt.find((mark) => isFinish(mark.code, rogaineMode()));
  return {
    userId: identity.code,
    nick: identity.nick,
    startTime: start ? start.time : 0,
    finishTime: finish ? finish.time : 0,
    // Версия строки: по ней слияние решает, чья запись новее
    updatedAt: Date.now(),
    marks: attempt.map((mark) => ({ code: mark.code, time: mark.time })),
  };
}

/* ─────────────────────────── QR-коды ─────────────────────────── */

/** Алфавит и ключ сдвига — те же, что в приложении (QrCode.kt). */
const QR_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const QR_KEY = '1234567890';
const QR_LENGTH = 10;

/** Снимает сдвиг: обратная операция к кодированию. */
function decodeQrShift(code) {
  const value = String(code || '').trim().toUpperCase();
  if (value.length !== QR_LENGTH) return null;

  let result = '';
  for (let index = 0; index < value.length; index++) {
    const position = QR_ALPHABET.indexOf(value[index]);
    if (position < 0) return null;
    const step = Number(QR_KEY[index]);
    const moved = ((position - step) % QR_ALPHABET.length + QR_ALPHABET.length) % QR_ALPHABET.length;
    result += QR_ALPHABET[moved];
  }
  return result;
}

/**
 * Разбирает QR пункта: первый знак — вид («O» дистанция, «R» рогейн),
 * затем номер пункта и последние семь знаков кода автора.
 *
 * Возвращает { kind, code } либо { error } — как в MarkCodes/RogaineQr.
 */
function parsePointQr(raw, ownerId, rogaineMode) {
  const plain = decodeQrShift(raw);
  if (!plain) return { error: 'unknown' };

  const marker = plain[0];
  let number;
  let author;

  if (marker === 'O') {
    author = plain.slice(1, 8);
    number = plain.slice(8, 10);
  } else if (marker === 'R') {
    number = plain.slice(1, 3);
    author = plain.slice(3, 10);
  } else {
    return { error: 'unknown' };
  }

  const expectedKind = rogaineMode ? 'R' : 'O';
  if (marker !== expectedKind) return { error: 'other-kind' };

  // Автор проверяется по хвосту кода: в QR лежат последние семь знаков
  const owner = String(ownerId || '').trim().toUpperCase();
  if (owner && !owner.endsWith(author)) return { error: 'foreign' };

  return { kind: marker === 'O' ? 'distance' : 'rogaine', code: number };
}
