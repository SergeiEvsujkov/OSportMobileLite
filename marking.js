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

function isStart(code, rogaine) {
  return rogaine ? code === START_CODE_ROGAINE : Number(code) === START_CODE;
}

function isFinish(code, rogaine) {
  return rogaine ? code === FINISH_CODE_ROGAINE : Number(code) === FINISH_CODE;
}

/** Отметки пунктов, без старта и финиша — в порядке времени. */
function pointMarks(marks) {
  return marks.filter((mark) => !mark.start && !mark.finish);
}

/** Собрать результат для отправки в облако. */
function buildResult(event, marks, identity) {
  const start = marks.find((mark) => mark.start);
  const finish = marks.find((mark) => mark.finish);
  return {
    userId: identity.code,
    nick: identity.nick,
    startTime: start ? start.time : 0,
    finishTime: finish ? finish.time : 0,
    marks: marks.map((mark) => ({ code: mark.code, time: mark.time })),
  };
}
