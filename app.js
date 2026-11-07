/**
 * OSportMobile Lite вЂ” СѓС‡Р°СЃС‚РЅРёРє: РІС‹Р±СЂР°Р» СЃРѕР±С‹С‚РёРµ РІ РѕР±Р»Р°РєРµ, СЃРєР°С‡Р°Р», РѕС‚РјРµС‚РёР»СЃСЏ, РѕС‚РїСЂР°РІРёР».
 *
 * Р“Р»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ РїРѕРІС‚РѕСЂСЏРµС‚ РїСЂРёР»РѕР¶РµРЅРёРµ: РєР°СЂС‚РѕС‡РєРё СЃРѕР±С‹С‚РёР№ СЃРѕ РІР»РѕР¶РµРЅРЅС‹РјРё РґРёСЃС‚Р°РЅС†РёСЏРјРё.
 * РЎРѕР·РґР°РЅРёСЏ, Р°СЂС…РёРІР° Рё С„РёР»СЊС‚СЂРѕРІ РЅРµС‚ вЂ” lite С‚РѕР»СЊРєРѕ РїСЂРѕС…РѕРґРёС‚.
 */

const CONFIG = {
  // РҐСЂР°РЅРёР»РёС‰Рµ, РѕС‚РєСѓРґР° Р±РµСЂСѓС‚СЃСЏ РєР°СЂС‚С‹ РґРёСЃС‚Р°РЅС†РёР№ (РєР°Рє DEFAULT_BUCKET РІ РїСЂРёР»РѕР¶РµРЅРёРё)
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
  screen: 'osport.lite.screen',   // РєР°РєРѕР№ СЌРєСЂР°РЅ Р±С‹Р» РѕС‚РєСЂС‹С‚
  vkNames: 'osport.lite.vkNames', // РЅРёРє РїРѕ РєР°Р¶РґРѕРјСѓ РїСЂРѕС„РёР»СЋ Р’Рљ РЅР° СЌС‚РѕРј СѓСЃС‚СЂРѕР№СЃС‚РІРµ
  pendingResults: 'osport.lite.pendingResults', // СЂРµР·СѓР»СЊС‚Р°С‚С‹, РєРѕС‚РѕСЂС‹Рµ РЅРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ
};

const state = {
  event: null,
  activeId: null,   // id Р°РєС‚РёРІРёСЂРѕРІР°РЅРЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё
  marks: [],
  position: null,
  heading: 0,
  headingSeen: false,
  lastHeadingAt: 0,
  headingAbsolute: false,
  hintBearing: null,
  watchId: null,
  candidate: null,
  // Р‘СѓС„РµСЂ РїРѕСЃР»РµРґРЅРёС… GPS-С‚РѕС‡РµРє: РЅР° Р±РµРіСѓ РѕС‚РјРµС‡Р°РµРј Р±Р»РёР¶Р°Р№С€СѓСЋ, Р° РЅРµ РїРѕСЃР»РµРґРЅСЋСЋ
  recentFixes: [],
  candidateFix: null,
  history: [],
  // РћРґРёРЅ РѕР±РјРµРЅ СЃ РѕР±Р»Р°РєРѕРј Р·Р° СЂР°Р·: РїР°СЂР°Р»Р»РµР»СЊРЅС‹Рµ РѕС‚РїСЂР°РІРєР°/РѕР±РЅРѕРІР»РµРЅРёРµ С‚РµСЂСЏСЋС‚ СЃС‚СЂРѕРєРё
  syncing: false,
  sending: false,
  flushing: false,
  // Р­РєСЂР°РЅ РѕС‚РјРµС‚РєРё: РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ QR, РѕС‚РєР°Р·С‹ Рё Р°РІР°СЂРёР№РЅР°СЏ РѕС‚РјРµС‚РєР°
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
  // Р’РѕР·РІСЂР°С‚ СЃ РѕС‚РјРµС‚РєРё РЅР° РїРѕР»РЅРѕСЌРєСЂР°РЅРЅСѓСЋ РєР°СЂС‚Сѓ
  returnToMap: false,
  autoReturnUsed: false,
  mapReturnTimer: null,
};

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ С…СЂР°РЅРёР»РёС‰Рµ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

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
    // РџСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј РјРѕР¶РµС‚ Р·Р°РїСЂРµС‚РёС‚СЊ Р·Р°РїРёСЃСЊ вЂ” СЂР°Р±РѕС‚Р°РµРј Р±РµР· СЃРѕС…СЂР°РЅРµРЅРёСЏ
  }
}

function marksKey(eventId) {
  return STORAGE.marks + '.' + eventId;
}

function hintTargetKey(eventId) {
  return 'osport.lite.hintTarget.' + eventId;
}

function clearHintTarget(eventId) {
  if (!eventId) return;
  try {
    localStorage.removeItem(hintTargetKey(eventId));
  } catch (error) {
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј вЂ” РїСЂРѕСЃС‚Рѕ РЅРµ СЃРѕС…СЂР°РЅСЏРµРј
  }
}

function loadMarks(eventId) {
  return eventId ? readJson(marksKey(eventId), []) : [];
}

function saveMarks() {
  if (state.event) writeJson(marksKey(state.event.id), state.marks);
}

/** РЎРєР°С‡Р°РЅРЅС‹Рµ СЃРѕР±С‹С‚РёСЏ: СЃРїРёСЃРѕРє РєР°СЂС‚РѕС‡РµРє РЅР° РіР»Р°РІРЅРѕРј СЌРєСЂР°РЅРµ. */
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

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РѕР±Р»Р°РєРѕ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/** РЎРѕРѕР±С‰РµРЅРёРµ РІРЅРёР·Сѓ вЂ” РєР°Рє Snackbar: СЃР°РјРѕ РіР°СЃРЅРµС‚ С‡РµСЂРµР· 4 СЃРµРєСѓРЅРґС‹. */
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
  // РњРµС‚РєР° РІСЂРµРјРµРЅРё Рё no-store: РёРЅР°С‡Рµ Р±СЂР°СѓР·РµСЂ РѕС‚РґР°С‘С‚ РїСЂРѕС€Р»С‹Р№ РєР°С‚Р°Р»РѕРі,
  // Рё РёР·РјРµРЅРµРЅРёСЏ РІ РѕР±Р»Р°РєРµ РІРёРґРЅС‹ РЅРµ СЃСЂР°Р·Сѓ
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
    throw new Error('РЎРµСЂРІРёСЃ РЅРµ СЂР°Р·СЂРµС€РёР» Р·Р°РїСЂРѕСЃ РёР· Р±СЂР°СѓР·РµСЂР° (CORS).');
  }
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = null;
  }
  if (!response.ok) {
    throw new Error(parsed && parsed.error ? parsed.error : `РћС€РёР±РєР° ${response.status}`);
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

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РІРєР»Р°РґРєРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/**
 * РќР°РІРёРіР°С†РёСЏ РјРµР¶РґСѓ СЌРєСЂР°РЅР°РјРё.
 *
 * РљР°Р¶РґС‹Р№ РїРµСЂРµС…РѕРґ РїРёС€РµС‚СЃСЏ РІ РёСЃС‚РѕСЂРёСЋ Р±СЂР°СѓР·РµСЂР°, РїРѕСЌС‚РѕРјСѓ СЃРёСЃС‚РµРјРЅР°СЏ РєРЅРѕРїРєР° В«РЅР°Р·Р°РґВ»
 * РІРѕР·РІСЂР°С‰Р°РµС‚ РЅР° РїСЂРµРґС‹РґСѓС‰РёР№ СЌРєСЂР°РЅ, Р° РЅРµ Р·Р°РєСЂС‹РІР°РµС‚ РїСЂРёР»РѕР¶РµРЅРёРµ.
 */
let navStack = ['events'];
let ignoreNextPop = false;   // РІС‹С…РѕРґ РёР· РїРѕР»РЅРѕРіРѕ СЌРєСЂР°РЅР° РєРЅРѕРїРєРѕР№ РЅРµ РјРµРЅСЏРµС‚ СЌРєСЂР°РЅ

function showTab(name, options = {}) {
  const push = options.push !== false;

  // Р­РєСЂР°РЅ РѕС‚РјРµС‚РєРё Р±РµР· Р°РєС‚РёРІРЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё РЅРµ РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ: СЃРЅР°С‡Р°Р»Р° Р°РєС‚РёРІРёСЂСѓР№С‚Рµ
  if (name === 'mark' && (!state.event || state.activeId !== state.event.id)) {
    setStatus('РЎРЅР°С‡Р°Р»Р° Р°РєС‚РёРІРёСЂСѓР№С‚Рµ СЃРѕР±С‹С‚РёРµ', 'error');
    return;
  }
  // Р’РЅРµ РїСЂРѕРјРµР¶СѓС‚РєР° РїСЂРѕРІРµРґРµРЅРёСЏ РѕС‚РјРµС‚РєР° РЅРµ РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  if (name === 'mark') {
    const source = (state.event && (state.event.entry || state.event.distance)) || {};
    const block = markingPeriodBlock(source);
    if (block) {
      showPeriodWarning(block.before, block.time);
      return;
    }
  }

  // РџРµСЂРµС…РѕРґ РЅР° РґСЂСѓРіРѕР№ СЌРєСЂР°РЅ СѓР±РёСЂР°РµС‚ РїСЂРѕС€Р»РѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
  setStatus('');
  // РћС‚РєСЂС‹С‚РёРµ СЌРєСЂР°РЅР° РѕС‚РјРµС‚РєРё: СЃРЅР°С‡Р°Р»Р° С‡РёСЃС‚РёРј РѕС‚РјРµС‚РєРё РїРѕ РїСЂР°РІРёР»Р°Рј СЃС‚Р°СЂС‚Р° Рё С„РёРЅРёС€Р°
  if (name === 'mark') {
    sanitizeMarks();
    state.pendingQr = null;
    state.autoQrCode = null;
    state.manualRefused = false;
    state.emergencyKey = null;
    state.emergencyDismissed = false;
    state.recentFixes = [];
    state.candidateFix = null;
  }
  $('homeScreen').classList.toggle('hidden', name !== 'events');
  $('groupScreen').classList.toggle('hidden', name !== 'group');
  $('participantScreen').classList.toggle('hidden', name !== 'participant');
  $('analysisScreen').classList.toggle('hidden', name !== 'analysis');
  $('settingsScreen').classList.toggle('hidden', name !== 'settings');
  $('detailScreen').classList.toggle('hidden', name !== 'detail');
  $('cloudScreen').classList.toggle('hidden', name !== 'cloud');
  $('markScreen').classList.toggle('hidden', name !== 'mark');
  $('profileScreen').classList.toggle('hidden', name !== 'profile');

  $('tabEvents').classList.toggle('active',
    name === 'events' || name === 'cloud' || name === 'detail' || name === 'group'
    || name === 'participant' || name === 'analysis');
  $('tabMark').classList.toggle('active', name === 'mark');
  $('tabProfile').classList.toggle('active', name === 'profile');

  if (push && navStack[navStack.length - 1] !== name) {
    navStack.push(name);
    history.pushState({ depth: navStack.length }, '');
  }

  // Р—Р°РїРѕРјРёРЅР°РµРј СЌРєСЂР°РЅ: РїРѕСЃР»Рµ РѕР±РЅРѕРІР»РµРЅРёСЏ РїСЂРёР»РѕР¶РµРЅРёСЏ РѕСЃС‚Р°С‘РјСЃСЏ С‚Р°Рј Р¶Рµ, Р° РЅРµ РЅР° РіР»Р°РІРЅРѕРј
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
      checkLocationAccess();
      startWatch();
    }
    renderMark();
  } else {
    stopQrScanner();
  }
  if (name === 'profile') updateSendState();
  if (name === 'events') renderHome();
}

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РіР»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/** РљР°СЂС‚РѕС‡РєРё СЃРєР°С‡Р°РЅРЅС‹С… СЃРѕР±С‹С‚РёР№: РєР°Рє РЅР° РіР»Р°РІРЅРѕРј СЌРєСЂР°РЅРµ РїСЂРёР»РѕР¶РµРЅРёСЏ. */
/**
 * Р“Р»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ вЂ” РєР°СЂС‚РѕС‡РєР° РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё.
 *
 * РћРґРёРЅРѕС‡РЅР°СЏ Р·Р°РїРёСЃСЊ (Р±РµР· groupId РёР»Рё РѕРґРЅР° РІ РіСЂСѓРїРїРµ): СЃРІРµРґРµРЅРёСЏ РїСЂСЏРјРѕ РІ РєР°СЂС‚РѕС‡РєРµ,
 * РЅРёР¶Рµ Р·РЅР°С‡РєРё СЃРїРѕСЃРѕР±Р° РѕС‚РјРµС‚РєРё Рё Р°РІС‚РѕСЂ СЃ РёРјРµРЅРµРј. РќРµСЃРєРѕР»СЊРєРѕ РґРёСЃС‚Р°РЅС†РёР№ РѕРґРЅРѕР№
 * РіСЂСѓРїРїС‹: Р°РІС‚РѕСЂ РїРѕРґ СЃСЂРѕРєР°РјРё, Р° РґРёСЃС‚Р°РЅС†РёРё вЂ” РІР»РѕР¶РµРЅРЅС‹РјРё СЂР°РјРєР°РјРё.
 */
function renderHome() {
  const list = $('eventsList');
  list.textContent = '';

  // РЎРєР°С‡Р°РЅРЅРѕРµ вЂ” СЌС‚Рѕ Р·Р°РїРёСЃРё РІ РёСЃС‚РѕСЂРёРё. РЎРѕС…СЂР°РЅС‘РЅРЅР°СЏ РєРѕРїРёСЏ СЃРѕР±С‹С‚РёСЏ, РєРѕС‚РѕСЂРѕР№ С‚Р°Рј
  // РЅРµС‚, СЃС‡РёС‚Р°РµС‚СЃСЏ СЃРёСЂРѕС‚РѕР№ (РѕСЃС‚Р°Р»Р°СЃСЊ РѕС‚ СѓРґР°Р»С‘РЅРЅРѕР№ РіСЂСѓРїРїС‹) Рё РЅРµ РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ
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

  // Р—РЅР°С‡РѕРє РµСЃС‚СЊ С‚РѕР»СЊРєРѕ Сѓ РіСЂСѓРїРїС‹: Сѓ РѕРґРёРЅРѕС‡РЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё Р»РѕРіРѕС‚РёРїР° РЅРµС‚
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
  title.textContent = (number ? `в„– ${number} ` : '') + (first.name || 'Р‘РµР· РЅР°Р·РІР°РЅРёСЏ');
  head.append(title);
  card.append(head);
  const activeId = state.activeId;

  if (items.length > 1) {
    // Р’СЃСЏ РєР°СЂС‚РѕС‡РєР° РіСЂСѓРїРїС‹ РѕС‚РєСЂС‹РІР°РµС‚ РіСЂСѓРїРїСѓ, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
    try {
      openGroup();
    } catch (error) {
      setStatus('РћС€РёР±РєР° СЌРєСЂР°РЅР° РіСЂСѓРїРїС‹: ' + error.message, 'error');
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
    // Р“СЂСѓРїРїР°: Р°РІС‚РѕСЂ РѕРґРёРЅ РЅР° РІСЃСЋ РєР°СЂС‚РѕС‡РєСѓ, РґРёСЃС‚Р°РЅС†РёРё вЂ” РІРѕ РІР»РѕР¶РµРЅРЅС‹С… СЂР°РјРєР°С…
    card.append(authorRow(first, true, false, items[0].distance));
    items.forEach((item) => {
      const inner = document.createElement('div');
      inner.className = 'distance-card';
      if (event && event.id === item.id) inner.classList.add('active');

      // РќР°С‡Р°С‚Р°СЏ РґРёСЃС‚Р°РЅС†РёСЏ РІРЅСѓС‚СЂРё РіСЂСѓРїРїС‹ РїРѕРґСЃРІРµС‡РёРІР°РµС‚СЃСЏ СЃР°РјР°, Р° РЅРµ РІСЃСЏ РєР°СЂС‚РѕС‡РєР°
      if (item.id === activeId) inner.classList.add('active-event');
      inner.append(detailsLine(item), iconsRow(false, item.entry, item.distance));
      if (pendingResultFor(item.id)) inner.append(pendingRow());
      if (item.entry && item.entry.mapExt) inner.append(mapLine());
      if (hintsAvailable(item)) inner.append(hintsLine());
      inner.addEventListener('click', (event) => {
        // Р”РёСЃС‚Р°РЅС†РёСЏ РІРЅСѓС‚СЂРё РєР°СЂС‚РѕС‡РєРё: РЅРµ РґР°С‘Рј СЃРѕР±С‹С‚РёСЋ РґРѕР№С‚Рё РґРѕ РіСЂСѓРїРїС‹
        event.stopPropagation();
        activateItem(item);
      });
      card.append(inner);
    });
    list.append(card);
    return;
  }

  // РћРґРёРЅРѕС‡РЅР°СЏ Р·Р°РїРёСЃСЊ: СЃРІРµРґРµРЅРёСЏ РїСЂСЏРјРѕ РІ РєР°СЂС‚РѕС‡РєРµ
  const item = items[0];
  const distance = item.distance || {};
  const entry = item.entry || {};

  if (item.id === activeId) card.classList.add('active-event');

  // Р’СЃСЏ РєР°СЂС‚РѕС‡РєР° РѕС‚РєСЂС‹РІР°РµС‚ СЃРѕР±С‹С‚РёРµ: РІ РїСЂРёР»РѕР¶РµРЅРёРё РєР°СЂС‚РѕС‡РєР° РєР»РёРєР°Р±РµР»СЊРЅР° С†РµР»РёРєРѕРј
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => activateItem(item));

  if (item.kind === 'rogaine') {
    const counts = [];
    if (distance.points) counts.push(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${distance.points.length}`);
    if (entry.maxScore) counts.push(`РњР°РєСЃ. Р±Р°Р»Р»: ${entry.maxScore}`);
    if (counts.length) card.append(plainRow(counts.join(' В· ')));

    const control = [];
    if (distance.controlTimeMinutes) control.push(`РљРѕРЅС‚СЂ.РІСЂРµРјСЏ: ${distance.controlTimeMinutes} РјРёРЅ`);
    if (distance.penaltyPerMinute || entry.penaltyPerMinute) {
      control.push(`РЁС‚СЂР°С„: ${distance.penaltyPerMinute || entry.penaltyPerMinute} Р±Р°Р»Р»/РјРёРЅ`);
    }
    if (control.length) card.append(plainRow(control.join(' В· ')));

    card.append(plainRow(`РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${participantCount(distance.results)}`));
  } else {
    card.append(detailsLine(item));
  }

  if (entry.mapExt) card.append(mapLine());
  if (hintsAvailable(item)) card.append(hintsLine());

  // РЎРІРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚ РЅР° РєР°СЂС‚РѕС‡РєРµ вЂ” РєР°Рє events_my_result РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const meCode = readJson(STORAGE.identity, { nick: '', code: '' }).code;
  if (meCode) {
    const mine = bestOwnProtocolRow(buildProtocol(distance), meCode, distance);
    if (mine) {
      const parts = [];
      if (mine.status === 'OK') parts.push(formatDuration(mine.elapsed));
      if (item.kind === 'rogaine') parts.push(`Р‘Р°Р»Р»С‹: ${mine.total}`);
      if (mine.status !== 'OK') {
        parts.push(mine.status);
      } else if (mine.place) {
        parts.push(`РјРµСЃС‚Рѕ ${mine.place}`);
      }
      card.append(plainRow(`РњРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚: ${parts.join(' В· ')}`));
    }
  }
  if (pendingResultFor(item.id)) card.append(pendingRow());

  const authorLine = authorRow(entry, true, true, distance);
  const kindTag = document.createElement('span');
  kindTag.className = 'kind-tag';
  kindTag.textContent = item.kind === 'rogaine' ? 'Р РћР“Р•Р™Рќ' : '';
  if (kindTag.textContent) authorLine.append(kindTag);
  card.append(authorLine);

  list.append(card);
}

/**
 * Р•СЃС‚СЊ Р»Рё РїРѕ Р·Р°РїРёСЃРё РЅРµРѕС‚РїСЂР°РІР»РµРЅРЅС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚.
 *
 * РћС‡РµСЂРµРґСЊ С…СЂР°РЅРёС‚ РєР»СЋС‡Рё РІРёРґР° `distances/<id>.osport`, РїРѕСЌС‚РѕРјСѓ СЃРІРµСЂСЏРµРј РїРѕ id.
 */
function pendingResultFor(id) {
  const list = readJson(STORAGE.pendingResults, []);
  return list.some((item) => String(item.key || '').includes('/' + id + '.'));
}

/**
 * РћРґРёРЅР°РєРѕРІС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚: С‚РѕС‚ Р¶Рµ СѓС‡Р°СЃС‚РЅРёРє, РІСЂРµРјСЏ Рё РѕС‚РјРµС‚РєРё.
 *
 * РќРёРє Рё РІСЂРµРјСЏ Р·Р°РїРёСЃРё РЅРµ СЃСЂР°РІРЅРёРІР°СЋС‚СЃСЏ вЂ” СЌС‚Рѕ РїРѕРґРїРёСЃСЊ Рё СЃР»СѓР¶РµР±РЅРѕРµ РїРѕР»Рµ.
 * РџРѕСЂСЏРґРѕРє РѕС‚РјРµС‚РѕРє РІР°Р¶РµРЅ: РѕРЅ Рё РµСЃС‚СЊ РїСЂРѕС…РѕР¶РґРµРЅРёРµ.
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

/** РЎРєРѕР»СЊРєРѕ СѓС‡Р°СЃС‚РЅРёРєРѕРІ: РЅРµСЃРєРѕР»СЊРєРѕ СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ РѕРґРЅРѕРіРѕ userId вЂ” РѕРґРёРЅ СѓС‡Р°СЃС‚РЅРёРє. */
function participantCount(results) {
  return new Set(
    (Array.isArray(results) ? results : [])
      .map((row) => String((row && row.userId) || ''))
      .filter(Boolean)
  ).size;
}

/**
 * РЎР»РёРІР°РµС‚ СЂРµР·СѓР»СЊС‚Р°С‚С‹ РѕР±Р»Р°РєР° СЃ Р»РѕРєР°Р»СЊРЅС‹РјРё.
 *
 * РЎРІРѕРё СЂРµР·СѓР»СЊС‚Р°С‚С‹, РєРѕС‚РѕСЂС‹С… РІ РѕР±Р»Р°РєРµ РµС‰С‘ РЅРµС‚ (РѕС‡РµСЂРµРґСЊ РЅРµ РѕС‚РїСЂР°РІРёР»Р°СЃСЊ), РґРѕР»Р¶РЅС‹
 * РѕСЃС‚Р°РІР°С‚СЊСЃСЏ РІРёРґРёРјС‹РјРё: РёРЅР°С‡Рµ РѕР±РЅРѕРІР»РµРЅРёРµ РёР· РѕР±Р»Р°РєР° В«СЃСЉРµРґР°Р»РѕВ» Р±С‹ С‚РѕР»СЊРєРѕ С‡С‚Рѕ
 * Р·Р°РїРёСЃР°РЅРЅС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚.
 */
function mergeResults(cloudResults, localResults) {
  const pending = readJson(STORAGE.pendingResults, []);
  const pendingUsers = new Set(pending.map((item) => String((item.result || {}).userId)));

  // Р’РµСЂСЃРёСЏ СЂРµР·СѓР»СЊС‚Р°С‚Р°: РІСЂРµРјСЏ С„РёРЅРёС€Р°, Сѓ РЅРµР·Р°РІРµСЂС€С‘РЅРЅРѕРіРѕ вЂ” РїРѕСЃР»РµРґРЅСЏСЏ РѕС‚РјРµС‚РєР°
  const lastMarkTime = (row) => {
    const marks = (row && Array.isArray(row.marks)) ? row.marks : [];
    return marks.reduce((max, mark) => Math.max(max, Number(mark && mark.time) || 0), 0);
  };
  const version = (row) =>
    Number(row && row.finishTime) || lastMarkTime(row) || Number(row && row.updatedAt) || 0;

  // РҐСЂР°РЅРёРј Р’РЎР• СЂР°Р·РЅС‹Рµ СЂРµР·СѓР»СЊС‚Р°С‚С‹, Р° РЅРµ РїРѕ РѕРґРЅРѕРјСѓ РЅР° СѓС‡Р°СЃС‚РЅРёРєР°: РЅР°СЃС‚СЂРѕР№РєР°
  // СЃРѕР±С‹С‚РёСЏ СЂРµС€Р°РµС‚ С‚РѕР»СЊРєРѕ РїРѕРєР°Р· РІ РїСЂРѕС‚РѕРєРѕР»Рµ
  const merged = [];
  // РЎС‚Р°СЂС‹С… РїРѕР»РµР№ РїРѕРїС‹С‚РѕРє Р±РѕР»СЊС€Рµ РЅРµС‚: СЃРµСЂРІРµСЂ РёС… РЅРµ РїСЂРёСЃС‹Р»Р°РµС‚, Рё С…СЂР°РЅРёС‚СЊ РёС…
  // РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ РЅРµР·Р°С‡РµРј
  const clean = (row) => {
    const copy = Object.assign({}, row);
    delete copy.attempt;
    delete copy.duplicate;
    return copy;
  };
  const indexOfSame = (row) => merged.findIndex((other) => sameResult(other, row));
  const add = (row, preferNew) => {
    if (!row || !row.userId) return;
    const cleanRow = clean(row);
    const index = indexOfSame(cleanRow);
    if (index < 0) {
      merged.push(cleanRow);
      return;
    }
    // РћРґРёРЅР°РєРѕРІС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚ РЅРµ РґСѓР±Р»РёСЂСѓРµРј; РёР· РґРІСѓС… РєРѕРїРёР№ РѕСЃС‚Р°РІР»СЏРµРј РЅРѕРІРµРµ
    if (preferNew && version(cleanRow) >= version(merged[index])) merged[index] = cleanRow;
  };
  // РћР±Р»Р°РєРѕ вЂ” РёСЃС‚РѕС‡РЅРёРє РїСЂР°РІРґС‹: С‡РµРіРѕ РІ РЅС‘Рј РЅРµС‚, С‚РѕРіРѕ РЅРµС‚ Рё РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ.
  // РСЃРєР»СЋС‡РµРЅРёРµ вЂ” СЃРІРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚, РµС‰С‘ РЅРµ СѓС€РµРґС€РёР№ РІ РѕР±Р»Р°РєРѕ (РѕС‡РµСЂРµРґСЊ)
  (cloudResults || []).forEach((row) => add(row, true));
  (localResults || []).forEach((row) => {
    if (!row || !row.userId) return;
    if (!pendingUsers.has(String(row.userId))) return;
    add(row, true);
  });
  return merged;
}

/**
 * РћР±РЅРѕРІР»СЏРµС‚ СЃРєР°С‡Р°РЅРЅРѕРµ РёР· РѕР±Р»Р°РєР°: РєР°СЂС‚РѕС‡РєРё, СЂРµР·СѓР»СЊС‚Р°С‚С‹ Рё РїСЂРѕС‚РѕРєРѕР»С‹.
 *
 * РџСЂР°РІРёР»Рѕ РѕРґРЅРѕ РґР»СЏ РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРёСЏ Рё СЂРѕРіРµР№РЅР°: Сѓ РѕР±РѕРёС… Р·Р°РїРёСЃСЊ РѕР±РЅРѕРІР»СЏРµС‚СЃСЏ
 * С†РµР»РёРєРѕРј РёР· РѕР±Р»Р°РєР°, Р° РѕС‚РјРµС‚РєРё Рё Р°РєС‚РёРІРЅРѕСЃС‚СЊ РѕСЃС‚Р°СЋС‚СЃСЏ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ.
 */
/**
 * РЎРѕР±РёСЂР°РµС‚ entry РёР· СЃРІРµР¶РµР№ РґРёСЃС‚Р°РЅС†РёРё, СЃРѕС…СЂР°РЅСЏСЏ С‚РѕР»СЊРєРѕ Р»РѕРєР°Р»СЊРЅС‹Рµ РїРѕР»СЏ.
 * РћР±Р»Р°РєРѕ вЂ” РёСЃС‚РѕС‡РЅРёРє РёСЃС‚РёРЅС‹ РґР»СЏ Р°РІС‚РѕСЂР°, РЅР°Р·РІР°РЅРёСЏ, РіСЂСѓРїРїС‹, РЅРѕРјРµСЂР° Рё СЃСЂРѕРєРѕРІ.
 */
function entryFromCloud(previous, distance, id, kind) {
  const source = distance || {};
  const old = previous || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);
  const value = (key, fallback) => (has(key) ? source[key] : fallback);
  return Object.assign({}, old, {
    id,
    kind,
    name: value('name', old.name || ''),
    organizer: value('organizer', old.organizer || ''),
    ownerId: value('ownerId', old.ownerId || ''),
    groupId: value('groupId', old.groupId || ''),
    number: value('number', old.number),
    startTime: value('startTime', old.startTime),
    finishTime: value('finishTime', old.finishTime),
    markMode: value('markMode', old.markMode),
    isDraft: value('isDraft', old.isDraft),
  });
}

async function syncFromCloud() {
  if (state.syncing) return;
  const ids = new Set();
  (state.history || []).forEach((item) => ids.add(item.id));
  const savedGroup = readJson(STORAGE.group, null);
  ((savedGroup && savedGroup.items) || []).forEach((item) => ids.add(item.id));
  if (state.event) ids.add(state.event.id);
  if (state.activeId) ids.add(state.activeId);

  if (!ids.size) {
    setStatus('РЎРєР°С‡Р°РЅРЅС‹С… СЃРѕР±С‹С‚РёР№ РЅРµС‚: РѕР±РЅРѕРІР»СЏС‚СЊ РЅРµС‡РµРіРѕ', 'error');
    return;
  }

  state.syncing = true;
  setStatus(`РћР±РЅРѕРІР»СЏСЋ РёР· РѕР±Р»Р°РєР°вЂ¦ (Р·Р°РїРёСЃРµР№: ${ids.size})`);
  let updated = 0;
  let missing = 0;
  try {
    // РћР±РЅРѕРІР»СЏРµРј С‚РѕР»СЊРєРѕ СѓР¶Рµ СЃРєР°С‡Р°РЅРЅС‹Рµ Р·Р°РїРёСЃРё Рё С‚СЏРЅРµРј РёС… РїР°СЂР°Р»Р»РµР»СЊРЅРѕ:
    // РїРѕР»РЅС‹Р№ РєР°С‚Р°Р»РѕРі (list&full=1) РґР»СЏ СЌС‚РѕРіРѕ РЅРµ РЅСѓР¶РµРЅ, Р° РїРѕСЃР»РµРґРѕРІР°С‚РµР»СЊРЅС‹Рµ
    // Р·Р°РїСЂРѕСЃС‹ РґР°РІР°Р»Рё Р·Р°РґРµСЂР¶РєСѓ РІ РЅРµСЃРєРѕР»СЊРєРѕ СЃРµРєСѓРЅРґ
    const queue = Array.from(ids);
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const id = queue[cursor];
        cursor += 1;
        try {
          const full = await callFunction('action=get&id=' + encodeURIComponent(id));
          if (!full || !full.distance) {
            missing += 1;
            continue;
          }
          const previous = readJson(STORAGE.event + '.' + id, null);
          const kind = full.kind || (previous && previous.kind) || 'distance';
          const entry = entryFromCloud(
            (previous && previous.entry) || {},
            full.distance,
            id,
            kind
          );
          const localResults = (previous && previous.distance && previous.distance.results) || [];
          const distance = Object.assign({}, full.distance, {
            results: mergeResults(full.distance.results, localResults),
          });
          const item = {
            id,
            kind,
            key: 'distances/' + id + (kind === 'rogaine' ? '.rogaine' : '.osport'),
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
          // 404 вЂ” Р·Р°РїРёСЃСЊ СѓРґР°Р»РµРЅР° РІ РѕР±Р»Р°РєРµ; РїСЂРѕС‡РёРµ СЃР±РѕРё РЅРµ Р»РѕРјР°СЋС‚ РѕСЃС‚Р°Р»СЊРЅС‹Рµ
          if (/not found|404/i.test(String(error && error.message))) missing += 1;
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(4, queue.length) }, () => worker())
    );

    if (savedGroup) writeJson(STORAGE.group, savedGroup);
    renderHome();
    if (state.event) renderDetail();
    if (updated) setStatus(`РћР±РЅРѕРІР»РµРЅРѕ РёР· РѕР±Р»Р°РєР°: ${updated} РёР· ${ids.size}`, 'good');
    else if (missing) setStatus(`Р’ РѕР±Р»Р°РєРµ РЅРµ РЅР°Р№РґРµРЅРѕ Р·Р°РїРёСЃРµР№: ${missing}`, 'error');
    else setStatus('Р’ РѕР±Р»Р°РєРµ РЅРµС‚ РёР·РјРµРЅРµРЅРёР№');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    state.syncing = false;
  }
}

/** РЎС‚СЂРѕРєР° В«СЂРµР·СѓР»СЊС‚Р°С‚ РЅРµ РѕС‚РїСЂР°РІР»РµРЅВ» вЂ” РєСЂР°СЃРЅРѕРІР°С‚Р°СЏ, РєР°Рє РѕС‡РµСЂРµРґСЊ РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function pendingRow() {
  const row = plainRow('Р РµР·СѓР»СЊС‚Р°С‚ РЅРµ РѕС‚РїСЂР°РІР»РµРЅ: РѕС‚РїСЂР°РІРёС‚СЃСЏ, РєРѕРіРґР° РїРѕСЏРІРёС‚СЃСЏ СЃРІСЏР·СЊ');
  row.classList.add('pending');
  return row;
}

function plainRow(text) {
  const row = document.createElement('p');
  row.className = 'event-meta';
  row.textContent = text;
  return row;
}

/** РЎС‚СЂРѕРєР° СЃРІРµРґРµРЅРёР№: В«Р”РёСЃС‚Р°РЅС†РёСЏ: 640 Рј В· РљРџ: 3 В· РЈС‡Р°СЃС‚РЅРёРєРѕРІ: 1В». */
function detailsLine(item) {
  const entry = item.entry || {};
  const distance = item.distance || {};
  const starts = startAliasCodes(distance);
  const checkpoints = (distance.order || [])
    .filter((code) => !starts.has(String(code)))
    .filter((code) => Number(code) >= 31 && Number(code) <= 99).length;

  const parts = [];
  if (item.kind === 'rogaine') {
    if (checkpoints) parts.push(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${checkpoints}`);
    if (entry.maxScore) parts.push(`РњР°РєСЃ. Р±Р°Р»Р»: ${entry.maxScore}`);
  } else {
    if (distance.longInMeters) parts.push(`Р”РёСЃС‚Р°РЅС†РёСЏ: ${distance.longInMeters} Рј`);
    if (checkpoints) parts.push(`РљРџ: ${checkpoints}`);
  }
  parts.push(`РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${participantCount(distance.results)}`);
  return plainRow(parts.join(' В· '));
}

function mapLine() {
  return plainRow('РљР°СЂС‚Р°: РµСЃС‚СЊ');
}

function hintsAvailable(item) {
  const distance = (item && item.distance) || {};
  return String(distance.markMode || '').toUpperCase() === 'GPS' && distance.hintsAllowed === true;
}

function hintsLine() {
  return plainRow('РџРѕРґСЃРєР°Р·РєРё: РµСЃС‚СЊ');
}

/** Р—РЅР°С‡РѕРє СЃРїРѕСЃРѕР±Р° РѕС‚РјРµС‚РєРё: QR РёР»Рё GPS вЂ” РєР°Рє MarkModeIcon РІ Android. */
function modeIconMarkup(entry) {
  const qr = String((entry && entry.markMode) || '').toUpperCase() === 'QR';
  return `<svg class="icon small"><use href="icons.svg#${qr ? 'qrcode' : 'mylocation'}"></use></svg>`;
}

function modeIconElement(entry) {
  const box = document.createElement('span');
  box.className = 'mode-icon';
  box.innerHTML = modeIconMarkup(entry);
  return box.firstElementChild;
}

/**
 * РџРѕРґСЃРєР°Р·РєРё РїСЂРё РѕС‚РїСЂР°РІРєРµ СЂРµР·СѓР»СЊС‚Р°С‚Р° вЂ” С‚Рµ Р¶Рµ СЃР»РѕРІР°, С‡С‚Рѕ РІ Android
 * (`send_hint_*`, `send_confirm_*`, `send_done_*`, `send_queued_*`).
 *
 * РџСЂР°РІРёР»Рѕ Р·Р°РїРёСЃРё: 'update' вЂ” РїСЂРµР¶РЅРёР№ СЂРµР·СѓР»СЊС‚Р°С‚ Р·Р°РјРµРЅСЏРµС‚СЃСЏ РЅРѕРІС‹Рј,
 * 'first' вЂ” РІ РїСЂРѕС‚РѕРєРѕР»Рµ РѕСЃС‚Р°С‘С‚СЃСЏ РїРµСЂРІС‹Р№, 'both' вЂ” РѕР±Рµ СЃС‚СЂРѕРєРё СЃ РјРµСЃС‚Р°РјРё.
 */
const RESUBMIT_TEXTS = {
  hint: {
    update: 'Р РµР·СѓР»СЊС‚Р°С‚ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ РІ РїСЂРѕС‚РѕРєРѕР». РџСЂРё РїРѕРІС‚РѕСЂРЅРѕР№ РѕС‚РїСЂР°РІРєРµ РїСЂРµР¶РЅРёР№ СЂРµР·СѓР»СЊС‚Р°С‚ Р·Р°РјРµРЅРёС‚СЃСЏ РЅРѕРІС‹Рј.',
    first: 'Р РµР·СѓР»СЊС‚Р°С‚ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ РІ РїСЂРѕС‚РѕРєРѕР». РџРѕРІС‚РѕСЂРЅР°СЏ РѕС‚РїСЂР°РІРєР° РІ РїСЂРѕС‚РѕРєРѕР» РЅРµ РїРѕРїР°РґС‘С‚.',
    both: 'Р РµР·СѓР»СЊС‚Р°С‚ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ РІ РїСЂРѕС‚РѕРєРѕР». РџСЂРё РїРѕРІС‚РѕСЂРЅРѕР№ РѕС‚РїСЂР°РІРєРµ Сѓ РІР°СЃ Р±СѓРґРµС‚ РґРІРµ СЃС‚СЂРѕРєРё, РѕР±Рµ СЃ РјРµСЃС‚РѕРј.'
  },
  confirmTitle: {
    update: 'РћС‚РїСЂР°РІРёС‚СЊ РµС‰С‘ СЂР°Р·?',
    first: 'Р РµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ РµСЃС‚СЊ',
    both: 'Р‘СѓРґРµС‚ РґРІРµ СЃС‚СЂРѕРєРё'
  },
  confirmBody: {
    update: (was, now) => `Р’Р°С€ СЂРµР·СѓР»СЊС‚Р°С‚ РІ РїСЂРѕС‚РѕРєРѕР»Рµ (${was}) Р±СѓРґРµС‚ Р·Р°РјРµРЅС‘РЅ РЅРѕРІС‹Рј (${now}). РњРµСЃС‚Рѕ РїРµСЂРµСЃС‡РёС‚Р°РµС‚СЃСЏ.`,
    first: (was, now) => `Р’ РїСЂРѕС‚РѕРєРѕР»Рµ РѕСЃС‚Р°РЅРµС‚СЃСЏ РїРµСЂРІС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚: ${was}. РќРѕРІР°СЏ РїРѕРїС‹С‚РєР° (${now}) СЃРѕС…СЂР°РЅРёС‚СЃСЏ РІ РѕР±Р»Р°РєРµ, РЅРѕ РІ РїСЂРѕС‚РѕРєРѕР» РЅРµ РІРѕР№РґС‘С‚.`,
    both: (was, now) => `Р’ РїСЂРѕС‚РѕРєРѕР»Рµ РїРѕСЏРІСЏС‚СЃСЏ РѕР±Рµ РІР°С€Рё РїРѕРїС‹С‚РєРё: ${was} Рё ${now} вЂ” РІС‚РѕСЂР°СЏ СЃ РїРѕРјРµС‚РєРѕР№ В«РґСѓР±Р»СЊВ». РљР°Р¶РґР°СЏ РїРѕР»СѓС‡РёС‚ СЃРІРѕС‘ РјРµСЃС‚Рѕ.`
  },
  done: {
    update: (now) => `Р РµР·СѓР»СЊС‚Р°С‚ РѕС‚РїСЂР°РІР»РµРЅ. Р’ РїСЂРѕС‚РѕРєРѕР»Рµ РІР°С€ СЂРµР·СѓР»СЊС‚Р°С‚: ${now}.`,
    first: (was) => `Р РµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ РµСЃС‚СЊ: РІ РїСЂРѕС‚РѕРєРѕР»Рµ РїСЂРµР¶РЅРёР№ вЂ” ${was}. РќРѕРІР°СЏ РїРѕРїС‹С‚РєР° СЃРѕС…СЂР°РЅРµРЅР°, РІ С‚Р°Р±Р»РёС†Сѓ РЅРµ РІРѕС€Р»Р°.`,
    both: (now) => `Р”РѕР±Р°РІР»РµРЅР° РІС‚РѕСЂР°СЏ СЃС‚СЂРѕРєР°: ${now}, РїРѕРјРµС‡РµРЅР° В«РґСѓР±Р»СЊВ». РўРµРїРµСЂСЊ Сѓ РІР°СЃ РґРІРµ СЃС‚СЂРѕРєРё РІ РїСЂРѕС‚РѕРєРѕР»Рµ.`
  },
  queued: {
    update: (now) => `Р РµР·СѓР»СЊС‚Р°С‚ СЃРѕС…СЂР°РЅС‘РЅ Рё СѓР№РґС‘С‚, РєРѕРіРґР° РїРѕСЏРІРёС‚СЃСЏ СЃРІСЏР·СЊ. РўРѕРіРґР° РїСЂРµР¶РЅРёР№ СЂРµР·СѓР»СЊС‚Р°С‚ РІ РїСЂРѕС‚РѕРєРѕР»Рµ Р·Р°РјРµРЅРёС‚СЃСЏ РЅРѕРІС‹Рј (${now}).`,
    first: (was) => `Р РµР·СѓР»СЊС‚Р°С‚ СЃРѕС…СЂР°РЅС‘РЅ Рё СѓР№РґС‘С‚, РєРѕРіРґР° РїРѕСЏРІРёС‚СЃСЏ СЃРІСЏР·СЊ. Р’ РїСЂРѕС‚РѕРєРѕР»Рµ РѕСЃС‚Р°РЅРµС‚СЃСЏ РїРµСЂРІС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚ вЂ” ${was}; РЅРѕРІР°СЏ РїРѕРїС‹С‚РєР° СЃРѕС…СЂР°РЅРµРЅР°, РЅРѕ РІ С‚Р°Р±Р»РёС†Сѓ РЅРµ РІРѕР№РґС‘С‚.`,
    both: (was, now) => `Р РµР·СѓР»СЊС‚Р°С‚ СЃРѕС…СЂР°РЅС‘РЅ Рё СѓР№РґС‘С‚, РєРѕРіРґР° РїРѕСЏРІРёС‚СЃСЏ СЃРІСЏР·СЊ. РўРѕРіРґР° РІ РїСЂРѕС‚РѕРєРѕР»Рµ Р±СѓРґРµС‚ РґРІРµ РІР°С€Рё СЃС‚СЂРѕРєРё: ${was} Рё ${now} (В«РґСѓР±Р»СЊВ»).`
  },
  link: 'Р§С‚Рѕ Р±СѓРґРµС‚ РїСЂРё РѕС‚РїСЂР°РІРєРµ?',
  authorNote: 'РџСЂР°РІРёР»Рѕ Р·Р°РґР°С‘С‚ Р°РІС‚РѕСЂ Р·Р°РїРёСЃРё: В«РѕР±РЅРѕРІР»СЏС‚СЊВ», В«РЅРµ РѕР±РЅРѕРІР»СЏС‚СЊВ» РёР»Рё В«РѕСЃС‚Р°РІР»СЏС‚СЊ РѕР±Р°В». Р•СЃР»Рё Р°РІС‚РѕСЂ РµРіРѕ РёР·РјРµРЅРёС‚, РїСЂРѕС‚РѕРєРѕР» РїРµСЂРµСЃРѕР±РµСЂС‘С‚СЃСЏ РїРѕ РЅРѕРІРѕРјСѓ РїСЂР°РІРёР»Сѓ.',
  dnf: 'РџСЂРµР¶РЅРёР№ СЂРµР·СѓР»СЊС‚Р°С‚ вЂ” DNF (РЅРµ С„РёРЅРёС€РёСЂРѕРІР°Р»)',
  nothing: 'РћС‚РїСЂР°РІР»СЏС‚СЊ РЅРµС‡РµРіРѕ: РѕС‚РјРµС‚СЊС‚Рµ СЃС‚Р°СЂС‚ Рё С„РёРЅРёС€'
};

/**
 * Р¦РІРµС‚ С‡РµР»РѕРІРµС‡РєР° вЂ” РєР°Рє tint РІ EventsScreen: Р±РµР· РїСЂРѕС„РёР»СЏ С‡С‘СЂРЅС‹Р№, СЃРІРѕР№ СЃРёРЅРёР№,
 * СЃ РјРѕРёРј СЂРµР·СѓР»СЊС‚Р°С‚РѕРј Р·РµР»С‘РЅС‹Р№, С‡СѓР¶РѕР№ РєСЂР°СЃРЅС‹Р№.
 */
function personColor(entry, distance) {
  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  if (!me.code) return 'var(--author-anon)';
  if (entry && entry.ownerId && me.code === entry.ownerId) return 'var(--author-own)';

  const results = (distance && distance.results) || [];
  const mine = results.some((row) => row && row.userId === me.code);
  return mine ? 'var(--author-mine)' : 'var(--author-other)';
}

/** Р—РЅР°С‡РєРё: СЃРїРѕСЃРѕР± РѕС‚РјРµС‚РєРё Рё Р°РІС‚РѕСЂ; С†РІРµС‚ С‡РµР»РѕРІРµС‡РєР° вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function iconsRow(withName, entry = {}, distance = {}) {
  const row = document.createElement('div');
  row.className = 'distance-icons';
  const qr = String((distance && distance.markMode) || '').toUpperCase() === 'QR';
  row.innerHTML =
    `<svg class="icon small"><use href="icons.svg#${qr ? 'qrcode' : 'mylocation'}"></use></svg>` +
    '<svg class="icon small author-icon"><use href="icons.svg#person"></use></svg>';

  // Р¦РІРµС‚ РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: С‡С‘СЂРЅС‹Р№ Р±РµР· РїСЂРѕС„РёР»СЏ, СЃРёРЅРёР№ СЃРІРѕР№, Р·РµР»С‘РЅС‹Р№ СЃ РјРѕРёРј
  // СЂРµР·СѓР»СЊС‚Р°С‚РѕРј, РєСЂР°СЃРЅС‹Р№ С‡СѓР¶РѕР№
  const person = row.querySelector('.author-icon');
  if (person) person.style.color = personColor(entry, distance);
  return row;
}

/** РђРІС‚РѕСЂ: С‡РµР»РѕРІРµС‡РµРє РЅСѓР¶РЅРѕРіРѕ С†РІРµС‚Р° Рё РёРјСЏ; Сѓ СЃРІРѕРёС… вЂ” В«вЂ” Р­С‚Рѕ Р’С‹В». */
function authorRow(entry, withName, withIcon = true, distance = {}) {
  const row = document.createElement('div');
  row.className = 'author-row';

  const person = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  person.setAttribute('class', 'icon small author-icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', 'icons.svg#person');
  person.append(use);

  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const ownerId = entry.ownerId || (distance && distance.ownerId) || '';
  const own = me.code && ownerId && me.code === ownerId;
  person.style.color = personColor(Object.assign({}, entry, { ownerId }), distance);

  if (withIcon) {
    // РЎРїРѕСЃРѕР± РѕС‚РјРµС‚РєРё вЂ” СЃР»РµРІР° РѕС‚ Р°РІС‚РѕСЂР°, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
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
    const organizer = entry.organizer || (distance && distance.organizer) || 'РђРІС‚РѕСЂ РЅРµ СѓРєР°Р·Р°РЅ';
    name.textContent = organizer + (own ? ' вЂ” Р­С‚Рѕ Р’С‹' : '');
    row.append(name);
  }
  return row;
}

/** Р”РµР»Р°РµС‚ Р°РєС‚РёРІРЅРѕР№ РІС‹Р±СЂР°РЅРЅСѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ РіСЂСѓРїРїС‹ Рё РѕС‚РєСЂС‹РІР°РµС‚ РµС‘ СЌРєСЂР°РЅ. */
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

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РѕР±Р»Р°РєРѕ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РЅР°СЃС‚СЂРѕР№РєРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/** РќР°СЃС‚СЂРѕР№РєРё вЂ” С‚Рµ Р¶Рµ РєР»СЋС‡Рё, С‡С‚Рѕ РІ AppSettings.kt; СЏР·С‹РєР° РЅРµС‚, РѕРЅ С‚РѕР»СЊРєРѕ СЂСѓСЃСЃРєРёР№. */
const DEFAULT_SETTINGS = {
  theme: 'system',
  large: false,
  showOnStart: false,
  autoMark: false,
  hints: false,
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

function updateThemeColor() {
  const explicit = document.documentElement.dataset.theme;
  const dark = explicit === 'dark' ||
    (explicit !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = $('themeColor');
  if (meta) meta.setAttribute('content', dark ? '#141218' : '#fef7ff');
}

function applySettings() {
  const current = settings();
  if (current.theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.dataset.theme = current.theme;
  }
  document.body.classList.toggle('large', Boolean(current.large));
  updateThemeColor();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);

function openSettings() {
  renderSettings();
  showTab('settings');
}

function renderSettings() {
  const current = settings();
  $('setLarge').checked = current.large;
  $('setShowOnStart').checked = current.showOnStart;
  $('setAutoMark').checked = current.autoMark;
  $('setHints').checked = current.hints;
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
  closeCloudMapCard();
  showTab('cloud');
  $('cloudHint').textContent = 'Р—Р°РіСЂСѓР¶Р°СЋ СЃРїРёСЃРѕРєвЂ¦';
  $('cloudList').textContent = '';

  try {
    const all = [];
    const seen = new Set();
    let offset = 0;
    let pages = 0;
    let more = false;
    do {
      const data = await callFunction(
        `action=list&full=1&rogaine=1&paged=1&offset=${offset}&limit=100`
      );
      const page = Array.isArray(data.entries) ? data.entries : [];
      page.forEach((entry) => {
        if (entry && entry.id && !seen.has(entry.id)) {
          seen.add(entry.id);
          all.push(entry);
        }
      });
      const next = Number(data.nextOffset) || offset + page.length;
      more = Boolean(data.more) && next > offset;
      if (more) offset = next;
      pages += 1;
      const loaded = Number(data.total) || all.length;
      $('cloudHint').textContent = `Р—Р°РіСЂСѓР¶Р°СЋ СЃРїРёСЃРѕРєвЂ¦ ${all.length} РёР· ${loaded}`;
    } while (more && pages < 50);
    cloudEntries = all.slice().sort((a, b) => {
      const left = a.number === undefined ? 0 : Number(a.number);
      const right = b.number === undefined ? 0 : Number(b.number);
      return left - right;
    });
    renderCloud();
  } catch (error) {
    $('cloudHint').textContent = error.message;
  }
}

/** РљР°СЂС‚РѕС‡РєР° СЃРѕР±С‹С‚РёСЏ/РіСЂСѓРїРїС‹ вЂ” С‚Р° Р¶Рµ, С‡С‚Рѕ РІ СЃРїРёСЃРєРµ РѕР±Р»Р°РєР°. */
function cloudCard(items) {
  const first = items[0];
  const item = document.createElement('button');
  item.className = 'cloud-item';
  const body = document.createElement('div');
  body.className = 'body';

  if (items.length > 1) {
    const mark = document.createElement('img');
    mark.src = 'icons/group.png';
    mark.alt = '';
    mark.className = 'cloud-icon';
    body.append(mark);
  }

  const title = document.createElement('span');
  title.className = 'name';
  title.textContent = (first.number ? `в„– ${first.number}  ` : '') + (first.name || 'Р‘РµР· РЅР°Р·РІР°РЅРёСЏ');
  body.append(title);

  const period = document.createElement('span');
  period.className = 'period';
  period.textContent = formatDate(first.startTime) + ' - ' + formatDate(first.finishTime);
  body.append(period);

  if (items.length > 1) {
    items.forEach((entry) => {
      const line = document.createElement('span');
      line.className = 'line with-icon';
      line.innerHTML = modeIconMarkup(entry);
      const text = document.createElement('span');
      text.textContent = groupDetails(entry);
      line.append(text);
      body.append(line);
    });
  } else {
    body.append(detailsBlock(first));
    body.append(mapLineCloud(first));
    if (hintsAvailable({ distance: first })) body.append(hintLineCloud());
  }

  body.append(authorRowCloud(first, items.length === 1));
  const downloaded = items.every((entry) => state.history.some((saved) => saved.id === entry.id));
  const action = document.createElement('span');
  action.className = 'action';
  action.innerHTML = downloaded
    ? '<svg class="icon"><use href="icons.svg#check"></use></svg>'
    : '<svg class="icon"><use href="icons.svg#download"></use></svg>';

  action.classList.add('cloud-action');
  action.addEventListener('click', (event) => {
    event.stopPropagation();
    if (downloaded) {
      activateItem({ id: first.id, kind: first.kind, entry: first, distance: null });
    } else {
      downloadEvent(first);
    }
  });
  item.append(body, action);
  return item;
}

function renderCloudCard(units) {
  const safeUnits = (units || [])
    .map((unit) => Array.isArray(unit) ? unit : [unit])
    .filter((unit) => unit.length > 0 && unit[0]);
  if (!safeUnits.length) return;
  cloudMapCardEntry = safeUnits;
  const card = $('cloudMapCard');
  if (!card) return;
  card.textContent = '';
  if (safeUnits.length > 1) {
    const title = document.createElement('div');
    title.className = 'cloud-card-head';
    title.textContent = `РЎРѕР±С‹С‚РёР№: ${safeUnits.length}`;
    card.append(title);
  }
  const body = document.createElement('div');
  body.className = 'cloud-map-card-body';
  safeUnits.forEach((unit) => body.append(cloudCard(unit)));
  card.append(body);
  addCloudCardClose(card);
  card.classList.remove('hidden');
}

function renderCloud() {
  const search = $('cloudSearch');
  const onlyMineInput = $('cloudOnlyMine');
  const filter = search ? search.value.trim() : '';
  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const onlyMine = Boolean(me.code) && Boolean(onlyMineInput && onlyMineInput.checked);
  $('cloudOnlyMineRow')?.classList.toggle('hidden', !me.code);
  const kindElement = $('cloudKind');
  const markElement = $('cloudMark');
  const kindFilter = kindElement ? kindElement.value : '';
  const markFilter = markElement ? markElement.value : '';
  const source = cloudEntries.filter((entry) => {
    if (onlyMine && (!me.code || String(entry.ownerId) !== String(me.code))) return false;
    if (kindFilter && entry.kind !== kindFilter) return false;
    if (markFilter && String(entry.markMode || '').toUpperCase() !== markFilter) return false;
    return true;
  });

  // Р“СЂСѓРїРїР° вЂ” С‚РѕР»СЊРєРѕ РїРѕ groupId; Р±РµР· РЅРµРіРѕ Р·Р°РїРёСЃСЊ РѕРґРёРЅРѕС‡РЅР°СЏ, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const groups = new Map();
  source.forEach((entry) => {
    const key = entry.groupId ? 'g:' + entry.groupId : 's:' + entry.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  // РџРѕРёСЃРє РїРѕ РЅРѕРјРµСЂСѓ: РіСЂСѓРїРїР° РѕСЃС‚Р°С‘С‚СЃСЏ С†РµР»РёРєРѕРј, РµСЃР»Рё СЃРѕРІРїР°Р» С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РµС‘
  // С‡Р»РµРЅ вЂ” РєР°Рє РІ CloudFilter.kt
  const matched = [...groups.values()].filter((items) => !filter
    || items.some((entry) => String(entry.number || '').startsWith(filter)));

  const total = matched.length;
  $('cloudHint').textContent = total === 0
    ? 'РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ'
    : `РЎРѕР±С‹С‚РёР№ РІ РѕР±Р»Р°РєРµ: ${total}`;

  const list = $('cloudList');
  list.textContent = '';

  matched.forEach((items) => list.append(cloudCard(items)));

  list.classList.toggle('hidden', cloudMapMode);
  const searchBox = $('cloudSearchBox');
  if (searchBox) searchBox.style.display = cloudMapMode ? 'none' : '';
  $('cloudMap').classList.toggle('hidden', !cloudMapMode);
  $('cloudMapCard').classList.toggle('hidden', !cloudMapMode || !cloudMapCardEntry);
  if (cloudMapMode) renderCloudMap(matched);
  else {
    mapState.cloudEntries = null;
    cloudMapCardEntry = null;
    $('cloudMapCard').textContent = '';
  }
}

let cloudMapMode = false;
let cloudMapCardEntry = null;

/** РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕ РІРїРёСЃС‹РІР°РµС‚ РІСЃРµ СЃС‚Р°СЂС‚С‹ РІ СЂРµР°Р»СЊРЅС‹Р№ СЂР°Р·РјРµСЂ РєР°СЂС‚С‹. */
function fitCloudMap(map, points) {
  const width = map.clientWidth || 360;
  const height = map.clientHeight || 300;
  const lats = points.map((point) => Number(point.latitude));
  const lons = points.map((point) => Number(point.longitude));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  let zoom = 2;
  for (let candidate = 18; candidate >= 2; candidate--) {
    const size = 256 * Math.pow(2, candidate);
    const px = (lat, lon) => ({
      x: ((lon + 180) / 360) * size,
      y: ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * size,
    });
    const a = px(maxLat, minLon);
    const b = px(minLat, maxLon);
    if (Math.abs(b.x - a.x) <= width - 120 && Math.abs(b.y - a.y) <= height - 120) {
      zoom = candidate;
      break;
    }
  }
  // РћРґРёРЅ СѓСЂРѕРІРµРЅСЊ Р·Р°РїР°СЃР°: РєР»Р°СЃС‚РµСЂС‹ Сѓ РіСЂР°РЅРёС† РЅРµ РґРѕР»Р¶РЅС‹ РѕР±СЂРµР·Р°С‚СЊСЃСЏ
  mapState.zoom = Math.max(2, zoom - 1);
  mapState.center = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
  };
  redrawMap();
}

function renderCloudMap(units) {
  const located = units.filter((unit) => unit.length > 0
    && Number.isFinite(Number(unit[0].latitude))
    && Number.isFinite(Number(unit[0].longitude)));
  const map = $('cloudMap');
  if (!located.length) {
    map.classList.add('hidden');
    $('cloudHint').textContent = 'Р’ РєР°С‚Р°Р»РѕРіРµ РЅРµС‚ РєРѕРѕСЂРґРёРЅР°С‚ СЃС‚Р°СЂС‚Р°';
    return;
  }
  const byCode = new Map();
  const points = located.map((unit, index) => {
    const code = 'cloud:' + (unit[0].groupId || unit[0].id || index);
    byCode.set(code, unit);
    return {
      code,
      latitude: Number(unit[0].latitude),
      longitude: Number(unit[0].longitude),
    };
  });
  mapState.zoom = null;
  mapState.center = null;
  showMapOn(map, points, {
    showRoute: false,
    cloudEntries: byCode,
    labels: new Map(points.map((point, index) => [point.code, String(located[index][0].number || index + 1)])),
  });
  map.classList.remove('hidden');
  // РџРѕСЃР»Рµ СЂР°СЃРєР»Р°РґРєРё Сѓ РєР°СЂС‚С‹ РїРѕСЏРІР»СЏРµС‚СЃСЏ РЅР°СЃС‚РѕСЏС‰Р°СЏ РІС‹СЃРѕС‚Р°: РїРѕРґРіРѕРЅСЏРµРј РІСЃРµ С‚РѕС‡РєРё РµС‰С‘ СЂР°Р·
  requestAnimationFrame(() => {
    if (mapState.box !== map || !mapState.cloudEntries) return;
    fitCloudMap(map, points);
  });
  if (cloudMapCardEntry) selectCloudMapUnit(cloudMapCardEntry);
}

function selectCloudMapGroup(units) {
  renderCloudCard(units);
}

function selectCloudMapUnit(unit) {
  renderCloudCard([unit]);
}

function selectCloudMapEntry(entry, unit = [entry]) {
  renderCloudCard([unit]);
}

function addCloudCardClose(card) {
  const close = document.createElement('button');
  close.className = 'cloud-card-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Р—Р°РєСЂС‹С‚СЊ');
  close.textContent = 'Г—';
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    closeCloudMapCard();
  });
  card.append(close);
}

function closeCloudMapCard() {
  cloudMapCardEntry = null;
  const card = $('cloudMapCard');
  if (!card) return;
  card.classList.add('hidden');
  card.textContent = '';
}

/** РЎРІРµРґРµРЅРёСЏ Рѕ РґРёСЃС‚Р°РЅС†РёРё РІ СЃС‚СЂРѕРєРµ РіСЂСѓРїРїС‹. */
function groupDetails(entry) {
  const parts = [];
  if (entry.kind === 'rogaine') {
    if (entry.checkPointCount) parts.push(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${entry.checkPointCount}`);
    if (entry.maxScore) parts.push(`РњР°РєСЃ. Р±Р°Р»Р»: ${entry.maxScore}`);
    if (entry.penaltyPerMinute) parts.push(`РЁС‚СЂР°С„: ${entry.penaltyPerMinute} Р±Р°Р»Р»/РјРёРЅ`);
  } else {
    if (entry.lengthMeters) parts.push(`Р”Р»РёРЅР°: ${entry.lengthMeters} Рј`);
    parts.push(`РљР°СЂС‚Р°: ${entry.mapExt ? 'РµСЃС‚СЊ' : 'РЅРµС‚'}`);
    if (entry.checkPointCount) parts.push(`РљРџ: ${entry.checkPointCount}`);
  }
  if (hintsAvailable({ distance: entry })) parts.push('РџРѕРґСЃРєР°Р·РєРё: РµСЃС‚СЊ');
  parts.push(`РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${entry.participants || 0}`);
  return parts.join(' В· ');
}

/** РЎРІРµРґРµРЅРёСЏ РѕР± РѕРґРёРЅРѕС‡РЅРѕР№ Р·Р°РїРёСЃРё: РєР°Рє РЅР° РєР°СЂС‚РѕС‡РєРµ РѕР±Р»Р°РєР° РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function detailsBlock(entry) {
  const wrap = document.createElement('div');
  wrap.className = 'cloud-details';

  if (entry.kind === 'rogaine') {
    const line = document.createElement('span');
    line.className = 'line';
    const parts = [];
    if (entry.checkPointCount) parts.push(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${entry.checkPointCount}`);
    if (entry.maxScore) parts.push(`РњР°РєСЃ. Р±Р°Р»Р»: ${entry.maxScore}`);
    if (entry.penaltyPerMinute) parts.push(`РЁС‚СЂР°С„: ${entry.penaltyPerMinute} Р±Р°Р»Р»/РјРёРЅ`);
    line.textContent = parts.join(' В· ');
    wrap.append(line);

    const row = document.createElement('span');
    row.className = 'line row-line';
    const people = document.createElement('span');
    people.textContent = `РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${entry.participants || 0}`;
    const tag = document.createElement('span');
    tag.className = 'kind-tag';
    tag.textContent = 'Р РѕРіРµР№РЅ';
    row.append(people, tag);
    wrap.append(row);
  } else {
    const line = document.createElement('span');
    line.className = 'line';
    const parts = [];
    if (entry.lengthMeters) parts.push(`Р”Р»РёРЅР°: ${entry.lengthMeters} Рј`);
    if (entry.checkPointCount) parts.push(`РљРџ: ${entry.checkPointCount}`);
    parts.push(`РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${entry.participants || 0}`);
    line.textContent = parts.join(' В· ');
    wrap.append(line);
  }
  return wrap;
}

/** В«РљР°СЂС‚Р°: РµСЃС‚СЊ/РЅРµС‚В» вЂ” РІ РѕР±Р»Р°РєРµ СЃС‚СЂРѕРєР° РµСЃС‚СЊ РІСЃРµРіРґР°. */
function mapLineCloud(entry) {
  const line = document.createElement('span');
  line.className = 'line';
  line.textContent = `РљР°СЂС‚Р°: ${entry.mapExt ? 'РµСЃС‚СЊ' : 'РЅРµС‚'}`;
  return line;
}

function hintLineCloud() {
  return plainRow('РџРѕРґСЃРєР°Р·РєРё: РµСЃС‚СЊ');
}

/** РђРІС‚РѕСЂ: Р·РЅР°С‡РѕРє РЅСѓР¶РЅРѕРіРѕ С†РІРµС‚Р° Рё РёРјСЏ, Сѓ СЃРІРѕРёС… вЂ” В«вЂ” Р­С‚Рѕ Р’С‹В». */
function authorRowCloud(entry, showMode = true) {
  const row = document.createElement('div');
  row.className = 'author-row';
  if (showMode) row.append(modeIconElement(entry));

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
  name.textContent = (entry.organizer || 'РђРІС‚РѕСЂ РЅРµ СѓРєР°Р·Р°РЅ') + (own ? ' вЂ” Р­С‚Рѕ Р’С‹' : '');

  row.append(person, name);
  return row;
}

/** РЎРєР°С‡РёРІР°РµС‚ РѕРґРЅРѕ СЃРѕР±С‹С‚РёРµ: РѕРЅРѕ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ Р°РєС‚РёРІРЅС‹Рј, РЅРѕ РѕС‚РјРµС‚РєСѓ РЅРµ РѕС‚РєСЂС‹РІР°РµС‚. */
async function downloadEvent(entry) {
  if (!entry) return;

  // РќР° РіР»Р°РІРЅРѕРј РїРѕРјРµС‰Р°РµС‚СЃСЏ РѕРґРЅРѕ СЃРѕР±С‹С‚РёРµ: РїРѕРєР° СЃРєР°С‡Р°РЅРЅРѕРµ РЅРµ СѓРґР°Р»РµРЅРѕ РєРѕСЂР·РёРЅРѕР№,
  // РЅРѕРІРѕРµ РЅРµ СЃРєР°С‡РёРІР°РµРј
  const downloaded = (state.history || []).filter((item) => item.id !== entry.id);
  if (downloaded.length) {
    const message = 'РЎРЅР°С‡Р°Р»Р° СѓРґР°Р»РёС‚Рµ СЃРєР°С‡Р°РЅРЅРѕРµ СЃРѕР±С‹С‚РёРµ РєРѕСЂР·РёРЅРѕР№';
    setStatus(message, 'error');
    window.alert(message);
    return;
  }

  setStatus('РЎРєР°С‡РёРІР°СЋ СЃРѕР±С‹С‚РёРµвЂ¦');
  try {
    const data = await callFunction('action=get&id=' + encodeURIComponent(entry.id));
    if (!data.distance) throw new Error('РЎРµСЂРІРёСЃ РЅРµ РѕС‚РґР°Р» СЃРѕР±С‹С‚РёРµ');

    const kind = data.kind || entry.kind || 'distance';
    const freshEntry = entryFromCloud(entry, data.distance, entry.id, kind);
    const key = 'distances/' + entry.id + (kind === 'rogaine' ? '.rogaine' : '.osport');
    const event = { id: entry.id, kind, key, distance: data.distance, entry: freshEntry };

    writeJson(STORAGE.event, event);
    writeJson(STORAGE.event + '.' + entry.id, event);
    rememberEvent(event);

    // Р“СЂСѓРїРїР° вЂ” РєР°СЂС‚РѕС‡РєР° СЃ РЅРµСЃРєРѕР»СЊРєРёРјРё РґРёСЃС‚Р°РЅС†РёСЏРјРё: РІ РїСЂРёР»РѕР¶РµРЅРёРё РѕРЅРё Р»РµР¶Р°С‚
    // РІРјРµСЃС‚Рµ РїРѕ groupId (РёР»Рё РїРѕ РѕР±С‰РµРјСѓ РЅРѕРјРµСЂСѓ), Рё РЅР° РіР»Р°РІРЅРѕРј РІРёРґРЅС‹ РІСЃРµ.
    // РџРѕСЌС‚РѕРјСѓ СЃРєР°С‡РёРІР°РµРј РЅРµ С‚РѕР»СЊРєРѕ РІС‹Р±СЂР°РЅРЅСѓСЋ Р·Р°РїРёСЃСЊ, РЅРѕ Рё РµС‘ СЃРѕСЃРµРґРµР№
    await downloadGroup(freshEntry, event);

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
 * РЎРєР°С‡РёРІР°РµС‚ РІСЃРµ РґРёСЃС‚Р°РЅС†РёРё РѕРґРЅРѕР№ РіСЂСѓРїРїС‹.
 *
 * РџСЂР°РІРёР»Рѕ РІР·СЏС‚Рѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ: Р·Р°РїРёСЃРё СЃС‡РёС‚Р°СЋС‚СЃСЏ РѕРґРЅРѕР№ РіСЂСѓРїРїРѕР№, РµСЃР»Рё Сѓ РЅРёС…
 * СЃРѕРІРїР°РґР°РµС‚ РЅРµРїСѓСЃС‚РѕР№ groupId, Р° РµСЃР»Рё РµРіРѕ РЅРµС‚ вЂ” РѕР±С‰РёР№ РЅРѕРјРµСЂ СЃРѕР±С‹С‚РёСЏ.
 */
async function downloadGroup(entry, downloaded) {
  let entries = cloudEntries;
  if (!entries.length) {
    const data = await callFunction('action=list&full=1&rogaine=1');
    entries = data.entries || [];
    cloudEntries = entries;
  }

  // Р“СЂСѓРїРїР° РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ РўРћР›Р¬РљРћ groupId. РџСѓСЃС‚РѕР№ groupId вЂ” Р·Р°РїРёСЃСЊ РѕРґРёРЅРѕС‡РЅР°СЏ,
  // СЃРѕРІРїР°РґРµРЅРёРµ РЅРѕРјРµСЂРѕРІ РіСЂСѓРїРїРѕР№ РЅРµ РґРµР»Р°РµС‚.
  const sameGroup = (candidate) =>
    Boolean(entry.groupId) && candidate.groupId === entry.groupId && candidate.id !== entry.id;

  const items = [{ id: entry.id, kind: downloaded.kind, entry, distance: downloaded.distance }];
  const siblings = entries.filter(sameGroup);

  for (const sibling of siblings) {
    const saved = readJson(STORAGE.event + '.' + sibling.id, null);
    if (saved && saved.distance) {
      const savedEntry = entryFromCloud(sibling, saved.distance, sibling.id, saved.kind);
      items.push({ id: sibling.id, kind: saved.kind, entry: savedEntry, distance: saved.distance });
      continue;
    }
    try {
      const data = await callFunction('action=get&id=' + encodeURIComponent(sibling.id));
      if (!data.distance) continue;
      const siblingKind = data.kind || sibling.kind || 'distance';
      const siblingEntry = entryFromCloud(sibling, data.distance, sibling.id, siblingKind);
      const key = 'distances/' + sibling.id + (siblingKind === 'rogaine' ? '.rogaine' : '.osport');
      const item = {
        id: sibling.id,
        kind: siblingKind,
        key,
        distance: data.distance,
        entry: siblingEntry,
      };
      writeJson(STORAGE.event + '.' + sibling.id, item);
      rememberEvent(item);
      items.push({ id: sibling.id, kind: siblingKind, entry: siblingEntry, distance: data.distance });
    } catch (error) {
      // РћРґРЅР° РЅРµРґРѕСЃС‚СѓРїРЅР°СЏ РґРёСЃС‚Р°РЅС†РёСЏ РЅРµ РґРѕР»Р¶РЅР° Р»РѕРјР°С‚СЊ РІСЃСЋ РіСЂСѓРїРїСѓ
    }
  }

  writeJson(STORAGE.group, { number: entry.number, items });
}

/** Р­РєСЂР°РЅ РіСЂСѓРїРїС‹ вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: СЃСЂРѕРєРё, РєРѕР»РёС‡РµСЃС‚РІРѕ РґРёСЃС‚Р°РЅС†РёР№, Р°РІС‚РѕСЂ, РєР°СЂС‚Р° Рё РґРёСЃС‚Р°РЅС†РёРё. */
function openGroup() {
  try {
    renderGroup();
  } catch (error) {
    setStatus('РћС€РёР±РєР° СЌРєСЂР°РЅР° РіСЂСѓРїРїС‹: ' + error.message, 'error');
    return;
  }
  showTab('group');
}

function renderGroup() {
  const group = readJson(STORAGE.group, null);
  const items = (group && group.items) || [];
  if (!items.length) {
    setStatus('Р“СЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°: СЃРєР°С‡Р°Р№С‚Рµ СЃРѕР±С‹С‚РёРµ Р·Р°РЅРѕРІРѕ', 'error');
    return;
  }

  const first = items[0].entry || {};
  const firstDistance = items[0].distance || {};
  $('groupTitle').textContent = first.name || 'Р“СЂСѓРїРїР° РґРёСЃС‚Р°РЅС†РёР№';
  $('groupSub').textContent = '';

  const rows = $('groupRows');
  rows.textContent = '';
  if (first.startTime) {
    rows.append(detailRow(formatDate(first.startTime) + ' - ' + formatDate(first.finishTime)));
  }
  rows.append(detailRow(`РљРѕР»РёС‡РµСЃС‚РІРѕ РґРёСЃС‚Р°РЅС†РёР№: ${items.length}`));
  const organizer = first.organizer || firstDistance.organizer || '';
  if (organizer) rows.append(detailRow(`РћСЂРіР°РЅРёР·Р°С‚РѕСЂ: ${organizer}`));

  // РћР±С‰Р°СЏ РєР°СЂС‚Р° РіСЂСѓРїРїС‹: РїСѓРЅРєС‚С‹ РІСЃРµС… РґРёСЃС‚Р°РЅС†РёР№, РЅСѓРјРµСЂР°С†РёСЏ РїРѕ РїРѕСЂСЏРґРєСѓ РїРѕСЏРІР»РµРЅРёСЏ
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
    title.textContent = `Р”РёСЃС‚Р°РЅС†РёСЏ ${index + 1}`;
    const mode = document.createElement('span');
    mode.className = 'mode';
    mode.textContent = String(distance.markMode || entry.markMode || '').toUpperCase() === 'QR' ? 'QR' : 'GPS';
    head.append(title, mode);

    const length = document.createElement('p');
    length.className = 'line';
    length.textContent = `Р”Р»РёРЅР° : ${distance.longInMeters || entry.lengthMeters || 0} Рј`;

    const points = document.createElement('p');
    points.className = 'line';
    points.textContent = `РљРџ: ${checkpoints}`;

    const participants = document.createElement('p');
    participants.className = 'line';
    participants.textContent = `РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${participantCount(distance.results)}`;

    card.append(head, length, points, participants);
    card.addEventListener('click', () => activateItem(item));
    list.append(card);
  });
}

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ СЌРєСЂР°РЅ РґРёСЃС‚Р°РЅС†РёРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

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
  $('detailTitle').textContent = distance.name || 'РЎРѕР±С‹С‚РёРµ';

  // РџРѕРґРїРёСЃСЊ В«Р”РёСЃС‚Р°РЅС†РёСЏ NВ» вЂ” РЅРѕРјРµСЂ РґРёСЃС‚Р°РЅС†РёРё РІРЅСѓС‚СЂРё РіСЂСѓРїРїС‹, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const group = readJson(STORAGE.group, null);
  const groupItems = (group && group.items) || [];
  const indexInGroup = groupItems.findIndex((item) => item.id === event.id);

  // РџСЂРёРЅР°РґР»РµР¶РЅРѕСЃС‚СЊ Рє РіСЂСѓРїРїРµ вЂ” РїРѕ РїРѕР»СЋ groupId СЃР°РјРѕРіРѕ СЃРѕР±С‹С‚РёСЏ, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const groupId = String((event.entry && event.entry.groupId) || '');
  const inGroup = groupId !== '';
  $('detailDelete').classList.toggle('hidden', inGroup);

  // РќРѕРјРµСЂ РґРёСЃС‚Р°РЅС†РёРё РІРЅСѓС‚СЂРё РіСЂСѓРїРїС‹: СЃРѕСЃРµРґРё СЃ С‚РµРј Р¶Рµ groupId РїРѕ РЅРѕРјРµСЂСѓ РёР· РѕР±Р»Р°РєР°
  const number = (item) => Number(item.entry && item.entry.number) || 0;
  const ordinal = inGroup
    ? groupItems
      .filter((item) => String((item.entry && item.entry.groupId) || '') === groupId)
      .sort((left, right) => number(left) - number(right))
      .findIndex((item) => item.id === event.id) + 1
    : 0;

  // РљР°СЂС‚Р° РёР· РѕР±Р»Р°РєР°: РєРЅРѕРїРєР° РµСЃС‚СЊ С‚РѕР»СЊРєРѕ РєРѕРіРґР° РєР°СЂС‚Р° Сѓ РґРёСЃС‚Р°РЅС†РёРё РµСЃС‚СЊ
  $('detailMapDownload').classList.toggle('hidden', !entry.mapExt);
  // РљР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: Сѓ РѕРґРёРЅРѕС‡РЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё Рё Сѓ СЂРѕРіРµР№РЅР° РїРѕРґРїРёСЃРё РЅРµС‚,
  // В«Р”РёСЃС‚Р°РЅС†РёСЏ NВ» вЂ” С‚РѕР»СЊРєРѕ Сѓ РґРёСЃС‚Р°РЅС†РёРё РІ РіСЂСѓРїРїРµ
  $('detailSub').textContent = ordinal > 0 ? `Р”РёСЃС‚Р°РЅС†РёСЏ ${ordinal}` : '';

  const rows = $('detailRows');
  rows.textContent = '';
  const organizer = entry.organizer || distance.organizer || '';
  if (organizer) rows.append(detailRow(`РћСЂРіР°РЅРёР·Р°С‚РѕСЂ: ${organizer}`));
  if (entry.startTime) {
    rows.append(detailRow(formatDate(entry.startTime) + ' - ' + formatDate(entry.finishTime)));
  }

  const points = distance.points || [];
  const phone = distance.phone || entry.phone;
  if (phone) rows.append(detailRow(`РўРµР»РµС„РѕРЅ: ${phone}`));

  if (event.kind === 'rogaine') {
    const counts = [];
    const rogainePoints = points.filter(
      (point) => String(codeOf(point)) !== '01' && String(codeOf(point)) !== '02'
    );
    if (rogainePoints.length) counts.push(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${rogainePoints.length}`);
    if (entry.maxScore) counts.push(`РњР°РєСЃ. Р±Р°Р»Р»: ${entry.maxScore}`);
    if (counts.length) rows.append(detailRow(counts.join(' В· ')));
    rows.append(detailRow(entry.mapExt ? 'РљР°СЂС‚Р°: РµСЃС‚СЊ' : 'РљР°СЂС‚Р°: РЅРµС‚'));
    if (hintsAvailable({ distance })) rows.append(detailRow('РџРѕРґСЃРєР°Р·РєРё: РµСЃС‚СЊ'));
    if (distance.controlTimeMinutes) rows.append(detailRow(`РљРѕРЅС‚СЂ.РІСЂРµРјСЏ: ${distance.controlTimeMinutes} РјРёРЅ`));
    if (distance.penaltyPerMinute) rows.append(detailRow(`РЁС‚СЂР°С„: ${distance.penaltyPerMinute} Р±Р°Р»Р»/РјРёРЅ`));
    if (distance.description) rows.append(detailRow(distance.description));
  } else {
    const orderCodes = distance.order || [];
    const starts = startAliasCodes(distance);
    const checkpoints = orderCodes
      .filter((code) => !starts.has(String(code)))
      .filter((code) => Number(code) >= 31 && Number(code) <= 99).length;
    rows.append(detailRow(`РљРѕР»РёС‡РµСЃС‚РІРѕ РљРџ: ${checkpoints}`));
    if (distance.longInMeters) rows.append(detailRow(`Р”РёСЃС‚Р°РЅС†РёСЏ: ${distance.longInMeters} Рј`));
    rows.append(detailRow(entry.mapExt ? 'РљР°СЂС‚Р°: РµСЃС‚СЊ' : 'РљР°СЂС‚Р°: РЅРµС‚'));
    if (hintsAvailable({ distance })) rows.append(detailRow('РџРѕРґСЃРєР°Р·РєРё: РµСЃС‚СЊ'));
    if (distance.description) rows.append(detailRow(distance.description));
  }

  // РћС‚РїСЂР°РІР»СЏС‚СЊ РјРѕР¶РЅРѕ РїСЂРё Р»СЋР±С‹С… РѕС‚РјРµС‚РєР°С…: Р±РµР· СЃС‚Р°СЂС‚Р° Р±СѓРґРµС‚ DNS, Р±РµР· С„РёРЅРёС€Р° DNF
  $('detailSend').disabled = state.marks.length === 0;

  // Р§С‚Рѕ Р±СѓРґРµС‚ РїСЂРё РїРѕРІС‚РѕСЂРЅРѕР№ РѕС‚РїСЂР°РІРєРµ: РїРѕРґСЃРєР°Р·РєР° РїСЂРѕ РїСЂР°РІРёР»Рѕ Р°РІС‚РѕСЂР°
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

  // РђРєС‚РёРІРЅР° Р»Рё СЌС‚Р° РґРёСЃС‚Р°РЅС†РёСЏ: РєРЅРѕРїРєР° В«РђРєС‚РёРІРёСЂРѕРІР°С‚СЊВ» / В«Р”РµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊВ»
  const active = state.activeId === event.id;
  const activateButton = $('detailActivate');
  activateButton.textContent = active ? 'Р”РµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ' : 'РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ';
  activateButton.className = 'button' + (active ? ' outlined' : '');

  // Р’ С„Р°Р№Р»Рµ РґРёСЃС‚Р°РЅС†РёРё СЃС‚Р°СЂС‚Р° С‡Р°СЃС‚Рѕ РЅРµС‚: РѕРЅ Р»РµР¶РёС‚ РІ РєРѕРѕСЂРґРёРЅР°С‚Р°С… СЃРѕР±С‹С‚РёСЏ.
  // Р”РѕР±Р°РІР»СЏРµРј РµРіРѕ РєР°Рє С‚РѕС‡РєСѓ РєР°СЂС‚С‹, РёРЅР°С‡Рµ С‚СЂРµСѓРіРѕР»СЊРЅРёРєР° РЅРµ РІРёРґРЅРѕ
  // РўРѕС‡РєРё РєР°СЂС‚С‹ вЂ” С‚РѕР»СЊРєРѕ С‚Рµ, С‡С‚Рѕ РµСЃС‚СЊ РІ РјР°СЂС€СЂСѓС‚Рµ, РїР»СЋСЃ СЃС‚Р°СЂС‚ РёР· РєРѕРѕСЂРґРёРЅР°С‚
  // СЃРѕР±С‹С‚РёСЏ. РўРѕС‡РєР°, СЃРѕРІРїР°РІС€Р°СЏ СЃРѕ СЃС‚Р°СЂС‚РѕРј, РЅРµ СЂРёСЃСѓРµС‚СЃСЏ: СЌС‚Рѕ С‚РѕС‚ Р¶Рµ СЃС‚Р°СЂС‚
  const startCode = event.kind === 'rogaine' ? '01' : '1';
  const startLat = Number(distance.latitude);
  const startLon = Number(distance.longitude);
  const orderCodes = distance.order || [];
  const byCode = new Map(points.map((point) => [String(codeOf(point)), point]));

  let mapPoints;
  if (event.kind === 'rogaine') {
    // РЈ СЂРѕРіРµР№РЅР° РїРѕСЂСЏРґРєР° РїСѓРЅРєС‚РѕРІ РЅРµС‚: РЅР° РєР°СЂС‚Рµ РїРѕРєР°Р·С‹РІР°РµРј Р’РЎР• РїСѓРЅРєС‚С‹
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
  updateSendState();
}

/** РђРєС‚РёРІР°С†РёСЏ РґРёСЃС‚Р°РЅС†РёРё вЂ” РєРЅРѕРїРєР° В«РђРєС‚РёРІРёСЂРѕРІР°С‚СЊВ», РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function activateDistance() {
  if (!state.event) return;
  const entry = state.event.entry || {};
  const distance = state.event.distance || {};

  // РћРґРЅР° Р°РєС‚РёРІРЅР°СЏ РґРёСЃС‚Р°РЅС†РёСЏ РЅР° РѕР±Р° РІРёРґР° СЃРїРѕСЂС‚Р°: РєР°Рє anotherDistanceActive РІ РїСЂРёР»РѕР¶РµРЅРёРё
  if (state.activeId && state.activeId !== state.event.id) {
    setStatus('РЎРЅР°С‡Р°Р»Р° РґРµР°РєС‚РёРІРёСЂСѓР№С‚Рµ Р°РєС‚РёРІРЅСѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ', 'error');
    return;
  }

  // РљР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: Р±РµР· РїСЂРѕС„РёР»СЏ СѓС‡Р°СЃС‚РЅРёРє РЅР°С‡Р°С‚СЊ РЅРµ РјРѕР¶РµС‚. РўРѕР»СЊРєРѕ РїРѕРґСЃРєР°Р·РєР°,
  // СЌРєСЂР°РЅ РЅРµ РјРµРЅСЏРµРј вЂ” С‡РµР»РѕРІРµРє РѕСЃС‚Р°С‘С‚СЃСЏ С‚Р°Рј, РіРґРµ РЅР°Р¶РёРјР°Р»
  const who = identity();
  if (!who.nick || who.code.length < 6) {
    setStatus('РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ РїСЂРѕС„РёР»СЊ (РІРєР»Р°РґРєР° В«РџСЂРѕС„РёР»СЊВ»)', 'error');
    return;
  }

  // РЎСЂРѕРє РїСЂРѕРІРµРґРµРЅРёСЏ РѕР±С‰РёР№ РґР»СЏ РІСЃРµС…: РґРѕ РЅР°С‡Р°Р»Р° Рё РїРѕСЃР»Рµ РѕРєРѕРЅС‡Р°РЅРёСЏ РЅРµ Р°РєС‚РёРІРёСЂСѓРµРј
  const periodBlock = markingPeriodBlock({
    startTime: entry.startTime || distance.startTime || 0,
    finishTime: entry.finishTime || distance.finishTime || 0,
  });
  if (periodBlock) {
    showPeriodWarning(periodBlock.before, periodBlock.time);
    return;
  }

  // РџСЂР°РІРёР»Рѕ РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё (domain/CheckpointCoverage.kt):
  // GPS вЂ” РєРѕРѕСЂРґРёРЅР°С‚С‹ РЅСѓР¶РЅС‹ Р’РЎР•Рњ РїСѓРЅРєС‚Р°Рј; QR вЂ” С‚РѕР»СЊРєРѕ СЃС‚Р°СЂС‚Сѓ, РЅРѕРјРµСЂР° РїСѓРЅРєС‚РѕРІ
  // С‡РёС‚Р°СЋС‚СЃСЏ СЃ С‚Р°Р±Р»РёС‡РµРє, Рё РєРѕРѕСЂРґРёРЅР°С‚С‹ РѕСЃС‚Р°Р»СЊРЅС‹С… РґР»СЏ РїСЂРѕС…РѕР¶РґРµРЅРёСЏ РЅРµ РЅСѓР¶РЅС‹
  const points = distance.points || [];
  let missing;
  if (qrMode()) {
    const starts = startAliasCodes(distance);
    const startPoint = points.find((point) => starts.has(String(codeOf(point))));
    if (startPoint) {
      missing = !Number.isFinite(startPoint.latitude) || !Number.isFinite(startPoint.longitude);
    } else {
      // РЎС‚Р°СЂС‚Р° РЅРµС‚ РѕС‚РґРµР»СЊРЅРѕР№ С‚РѕС‡РєРѕР№ вЂ” Р±РµСЂС‘Рј РєРѕРѕСЂРґРёРЅР°С‚С‹ СЃР°РјРѕРіРѕ СЃРѕР±С‹С‚РёСЏ
      const lat = Number(distance.latitude);
      const lon = Number(distance.longitude);
      missing = !Number.isFinite(lat) || !Number.isFinite(lon) || (!lat && !lon);
    }
    if (missing) {
      setStatus('РќРµ СѓРєР°Р·Р°РЅС‹ РєРѕРѕСЂРґРёРЅР°С‚С‹ СЃС‚Р°СЂС‚Р°: Р±РµР· РЅРёС… РґРёСЃС‚Р°РЅС†РёСЋ РЅРµ РЅР°С‡Р°С‚СЊ', 'error');
      return;
    }
  } else {
    missing = points.some(
      (point) => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
    );
  }
  if (missing) {
    setStatus('РќРµ РІСЃРµ РєРѕРѕСЂРґРёРЅР°С‚С‹ СѓРєР°Р·Р°РЅС‹: С‚Р°РєСѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ РЅРµР»СЊР·СЏ Р·Р°РіСЂСѓР·РёС‚СЊ РґР»СЏ РїСЂРѕС…РѕР¶РґРµРЅРёСЏ', 'error');
    return;
  }

  state.activeId = state.event.id;
  writeJson(STORAGE.active, state.event.id);
  state.marks = loadMarks(state.event.id);
  updateSendState();
  renderDetail();
  setStatus('РўРµРїРµСЂСЊ Р’С‹ РјРѕР¶РµС‚Рµ РїСЂРѕРёР·РІРѕРґРёС‚СЊ РѕС‚РјРµС‚РєСѓ РЅР° СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё', 'good');
}

/** Р”РµР°РєС‚РёРІР°С†РёСЏ: РѕС‚РјРµС‚РєРё СЃС‚РёСЂР°СЋС‚СЃСЏ, РґРёСЃС‚Р°РЅС†РёСЏ РїРµСЂРµСЃС‚Р°С‘С‚ Р±С‹С‚СЊ Р°РєС‚РёРІРЅРѕР№. */
function deactivateDistance() {
  resetCompass();
  stopWatch();
  stopQrScanner();
  const eventId = state.event && state.event.id;
  state.activeId = null;
  try {
    localStorage.removeItem(STORAGE.active);
  } catch (error) {
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј вЂ” РїСЂРѕСЃС‚Рѕ РЅРµ СЃРѕС…СЂР°РЅСЏРµРј
  }

  // Р”РµР°РєС‚РёРІР°С†РёСЏ СЃС‚РёСЂР°РµС‚ РѕС‚РјРµС‚РєРё СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё
  if (eventId) {
    clearHintTarget(eventId);
    try {
      localStorage.removeItem(marksKey(eventId));
    } catch (error) {
      // РЅРёС‡РµРіРѕ СЃС‚СЂР°С€РЅРѕРіРѕ
    }
  }
  state.marks = [];

  // РћСЃС‚Р°С‘РјСЃСЏ РЅР° СЌС‚РѕРј Р¶Рµ СЌРєСЂР°РЅРµ: РґРёСЃС‚Р°РЅС†РёСЏ РїСЂРѕСЃС‚Рѕ РїРµСЂРµСЃС‚Р°С‘С‚ Р±С‹С‚СЊ Р°РєС‚РёРІРЅРѕР№
  renderDetail();
  setStatus('Р”РёСЃС‚Р°РЅС†РёСЏ РІС‹РіСЂСѓР¶РµРЅР°, РѕС‚РјРµС‚РєРё РЅРµ РїСЂРѕРёР·РІРѕРґСЏС‚СЃСЏ');
}

/** Р’С‹С…РѕРґ РёР· РїСЂРѕС„РёР»СЏ вЂ” РєР°Рє signOut РІ AppViewModel: РѕС‚РјРµС‚РєРё Рё Р°РєС‚РёРІРЅРѕСЃС‚СЊ СЃРЅРёРјР°СЋС‚СЃСЏ. */
function signOut() {
  const eventId = state.activeId || (state.event && state.event.id);
  stopWatch();
  stopQrScanner();

  // РћС‚РјРµС‚РєРё Р·Р°РіСЂСѓР¶РµРЅРЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё СЃС‚РёСЂР°СЋС‚СЃСЏ РІРјРµСЃС‚Рµ СЃ РїСЂРѕС„РёР»РµРј
  if (eventId) {
    try {
      localStorage.removeItem(marksKey(eventId));
      localStorage.removeItem(STORAGE.event);
      localStorage.removeItem(STORAGE.event + '.' + eventId);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }

  state.activeId = null;
  try {
    localStorage.removeItem(STORAGE.active);
  } catch (error) {
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
  }

  state.event = null;
  state.marks = [];

  // РџСЂРѕС„РёР»СЊ РѕС‡РёС‰Р°РµС‚СЃСЏ: РіРѕСЃС‚СЊ РјРѕР¶РµС‚ СЃРЅРѕРІР° Р·Р°РґР°С‚СЊ РЅРёРє Рё РєРѕРґ
  try {
    localStorage.removeItem(STORAGE.identity);
  } catch (error) {
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
  }

  renderProfileState();
  setStatus('Р’С‹ РІС‹С€Р»Рё РёР· РїСЂРѕС„РёР»СЏ');
}

/** РЎРєР°С‡РёРІР°РµС‚ РєР°СЂС‚Сѓ РґРёСЃС‚Р°РЅС†РёРё РёР· РѕР±Р»Р°РєР° вЂ” РєР°Рє downloadMap РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
async function downloadCloudMap() {
  if (!state.event) return;

  try {
    // Р Р°СЃС€РёСЂРµРЅРёРµ СЃРїСЂР°С€РёРІР°РµРј Сѓ РѕР±Р»Р°РєР°: РєР°СЂС‚Сѓ РјРѕРіР»Рё Р·Р°РјРµРЅРёС‚СЊ РЅР° РґСЂСѓРіСѓСЋ
    const answer = await callFunction('action=mapinfo&id=' + encodeURIComponent(state.event.id));
    const ext = String((answer && answer.ext) || '');

    if (!ext) {
      setStatus('РљР°СЂС‚С‹ РІ РѕР±Р»Р°РєРµ РЅРµС‚', 'error');
      return;
    }

    // Р¤Р°Р№Р» Р»РµР¶РёС‚ РІ С…СЂР°РЅРёР»РёС‰Рµ: maps/<id>.<ext>. РћС‚РєСЂС‹РІР°РµРј РµРіРѕ Р±СЂР°СѓР·РµСЂРѕРј:
    // СЃРєР°С‡Р°С‚СЊ РІ В«Р—Р°РіСЂСѓР·РєРёВ» РЅРµР»СЊР·СЏ вЂ” С…СЂР°РЅРёР»РёС‰Рµ РЅРµ СЂР°Р·СЂРµС€Р°РµС‚ С‡С‚РµРЅРёРµ РёР· Р±СЂР°СѓР·РµСЂР°
    const url = `${CONFIG.mapBucketUrl}/maps/${encodeURIComponent(state.event.id)}.${ext}`;
    setStatus('РћС‚РєСЂС‹РІР°СЋ РєР°СЂС‚СѓвЂ¦');
    window.open(url, '_blank');
  } catch (error) {
    setStatus('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєР°С‡Р°С‚СЊ РєР°СЂС‚Сѓ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.', 'error');
  }
}

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РІС…РѕРґ С‡РµСЂРµР· Р’Рљ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/** РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ Web-РїСЂРёР»РѕР¶РµРЅРёСЏ Р’Рљ (СЃРѕР·РґР°РЅРѕ РІ РєР°Р±РёРЅРµС‚Рµ VK ID). */
const VK_APP_ID = 54866229;

/**
 * РђРґСЂРµСЃ РІРѕР·РІСЂР°С‚Р° вЂ” РћР”РќРђ РєРѕРЅСЃС‚Р°РЅС‚Р°, Р° РЅРµ location.pathname.
 *
 * Р’Рљ СЃРІРµСЂСЏРµС‚ redirect_uri СЃ В«Р”РѕРІРµСЂРµРЅРЅС‹Рј Redirect URLВ» РІ РєР°Р±РёРЅРµС‚Рµ РїРѕСЃРёРјРІРѕР»СЊРЅРѕ.
 * РЎС‚СЂР°РЅРёС†Р° РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ С‚Рѕ РєР°Рє В«вЂ¦/OSportMobileLite/В», С‚Рѕ РєР°Рє
 * В«вЂ¦/OSportMobileLite/index.htmlВ» вЂ” РїСЂРё РІС‹С‡РёСЃР»РµРЅРёРё РЅР° С…РѕРґСѓ Р°РґСЂРµСЃ РјРµРЅСЏР»СЃСЏ,
 * Рё РІРёРґР¶РµС‚ РѕС‚РІРµС‡Р°Р» РѕС€РёР±РєРѕР№. РљРѕРЅСЃС‚Р°РЅС‚Р° СѓР±РёСЂР°РµС‚ СЌС‚Сѓ СЂР°Р·РЅРёС†Сѓ.
 */
const VK_REDIRECT_URL = 'https://sergeievsujkov.github.io/OSportMobileLite/';

/** РЎР±РѕСЂРєР° SDK: СЃРЅР°С‡Р°Р»Р° РЅР°С€Р° РєРѕРїРёСЏ РёР· СЂРµРїРѕР·РёС‚РѕСЂРёСЏ, CDN вЂ” Р·Р°РїР°СЃРЅС‹Рµ. */
const VK_SDK_URLS = [
  'vkid-sdk.js',
  'https://unpkg.com/@vkid/sdk@3.0.0/dist-sdk/umd/index.js',
];

let vkOneTapRendered = false;

/** РљРѕРґ РїСЂРѕС„РёР»СЏ РёР· VK ID вЂ” РїСЂР°РІРёР»Рѕ VkProfileCode РІ РїСЂРёР»РѕР¶РµРЅРёРё, РјРµРЅСЏС‚СЊ РЅРµР»СЊР·СЏ. */
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

/** РџРѕРґРіСЂСѓР¶Р°РµС‚ SDK РїРѕ С‚СЂРµР±РѕРІР°РЅРёСЋ: РѕС„Р»Р°Р№РЅ РІС…РѕРґ РЅРµРІРѕР·РјРѕР¶РµРЅ. */
function loadVkSdk() {
  const ready = () => window.VKIDSDK || window.VKID || null;
  if (ready()) return Promise.resolve(ready());

  const trySource = (url) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => (ready() ? resolve(ready()) : reject(new Error('SDK РЅРµ Р·Р°РіСЂСѓР·РёР»СЃСЏ')));
    script.onerror = () => reject(new Error('SDK РЅРµ Р·Р°РіСЂСѓР·РёР»СЃСЏ'));
    document.head.append(script);
  });

  return VK_SDK_URLS.reduce(
    (chain, url) => chain.catch(() => trySource(url)),
    Promise.reject(new Error('SDK РЅРµ Р·Р°РіСЂСѓР·РёР»СЃСЏ'))
  );
}

/** Р—Р°РїРѕРјРЅРёС‚СЊ РЅРёРє РґР»СЏ РїСЂРѕС„РёР»СЏ Р’Рљ: РїСЂРё СЃР»РµРґСѓСЋС‰РµРј РІС…РѕРґРµ РѕРЅ РїРѕРґСЃС‚Р°РІРёС‚СЃСЏ СЃРЅРѕРІР°. */
function rememberVkNick(vkId, nick) {
  if (!vkId || !nick) return;
  const names = readJson(STORAGE.vkNames, {});
  names[String(vkId)] = nick;
  writeJson(STORAGE.vkNames, names);
}

/** РџСЂРµР¶РЅРёР№ РЅРёРє СЌС‚РѕРіРѕ РїСЂРѕС„РёР»СЏ Р’Рљ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ, РµСЃР»Рё РѕРЅ Р±С‹Р» Р·Р°РґР°РЅ. */
function knownVkNick(vkId) {
  const names = readJson(STORAGE.vkNames, {});
  return String(names[String(vkId)] || '').trim();
}

/** РЎРѕС…СЂР°РЅСЏРµС‚ РїСЂРѕС„РёР»СЊ, РїРѕР»СѓС‡РµРЅРЅС‹Р№ РѕС‚ Р’Рљ: РЅРёРє, РєРѕРґ РїСЂРѕС„РёР»СЏ РёР· VK ID Рё С„РѕС‚Рѕ. */
function saveVkProfile(user) {
  const vkId = Number(user.user_id || user.id || 0);
  const code = vkProfileCode(vkId);
  if (!code) throw new Error('Р’Рљ РЅРµ РІРµСЂРЅСѓР» РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ');

  // РЎРІРѕР№ РїСЂРµР¶РЅРёР№ РЅРёРє РІР°Р¶РЅРµРµ РёРјРµРЅРё РёР· Р’Рљ: С‡РµР»РѕРІРµРє СѓР¶Рµ РІС‹Р±СЂР°Р», РєР°Рє РїРѕРґРїРёСЃС‹РІР°С‚СЊСЃСЏ
  const fromVk = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const nick = knownVkNick(vkId) || fromVk || ('Р’Рљ ' + vkId);
  rememberVkNick(vkId, nick);

  writeJson(STORAGE.identity, {
    nick,
    code,
    vkId,
    photo: user.avatar || user.photo_200 || '',
  });

  vkOneTapRendered = false;
  renderProfileState();
  setStatus('Р’С…РѕРґ РІС‹РїРѕР»РЅРµРЅ', 'good');
}

/**
 * РљРЅРѕРїРєР° РІС…РѕРґР° Р’Рљ вЂ” РІРёРґР¶РµС‚ One Tap РІ СЂРµР¶РёРјРµ Callback, РєР°Рє РІ РїСЂРёРјРµСЂРµ VK:
 * СЃС‚СЂР°РЅРёС†Р° РЅРёРєСѓРґР° РЅРµ СѓС…РѕРґРёС‚, РєРѕРґ РїСЂРёС…РѕРґРёС‚ РІ СЃРѕР±С‹С‚РёРё Рё РјРµРЅСЏРµС‚СЃСЏ РЅР° С‚РѕРєРµРЅ.
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
        // РџРѕРєР°Р·С‹РІР°РµРј РІСЃС‘, С‡С‚Рѕ РїСЂРёС€Р»Рѕ: РїРѕ РєРѕРґСѓ РІРёРґРЅРѕ, С‡СЊСЏ СЌС‚Рѕ РѕС€РёР±РєР° вЂ” Р’Рљ РёР»Рё СЃРµС‚Рё
        console.error('VK ID widget error', error);
        let detail = '';
        try {
          detail = error && (error.error_description || error.error_text
            || error.message || error.code || JSON.stringify(error));
        } catch (ignored) {
          detail = '';
        }
        setStatus('Р’Рљ: ' + (detail || 'РѕС€РёР±РєР° РІРёРґР¶РµС‚Р°'), 'error');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const tokens = await VKID.Auth.exchangeCode(payload.code, payload.device_id);
          const info = await VKID.Auth.userInfo(tokens.access_token);
          saveVkProfile((info && info.user) || {});
        } catch (error) {
          setStatus('РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё С‡РµСЂРµР· Р’Рљ: ' + error.message, 'error');
        }
      });

    vkOneTapRendered = true;
  } catch (error) {
    setStatus('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р’Рљ: ' + error.message, 'error');
  }
}

/**
 * Р’РѕР·РІСЂР°С‚ РёР· Р’Рљ СЂРµРґРёСЂРµРєС‚РѕРј: СЃС‚СЂР°РЅРёС†Р° РѕС‚РєСЂС‹Р»Р°СЃСЊ СЃ ?code=вЂ¦
 *
 * РўР°Рє Р±С‹РІР°РµС‚, РєРѕРіРґР° РІС…РѕРґ РЅР°С‡Р°Р»Рё РІ РїСЂРёР»РѕР¶РµРЅРёРё, Р° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїСЂРѕС€Р»Рѕ РІ Р±СЂР°СѓР·РµСЂРµ:
 * СЂРµР·СѓР»СЊС‚Р°С‚ РїСЂРёС…РѕРґРёС‚ РїР°СЂР°РјРµС‚СЂР°РјРё Р°РґСЂРµСЃР°. РњРµРЅСЏРµРј РєРѕРґ РЅР° РїСЂРѕС„РёР»СЊ Рё СѓР±РёСЂР°РµРј
 * РїР°СЂР°РјРµС‚СЂС‹ РёР· Р°РґСЂРµСЃР°, С‡С‚РѕР±С‹ РїРѕРІС‚РѕСЂРЅР°СЏ Р·Р°РіСЂСѓР·РєР° РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°Р»Р°.
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
    setStatus('Р’С…РѕРґ РІС‹РїРѕР»РЅРµРЅ', 'good');
    history.replaceState({}, '', location.pathname);
  } catch (error) {
    setStatus('РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё С‡РµСЂРµР· Р’Рљ: ' + error.message, 'error');
  }
}

/**
 * Р’РѕР·РІСЂР°С‚ РІ РїСЂРёР»РѕР¶РµРЅРёРµ РїРѕСЃР»Рµ РІС…РѕРґР° РІ РґСЂСѓРіРѕР№ РІРєР»Р°РґРєРµ.
 *
 * РџСЂРѕС„РёР»СЊ С…СЂР°РЅРёС‚СЃСЏ РІ РѕР±С‰РµРј С…СЂР°РЅРёР»РёС‰Рµ СЃР°Р№С‚Р°, РїРѕСЌС‚РѕРјСѓ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїРµСЂРµС‡РёС‚Р°С‚СЊ РµРіРѕ
 * РїСЂРё РїРѕСЏРІР»РµРЅРёРё РѕРєРЅР°: РїСЂРёР»РѕР¶РµРЅРёРµ СЃСЂР°Р·Сѓ РїРѕРєР°Р¶РµС‚ РІС…РѕРґ, С…РѕС‚СЏ РѕРЅ Р±С‹Р» РІ Р±СЂР°СѓР·РµСЂРµ.
 */
function refreshIdentityFromStorage() {
  renderProfileState();
  renderHome();
  if (state.event) renderDetail();
}

/** РџРѕРєР°Р·С‹РІР°РµС‚ Р±Р»РѕРє РїСЂРѕС„РёР»СЏ РїРѕ СЃРѕСЃС‚РѕСЏРЅРёСЋ: РіРѕСЃС‚СЊ РёР»Рё РІРѕС€РµРґС€РёР№. */
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

/** РЎРѕРІРјРµСЃС‚РёРјРѕСЃС‚СЊ: РїСЂРµР¶РЅРµРµ РёРјСЏ С„СѓРЅРєС†РёРё. */
function updateProfileButtons() {
  renderProfileState();
}

/** РћРєРЅРѕ В«РР·РјРµРЅРёС‚СЊ РЅРёРєВ»: РєРѕРґ РїСЂРѕС„РёР»СЏ РѕСЃС‚Р°С‘С‚СЃСЏ РїСЂРµР¶РЅРёРј. */
function openNickDialog() {
  const me = identity();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'РР·РјРµРЅРёС‚СЊ РЅРёРє';

  const hint = document.createElement('p');
  hint.textContent = 'РќРёРє РІРёРґРµРЅ РІ РїСЂРѕС‚РѕРєРѕР»Рµ Рё РЅР° РєР°СЂС‚РѕС‡РєР°С… СЃРѕР±С‹С‚РёР№. РљРѕРґ РїСЂРѕС„РёР»СЏ РЅРµ РјРµРЅСЏРµС‚СЃСЏ.';

  const input = document.createElement('input');
  input.className = 'input';
  input.type = 'text';
  input.maxLength = 20;
  input.value = me.nick;

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const save = document.createElement('button');
  save.className = 'button';
  save.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ';
  save.addEventListener('click', () => {
    const nick = input.value.trim();
    if (nick.length < 3) {
      setStatus('РќРёРє РєРѕСЂРѕС‡Рµ С‚СЂС‘С… Р·РЅР°РєРѕРІ', 'error');
      return;
    }
    const data = readJson(STORAGE.identity, {});
    writeJson(STORAGE.identity, { ...data, nick });
    if (data.vkId) rememberVkNick(data.vkId, nick);
    overlay.remove();
    renderProfileState();
    setStatus('РќРёРє РёР·РјРµРЅС‘РЅ', 'good');
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅР°';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(save, cancel);
  modal.append(title, hint, input, actions);
  overlay.append(modal);
  document.body.append(overlay);
  input.focus();
}

/** РћРєРЅРѕ В«Р’С‹Р№С‚Рё РёР· РїСЂРѕС„РёР»СЏ?В» вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function openSignOutDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Р’С‹Р№С‚Рё РёР· РїСЂРѕС„РёР»СЏ?';

  const hint = document.createElement('p');
  hint.textContent = 'Р’С‹ С‚РѕС‡РЅРѕ С…РѕС‚РёС‚Рµ РІС‹Р№С‚Рё? РћС‚РјРµС‚РєРё СѓРґР°Р»СЏС‚СЃСЏ.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Р’С‹Р№С‚Рё';
  confirm.addEventListener('click', () => {
    overlay.remove();
    signOut();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅР°';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** РћРєРЅРѕ В«РЈРґР°Р»РёС‚СЊ СЃРѕР±С‹С‚РёРµ?В» вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function openDeleteDialog(eventId) {
  const name = ($('detailTitle') && $('detailTitle').textContent) || 'РЎРѕР±С‹С‚РёРµ';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'РЈРґР°Р»РёС‚СЊ СЃРѕР±С‹С‚РёРµ?';

  const hint = document.createElement('p');
  hint.textContent = `Р”РёСЃС‚Р°РЅС†РёСЏ В«${name}В» Р±СѓРґРµС‚ СѓРґР°Р»РµРЅР° СЃ СѓСЃС‚СЂРѕР№СЃС‚РІР° РІРјРµСЃС‚Рµ СЃРѕ СЃРІРѕРёРјРё РѕС‚РјРµС‚РєР°РјРё Рё СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё. `
    + 'Р’С‹ РјРѕР¶РµС‚Рµ СЃРЅРѕРІР° Р·Р°РіСЂСѓР·РёС‚СЊ РµС‘ РёР· РѕР±Р»Р°РєР°.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'РЈРґР°Р»РёС‚СЊ';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deleteEvent(eventId);
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅР°';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** РћРєРЅРѕ В«РЈРґР°Р»РёС‚СЊ СЃРѕР±С‹С‚РёРµ?В» РґР»СЏ РіСЂСѓРїРїС‹. */
function openGroupDeleteDialog(groupId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'РЈРґР°Р»РёС‚СЊ РіСЂСѓРїРїСѓ?';

  const hint = document.createElement('p');
  hint.textContent = 'Р’СЃРµ РґРёСЃС‚Р°РЅС†РёРё РіСЂСѓРїРїС‹, РёС… РїСѓРЅРєС‚С‹ Рё СЂРµР·СѓР»СЊС‚Р°С‚С‹ Р±СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹ СЃ СѓСЃС‚СЂРѕР№СЃС‚РІР°';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'РЈРґР°Р»РёС‚СЊ';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deleteGroup(groupId);
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅР°';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** РЈРґР°Р»СЏРµС‚ РІСЃСЋ РіСЂСѓРїРїСѓ: РєР°Р¶РґСѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ Рё РµС‘ РѕС‚РјРµС‚РєРё. */
function deleteGroup(groupId) {
  resetCompass();
  const group = readJson(STORAGE.group, null);
  const groupItems = (group && group.items) || [];

  // РџСЂРёР·РЅР°Рє РіСЂСѓРїРїС‹ РјРѕРі РЅРµ СЃРѕС…СЂР°РЅРёС‚СЊСЃСЏ вЂ” С‚РѕРіРґР° СѓРґР°Р»СЏРµРј РІСЃСЋ СЃРѕС…СЂР°РЅС‘РЅРЅСѓСЋ РіСЂСѓРїРїСѓ,
  // РёРЅР°С‡Рµ РЅР° РіР»Р°РІРЅРѕРј РѕСЃС‚Р°С‘С‚СЃСЏ РѕРґРЅР° РёР· РµС‘ РґРёСЃС‚Р°РЅС†РёР№
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
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  });

  state.history = (state.history || []).filter((item) => !ids.includes(item.id));
  saveHistory();

  if (state.activeId && ids.includes(state.activeId)) {
    state.activeId = null;
    try {
      localStorage.removeItem(STORAGE.active);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }

  // РЈР±РёСЂР°РµРј СЃРѕС…СЂР°РЅС‘РЅРЅРѕРµ СЃРѕР±С‹С‚РёРµ, РґР°Р¶Рµ РµСЃР»Рё РѕС‚РєСЂС‹С‚Рѕ Р±С‹Р»Рѕ РґСЂСѓРіРѕРµ
  const storedEvent = readJson(STORAGE.event, null);
  if (storedEvent && ids.includes(storedEvent.id)) {
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
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
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
  }

  renderHome();
  showTab('events');
  setStatus('РЎРѕР±С‹С‚РёРµ СѓРґР°Р»РµРЅРѕ');
}

/** РЈРґР°Р»СЏРµС‚ СЃРѕР±С‹С‚РёРµ СЃ СѓСЃС‚СЂРѕР№СЃС‚РІР°: Р·Р°РїРёСЃСЊ, РѕС‚РјРµС‚РєРё, Р°РєС‚РёРІРЅРѕСЃС‚СЊ Рё РіСЂСѓРїРїСѓ. */
function deleteEvent(eventId) {
  // Р“СЂСѓРїРїР° СѓРґР°Р»СЏРµС‚СЃСЏ С‚РѕР»СЊРєРѕ С†РµР»РёРєРѕРј: РѕС‚РґРµР»СЊРЅСѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ РёР· РЅРµС‘ РЅРµ СѓР±РёСЂР°РµРј
  const event = readJson(STORAGE.event + '.' + eventId, null)
    || (state.event && state.event.id === eventId ? state.event : null);
  const groupId = String((event && event.entry && event.entry.groupId) || '');
  if (groupId) {
    deleteGroup(groupId);
    return;
  }

  resetCompass();
  stopWatch();
  stopQrScanner();

  const storedEvent = readJson(STORAGE.event, null);
  if (storedEvent && storedEvent.id === eventId) {
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }

  clearHintTarget(eventId);
  try {
    localStorage.removeItem(marksKey(eventId));
    localStorage.removeItem(STORAGE.event + '.' + eventId);
  } catch (error) {
    // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
  }

  state.history = (state.history || []).filter((item) => item.id !== eventId);
  saveHistory();

  if (state.activeId === eventId) {
    state.activeId = null;
    try {
      localStorage.removeItem(STORAGE.active);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }

  if (state.event && state.event.id === eventId) {
    state.event = null;
    state.marks = [];
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }

  const group = readJson(STORAGE.group, null);
  if (group && (group.items || []).some((item) => item.id === eventId)) {
    localStorage.removeItem(STORAGE.group);
  }

  renderHome();
  showTab('events');
  setStatus('РЎРѕР±С‹С‚РёРµ СѓРґР°Р»РµРЅРѕ');
}

/** РћРєРЅРѕ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РґРµР°РєС‚РёРІР°С†РёРё вЂ” РєР°Рє UnloadDialog РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function openDeactivateDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'Р”РµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ РґРёСЃС‚Р°РЅС†РёСЋ?';

  const hint = document.createElement('p');
  hint.textContent = 'РћС‚РјРµС‚РёС‚СЊСЃСЏ РїРѕ РЅРµР№ Р±РѕР»СЊС€Рµ РЅРµР»СЊР·СЏ, РїРѕРєР° РЅРµ Р·Р°РіСЂСѓР·РёС‚Рµ РµС‘ СЃРЅРѕРІР°. Р’РђРЁР РћРўРњР•РўРљР Р‘РЈР”РЈРў РћР§РР©Р•РќР«.';

  const warning = document.createElement('p');
  warning.textContent = 'Р•СЃР»Рё Р’С‹ РЅРµ РѕС‚РїСЂР°РІРёР»Рё СЂРµР·СѓР»СЊС‚Р°С‚ РїСЂРѕС…РѕР¶РґРµРЅРёСЏ РґРёСЃС‚Р°РЅС†РёРё, С‚Рѕ РѕРЅ Р±СѓРґРµС‚ СѓРґР°Р»С‘РЅ СЃ СѓСЃС‚СЂРѕР№СЃС‚РІР°.';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  // В«РћС‚РїСЂР°РІРёС‚СЊ РѕС‚РјРµС‚РєРёВ» вЂ” СЃРЅР°С‡Р°Р»Р° РѕС‚РїСЂР°РІРєР°, РїРѕС‚РѕРј РґРµР°РєС‚РёРІР°С†РёСЏ
  const sendAndExit = document.createElement('button');
  sendAndExit.className = 'button';
  sendAndExit.textContent = 'РћС‚РїСЂР°РІРёС‚СЊ РѕС‚РјРµС‚РєРё';
  sendAndExit.addEventListener('click', async () => {
    overlay.remove();

    // Р‘РµР· РѕС‚РјРµС‚РѕРє РѕС‚РїСЂР°РІР»СЏС‚СЊ РЅРµС‡РµРіРѕ: РґРµР°РєС‚РёРІРёСЂСѓРµРј Рё РіРѕРІРѕСЂРёРј РѕР± СЌС‚РѕРј
    if (!state.marks.length) {
      deactivateDistance();
      setStatus('РћС‚РјРµС‚РѕРє РЅРµС‚: РїРѕ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё РЅРёС‡РµРіРѕ РЅРµ РѕС‚РјРµС‡РµРЅРѕ, РѕС‚РїСЂР°РІР»СЏС‚СЊ РЅРµС‡РµРіРѕ.', 'error');
      return;
    }

    // РћС‚РјРµС‚РєРё РЅРµ РѕС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё: СЃРїСЂР°С€РёРІР°РµРј РѕС‚РґРµР»СЊРЅРѕ
    if (!marksMatchDistance()) {
      openMismatchDialog();
      return;
    }

    await sendResult();
    deactivateDistance();
  });

  const exit = document.createElement('button');
  exit.className = 'button outlined';
  exit.textContent = 'РќРµ РѕС‚РїСЂР°РІР»СЏС‚СЊ РѕС‚РјРµС‚РєРё Рё РґРµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ';
  exit.addEventListener('click', () => {
    overlay.remove();
    deactivateDistance();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅР°';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(sendAndExit, exit, cancel);
  modal.append(title, hint, warning, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** РџРѕРґС…РѕРґСЏС‚ Р»Рё РѕС‚РјРµС‚РєРё СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё: РєРѕРґС‹ РёР· РјР°СЂС€СЂСѓС‚Р°, СЃС‚Р°СЂС‚ РёР»Рё С„РёРЅРёС€. */
function marksMatchDistance() {
  const distance = (state.event && state.event.distance) || {};
  const rogaine = rogaineMode();
  const starts = startAliasCodes(distance);
  // РџСЂРѕРІРµСЂСЏРµРј РїРѕ РїСѓРЅРєС‚Р°Рј СЃР°РјРѕР№ РґРёСЃС‚Р°РЅС†РёРё, Р° РЅРµ С‚РѕР»СЊРєРѕ РїРѕ РїРѕСЂСЏРґРєСѓ: Сѓ СЂРѕРіРµР№РЅР°
  // РїРѕСЂСЏРґРєР° РЅРµС‚, Р° Сѓ СЃРѕСЃРµРґРЅРµР№ РґРёСЃС‚Р°РЅС†РёРё РєРѕРґС‹ РјРѕРіСѓС‚ СЃРѕРІРїР°СЃС‚СЊ
  const allowed = new Set((distance.points || []).map((point) => String(codeOf(point))));
  (distance.order || []).forEach((code) => allowed.add(String(code)));
  starts.forEach((code) => allowed.add(code));

  const finishCode = rogaine ? '02' : '2';
  allowed.add(finishCode);

  return state.marks.length > 0 && state.marks.every((mark) => allowed.has(String(mark.code)));
}

/** В«РћС‚РјРµС‚РєРё РЅРµ РѕС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё?В» вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function openMismatchDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.textContent = 'РћС‚РјРµС‚РєРё РЅРµ РѕС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё?';

  const hint = document.createElement('p');
  hint.textContent = 'РћС‚РјРµС‚РєРё РЅРµ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё. РћС‚РїСЂР°РІР»СЏС‚СЊ РёС… РЅРµР»СЊР·СЏ. РћС‚РјРµРЅРёС‚СЊ РґРµР°РєС‚РёРІР°С†РёСЋ РёР»Рё РІСЃС‘ СЂР°РІРЅРѕ РґРµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ?';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const confirm = document.createElement('button');
  confirm.className = 'button';
  confirm.textContent = 'Р’СЃС‘ СЂР°РІРЅРѕ РґРµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ';
  confirm.addEventListener('click', () => {
    overlay.remove();
    deactivateDistance();
  });

  const cancel = document.createElement('button');
  cancel.className = 'button text';
  cancel.textContent = 'РћС‚РјРµРЅРёС‚СЊ РґРµР°РєС‚РёРІР°С†РёСЋ';
  cancel.addEventListener('click', () => overlay.remove());

  actions.append(confirm, cancel);
  modal.append(title, hint, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

/** РћС‚РєСЂС‹РІР°РµС‚ РїСЂРѕРіСЂРµСЃСЃ РїРѕ СЃРІРѕРёРј РѕС‚РјРµС‚РєР°Рј СЃ СѓСЃС‚СЂРѕР№СЃС‚РІР°. */
function openMyProgress() {
  sanitizeMarks();
  // РћС‚РјРµС‚РѕРє РЅРµС‚ вЂ” РѕС‚РєСЂС‹РІР°С‚СЊ РЅРµС‡РµРіРѕ: РіРѕРІРѕСЂРёРј РѕР± СЌС‚РѕРј, РєР°Рє РїСЂРёР»РѕР¶РµРЅРёРµ
  if (!state.marks.length) {
    setStatus('РћС‚РјРµС‚РѕРє РЅРµС‚: РїРѕ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё РЅРёС‡РµРіРѕ РЅРµ РѕС‚РјРµС‡РµРЅРѕ', 'error');
    return;
  }

  const me = readJson(STORAGE.identity, { nick: '', code: '' });
  const start = state.marks.find((mark) => mark.start);
  const finish = state.marks.find((mark) => mark.finish);
  const points = rogaineMode() ? rogainePoints(state.marks) : 0;

  const row = {
    userId: me.code || 'me',
    nick: me.nick || 'РњРѕРё РѕС‚РјРµС‚РєРё',
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
  // В«РћС‚РјРµС‚РєРё РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµВ»: СЃРІРѕС‘ РїСЂР°РІРёР»Рѕ РїРѕРєР°Р·Р° вЂ” С‚РѕР»СЊРєРѕ РґРёСЃС‚Р°РЅС†РёСЏ, РЅРёРє
  // Рё РѕС‚РјРµС‚РєРё, Р±РµР· РІСЂРµРјРµРЅРё, СЂРµР·СѓР»СЊС‚Р°С‚Р° Рё РјРµСЃС‚Р°
  openParticipant(row, rogaineMode(), false);
}

/**
 * РљР°СЂС‚Р° РїСѓРЅРєС‚РѕРІ вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё.
 *
 * РўР°Р№Р»С‹ OpenStreetMap РёР»Рё OpenTopoMap, РєСЂР°СЃРЅР°СЏ Р»РёРЅРёСЏ РјР°СЂС€СЂСѓС‚Р°, Р·РЅР°С‡РєРё:
 * СЃС‚Р°СЂС‚ вЂ” С‚СЂРµСѓРіРѕР»СЊРЅРёРє, С„РёРЅРёС€ вЂ” РґРІРѕР№РЅР°СЏ РѕРєСЂСѓР¶РЅРѕСЃС‚СЊ, РєРѕРЅС‚СЂРѕР»СЊРЅС‹Р№ РїСѓРЅРєС‚ вЂ”
 * РѕРєСЂСѓР¶РЅРѕСЃС‚СЊ СЃ РЅРѕРјРµСЂРѕРј СЃРїСЂР°РІР° (РЅРѕРјРµСЂ СЃ Р±РµР»РѕР№ РѕР±РІРѕРґРєРѕР№). РљРЅРѕРїРєРё В«СЃР»РѕРёВ» Рё
 * В«РЅР° РІРµСЃСЊ СЌРєСЂР°РЅВ», РїРѕРґРїРёСЃСЊ РёСЃС‚РѕС‡РЅРёРєР° СЃР»РµРІР° СЃРІРµСЂС…Сѓ, РєРѕРѕСЂРґРёРЅР°С‚С‹ РїРѕРґ РєР°СЂС‚РѕР№.
 */
const MAP_KINDS = [
  {
    id: 'osm',
    urls: ['https://tile.openstreetmap.org/'],
    attribution: 'В© OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'topo',
    urls: ['https://a.tile.opentopomap.org/', 'https://b.tile.opentopomap.org/', 'https://c.tile.opentopomap.org/'],
    attribution: 'Kartendaten: В© OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: В© OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
];

const mapState = {
  kind: 0,
  fullscreen: false,
  points: [],
  zoom: null,      // null вЂ” РїРѕРґРѕР±СЂР°С‚СЊ РїРѕ РіСЂР°РЅРёС†Р°Рј РїСЂРё РїРµСЂРІРѕРј РїРѕРєР°Р·Рµ
  center: null,    // { latitude, longitude }
  labels: null,    // РїРѕРґРїРёСЃРё РїСѓРЅРєС‚РѕРІ РґР»СЏ РіСЂСѓРїРїС‹: РєРѕРґ в†’ В«1 - 31В»
  showRoute: true, // Сѓ РіСЂСѓРїРїС‹ Р»РёРЅРёСЏ РјР°СЂС€СЂСѓС‚Р° РЅРµ СЂРёСЃСѓРµС‚СЃСЏ
  routeCodes: null, // РїРѕСЂСЏРґРѕРє Р»РёРЅРёРё РЅР° СЃРїР»РёС‚Рµ СѓС‡Р°СЃС‚РЅРёРєР°; null вЂ” order РґРёСЃС‚Р°РЅС†РёРё
  box: null,       // РєРѕРЅС‚РµР№РЅРµСЂ РєР°СЂС‚С‹, РєРѕС‚РѕСЂСѓСЋ СЃРµР№С‡Р°СЃ РїРѕРєР°Р·С‹РІР°РµРј
  coords: null,    // РїРѕРґРїРёСЃСЊ РєРѕРѕСЂРґРёРЅР°С‚ РІРЅСѓС‚СЂРё РєР°СЂС‚С‹ (Сѓ РіСЂСѓРїРїС‹ РµС‘ РЅРµС‚)
  // РљРѕРјРїР°СЃ: РїРѕРІРѕСЂРѕС‚ РєР°СЂС‚С‹ РїРѕ РєСѓСЂСЃСѓ С‚РµР»РµС„РѕРЅР°
  compass: false,
  compassLoaded: false,
  compassHeading: 0,
  compassSeen: false,
  compassAbsolute: false,
  compassTimer: null,
  compassListening: false,
  cloudEntries: null,
  rotation: 0,
  layerScale: 1,
  layerTx: 0,
  layerTy: 0,
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

/** РџРѕРєР°Р·С‹РІР°РµС‚ РєР°СЂС‚Сѓ РіСЂСѓРїРїС‹ РІ РµС‘ РєРѕРЅС‚РµР№РЅРµСЂРµ: РїРѕРґРїРёСЃРё Р·Р°РґР°РЅС‹, Р»РёРЅРёСЏ РЅРµ СЂРёСЃСѓРµС‚СЃСЏ. */
function showMapOn(box, points, options = {}) {
  // Р’СЃС‚СЂРѕРµРЅРЅР°СЏ РєР°СЂС‚Р° РІСЃРµРіРґР° СЃРµРІРµСЂРѕРј РІРІРµСЂС…: РєРѕРјРїР°СЃ вЂ” С‚РѕР»СЊРєРѕ РЅР° РїРѕР»РЅРѕСЌРєСЂР°РЅРЅРѕР№.
  mapState.fullscreen = false;
  stopCompass();
  mapState.points = (points || []).filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );
  mapState.routeCodes = options.routeCodes || null;
  mapState.labels = options.labels || null;
  mapState.cloudEntries = options.cloudEntries || null;
  if (options.showRoute !== undefined) mapState.showRoute = options.showRoute;
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
  // РћР±С‹С‡РЅР°СЏ РєР°СЂС‚Р° СЃРѕР±С‹С‚РёСЏ вЂ” Р±РµР· РїРѕРІРѕСЂРѕС‚Р°; РєРѕРјРїР°СЃ С‚РѕР»СЊРєРѕ РІ РїРѕР»РЅРѕСЌРєСЂР°РЅРЅРѕРј СЂРµР¶РёРјРµ.
  mapState.fullscreen = false;
  mapState.cloudEntries = null;
  stopCompass();
  const current = state.event;
  const distance = (current && current.distance) || {};
  const routeVisible = distance.routeVisible !== false;

  const all = (points || []).filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );

  // РљР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: РїСЂРё СЃРєСЂС‹С‚РѕРј РјР°СЂС€СЂСѓС‚Рµ РЅР° РєР°СЂС‚Рµ РѕСЃС‚Р°С‘С‚СЃСЏ С‚РѕР»СЊРєРѕ СЃС‚Р°СЂС‚
  let visible = all;
  if (!routeVisible) {
    const start = all.find((point) => isStart(String(codeOf(point)), rogaineMode()));
    const fallback = (Number(distance.latitude) || Number(distance.longitude))
      ? [{ latitude: Number(distance.latitude), longitude: Number(distance.longitude) }]
      : [];
    visible = start ? [start] : fallback;
  }

  mapState.points = visible;
  mapState.routeCodes = null;

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
    `РЁРёСЂРѕС‚Р° ${lat.toFixed(5).replace('.', ',')} В· Р”РѕР»РіРѕС‚Р° ${lon.toFixed(5).replace('.', ',')}`;
  box.append(coords);

  // РљР°СЂС‚Р° Р·Р°РїРѕРјРёРЅР°РµС‚ РєРѕРЅС‚РµР№РЅРµСЂ Рё РєРѕРѕСЂРґРёРЅР°С‚С‹: РїРѕ РЅРёРј РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚СЃСЏ РїСЂРё Р¶РµСЃС‚Р°С…
  mapState.box = box;
  mapState.coords = coords.textContent;

  // Р–РµСЃС‚С‹: С‰РёРїРѕРє вЂ” РјР°СЃС€С‚Р°Р±, РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёРµ вЂ” СЃРґРІРёРі РєР°СЂС‚С‹
  bindMapGestures(box);
}

/** Р РёСЃСѓРµС‚ С‚Р°Р№Р»С‹, Р»РёРЅРёСЋ РјР°СЂС€СЂСѓС‚Р° Рё Р·РЅР°С‡РєРё РїСѓРЅРєС‚РѕРІ. */
/** РђР·РёРјСѓС‚ РѕС‚ С‚РѕС‡РєРё Рє С‚РѕС‡РєРµ: 0 вЂ” СЃРµРІРµСЂ, РґР°Р»СЊС€Рµ РїРѕ С‡Р°СЃРѕРІРѕР№ СЃС‚СЂРµР»РєРµ. */
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

const MAP_COMPASS_KEY = 'osport.lite.mapcompass';

function loadCompassPreference() {
  if (mapState.compassLoaded) return;
  try {
    mapState.compass = localStorage.getItem(MAP_COMPASS_KEY) === '1';
  } catch (error) {
    mapState.compass = false;
  }
  mapState.compassLoaded = true;
}

function saveCompassPreference() {
  try {
    localStorage.setItem(MAP_COMPASS_KEY, mapState.compass ? '1' : '0');
  } catch (error) {
    // РџСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј РјРѕР¶РµС‚ Р·Р°РїСЂРµС‚РёС‚СЊ Р·Р°РїРёСЃСЊ
  }
}

function applyMapLayerTransform() {
  const layer = mapState.box && mapState.box.querySelector('.map-layer');
  if (!layer) return;
  layer.style.transform =
    `translate(${mapState.layerTx}px, ${mapState.layerTy}px) ` +
    `scale(${mapState.layerScale}) rotate(${mapState.rotation}deg)`;
}

function onDeviceOrientation(event, absolute) {
  // РђР±СЃРѕР»СЋС‚РЅС‹Р№ РґР°С‚С‡РёРє РїСЂРµРґРїРѕС‡С‚РёС‚РµР»СЊРЅРµРµ: РѕР±С‹С‡РЅС‹Р№ РЅР° Android РјРѕР¶РµС‚ РѕС‚РґР°РІР°С‚СЊ
  // РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Р№ СѓРіРѕР» Рё РґР°РІР°С‚СЊ СЂС‹РІРєРё.
  if (absolute) mapState.compassAbsolute = true;
  else if (mapState.compassAbsolute) return;

  let heading = null;
  if (typeof event.webkitCompassHeading === 'number') {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === 'number') {
    heading = 360 - event.alpha;
  }
  if (!Number.isFinite(heading)) return;
  heading = (heading + 360) % 360;

  if (!mapState.compassSeen) {
    mapState.compassHeading = heading;
    mapState.compassSeen = true;
  } else {
    const delta = ((heading - mapState.compassHeading + 540) % 360) - 180;
    mapState.compassHeading =
      (mapState.compassHeading + delta * 0.12 + 360) % 360;
  }
}

const onCompassAbsolute = (event) => onDeviceOrientation(event, true);
const onCompassRelative = (event) => onDeviceOrientation(event, false);

function compassFrame() {
  if (!mapState.compass) return;
  const target = (360 - mapState.compassHeading) % 360;
  const current = mapState.rotation;
  const delta = ((target - current + 540) % 360) - 180;
  if (Math.abs(delta) > 0.05) {
    mapState.rotation = (current + delta * 0.14 + 360) % 360;
    applyMapLayerTransform();
  }
  mapState.compassTimer = requestAnimationFrame(compassFrame);
}

function startCompass() {
  if (mapState.compassListening) return;
  mapState.compassListening = true;
  mapState.compassSeen = false;
  mapState.compassAbsolute = false;
  window.addEventListener('deviceorientationabsolute', onCompassAbsolute, true);
  window.addEventListener('deviceorientation', onCompassRelative, true);
  if (mapState.compassTimer) cancelAnimationFrame(mapState.compassTimer);
  mapState.compassTimer = requestAnimationFrame(compassFrame);
}

function stopCompass() {
  mapState.compassListening = false;
  window.removeEventListener('deviceorientationabsolute', onCompassAbsolute, true);
  window.removeEventListener('deviceorientation', onCompassRelative, true);
  if (mapState.compassTimer) {
    cancelAnimationFrame(mapState.compassTimer);
    mapState.compassTimer = null;
  }
  mapState.rotation = 0;
  applyMapLayerTransform();
}

function resetCompass() {
  mapState.compass = false;
  saveCompassPreference();
  stopCompass();
}

async function toggleCompass() {
  if (!mapState.compass) {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          setStatus('РќРµС‚ РґРѕСЃС‚СѓРїР° Рє РєРѕРјРїР°СЃСѓ', 'error');
          return;
        }
      } catch (error) {
        setStatus('РќРµС‚ РґРѕСЃС‚СѓРїР° Рє РєРѕРјРїР°СЃСѓ', 'error');
        return;
      }
    }
    mapState.compass = true;
    saveCompassPreference();
    startCompass();
  } else {
    mapState.compass = false;
    saveCompassPreference();
    stopCompass();
  }
  redrawMap();
}

/** Р—РЅР°С‡РєРё РєР°СЂС‚С‹: РЅР°Р·РІР°РЅРёРµ РїРѕРґР»РѕР¶РєРё Рё РєРЅРѕРїРєРё В«СЃР»РѕРёВ» Рё В«РЅР° РІРµСЃСЊ СЌРєСЂР°РЅВ». */
function addMapChrome(box) {
  loadCompassPreference();
  const kind = currentMapKind();
  const attribution = document.createElement('span');
  attribution.className = 'map-attr';
  attribution.textContent = kind.attribution;
  box.append(attribution);

  const controls = document.createElement('div');
  controls.className = 'map-controls';
  const compassButton = mapState.fullscreen &&
    typeof DeviceOrientationEvent !== 'undefined'
    ? '<button class="icon-button' + (mapState.compass ? ' active' : '') +
      '" id="mapCompass" title="' +
      (mapState.compass ? 'Р’РµСЂРЅСѓС‚СЊ СЃРµРІРµСЂ РІРІРµСЂС…' : 'РџРѕРІРѕСЂР°С‡РёРІР°С‚СЊ РєР°СЂС‚Сѓ РїРѕ РєРѕРјРїР°СЃСѓ') +
      '"><svg class="icon"><use href="icons.svg#compass"></use></svg></button>'
    : '';
  const fullButton = mapState.cloudEntries
    ? ''
    : (mapState.fullscreen
      ? '<button class="icon-button" id="mapFull" title="РЎРІРµСЂРЅСѓС‚СЊ"><svg class="icon"><use href="icons.svg#fullscreen_exit"></use></svg></button>'
      : '<button class="icon-button" id="mapFull" title="РќР° РІРµСЃСЊ СЌРєСЂР°РЅ"><svg class="icon"><use href="icons.svg#fullscreen"></use></svg></button>');
  controls.innerHTML =
    '<button class="icon-button" id="mapLayers" title="РЎР»РѕРё"><svg class="icon"><use href="icons.svg#layers"></use></svg></button>' +
    compassButton + fullButton;
  box.append(controls);

  const compass = controls.querySelector('#mapCompass');
  if (compass) {
    compass.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleCompass();
    });
  }
  if (mapState.fullscreen && mapState.compass) startCompass();

  // РЎ РїРѕР»РЅРѕСЌРєСЂР°РЅРЅРѕР№ РєР°СЂС‚С‹ РјРѕР¶РЅРѕ СЃСЂР°Р·Сѓ РїРµСЂРµР№С‚Рё Рє GPS-РѕС‚РјРµС‚РєРµ, РµСЃР»Рё СЃРѕР±С‹С‚РёРµ
  // Р°РєС‚РёРІРЅРѕ Рё Р°РІС‚РѕСЂ СЂР°Р·СЂРµС€РёР» РїРѕРєР°Р· РїСѓРЅРєС‚РѕРІ
  const distance = (state.event && state.event.distance) || {};
  const canMarkFromMap = mapState.fullscreen && state.event &&
    box.id === 'detailMap' && state.activeId === state.event.id &&
    String(distance.markMode || '').toUpperCase() !== 'QR' &&
    distance.routeVisible !== false;
  if (canMarkFromMap) {
    const mark = document.createElement('button');
    mark.className = 'map-mark-button';
    mark.textContent = 'РћС‚РјРµС‚РёС‚СЊ';
    mark.addEventListener('click', (event) => {
      event.stopPropagation();
      const source = (state.event.entry || state.event.distance) || {};
      const block = markingPeriodBlock(source);
      if (block) {
        showPeriodWarning(block.before, block.time);
        return;
      }
      state.returnToMap = true;
      state.autoReturnUsed = false;
      clearMapReturnTimer();
      $('markReturn').classList.add('hidden');
      showTab('mark');
    });
    box.append(mark);
  }

  controls.querySelector('#mapLayers').addEventListener('click', (event) => {
    event.stopPropagation();
    mapState.kind = (mapState.kind + 1) % MAP_KINDS.length;
    saveMapKind();
    redrawMap();
  });

  const fullScreenButton = controls.querySelector('#mapFull');
  if (fullScreenButton) fullScreenButton.addEventListener('click', (event) => {
    event.stopPropagation();
    // Р Р°Р·РІРѕСЂР°С‡РёРІР°РµРј РєР°СЂС‚Сѓ СЃСЂРµРґСЃС‚РІР°РјРё СЃС‚СЂР°РЅРёС†С‹: СЃРёСЃС‚РµРјРЅС‹Р№ РїРѕР»РЅРѕСЌРєСЂР°РЅРЅС‹Р№ СЂРµР¶РёРј
    // Р±СЂР°СѓР·РµСЂР° РЅРµ РёСЃРїРѕР»СЊР·СѓРµРј, РёРЅР°С‡Рµ Chrome РїРѕРєР°Р·С‹РІР°РµС‚ СЃРІРѕСЋ РїРѕРґСЃРєР°Р·РєСѓ Рѕ РІС‹С…РѕРґРµ
    mapState.fullscreen = !mapState.fullscreen;
    if (!mapState.fullscreen) stopCompass();
    redrawMap();

    if (mapState.fullscreen) {
      // РЎРІРѕСЏ Р·Р°РїРёСЃСЊ РІ РёСЃС‚РѕСЂРёРё: СЃРёСЃС‚РµРјРЅР°СЏ В«РЅР°Р·Р°РґВ» СЃРЅР°С‡Р°Р»Р° СЃРІРµСЂРЅС‘С‚ РєР°СЂС‚Сѓ
      history.pushState({ fullscreen: true }, '');
    } else if (history.state && history.state.fullscreen) {
      // Р’С‹С€Р»Рё РєРЅРѕРїРєРѕР№: СѓР±РёСЂР°РµРј Р»РёС€РЅСЋСЋ Р·Р°РїРёСЃСЊ, РЅРµ РјРµРЅСЏСЏ СЌРєСЂР°РЅ
      ignoreNextPop = true;
      history.back();
    }
  });
}

/** РџРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚ С‚Сѓ РєР°СЂС‚Сѓ, С‡С‚Рѕ СЃРµР№С‡Р°СЃ РЅР° СЌРєСЂР°РЅРµ: РґРёСЃС‚Р°РЅС†РёРё РёР»Рё РіСЂСѓРїРїС‹. */
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

/** РњРёСЂРѕРІС‹Рµ РїРёРєСЃРµР»Рё РњРµСЂРєР°С‚РѕСЂР° РґР»СЏ С€РёСЂРѕС‚С‹ Рё РґРѕР»РіРѕС‚С‹ РЅР° Р·Р°РґР°РЅРЅРѕРј РјР°СЃС€С‚Р°Р±Рµ. */
function mercatorPx(latitude, longitude, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const latRad = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * size,
  };
}

/** РћР±СЂР°С‚РЅС‹Р№ РїРµСЂРµРІРѕРґ: РјРёСЂРѕРІС‹Рµ РїРёРєСЃРµР»Рё в†’ С€РёСЂРѕС‚Р° Рё РґРѕР»РіРѕС‚Р°. */
function mercatorLatLon(x, y, zoom) {
  const size = 256 * Math.pow(2, zoom);
  const longitude = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

/**
 * Р–РµСЃС‚С‹ РєР°СЂС‚С‹: РІРѕ РІСЂРµРјСЏ РєР°СЃР°РЅРёСЏ СЃР»РѕР№ РєР°СЂС‚С‹ РґРІРёРіР°РµС‚СЃСЏ transform-РѕРј вЂ” РїР»Р°РІРЅРѕ,
 * Р±РµР· РїРµСЂРµСЂРёСЃРѕРІРєРё; РЅР° РѕС‚РїСѓСЃРєР°РЅРёРё РјР°СЃС€С‚Р°Р± Рё С†РµРЅС‚СЂ РїРµСЂРµСЃС‡РёС‚С‹РІР°СЋС‚СЃСЏ Рё РєР°СЂС‚Р°
 * РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚СЃСЏ С‡С‘С‚РєРѕ.
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
    mapState.layerScale = scale;
    mapState.layerTx = tx;
    mapState.layerTy = ty;
    node.style.transform =
      `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${mapState.rotation}deg)`;
  };

  box.addEventListener('pointerdown', (event) => {
    if (event.cancelable) event.preventDefault();
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
    if (event.cancelable) event.preventDefault();
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!startMiddle) return;

    if (pointers.size >= 2 && startDistance > 0) {
      lastScale = Math.min(32, Math.max(0.2, distance() / startDistance));
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

    // Р—РЅР°С‡РµРЅРёСЏ Р±РµСЂС‘Рј РёР· РїРѕСЃР»РµРґРЅРµРіРѕ РґРІРёР¶РµРЅРёСЏ: РїРѕСЃР»Рµ РѕС‚РїСѓСЃРєР°РЅРёСЏ РїР°Р»СЊС†РµРІ
    // СЂР°СЃСЃС‚РѕСЏРЅРёРµ РјРµР¶РґСѓ РЅРёРјРё СѓР¶Рµ РЅРµ РёР·РјРµСЂРёС‚СЊ
    const scale = lastScale;
    const tx = startDistance > 0
      ? (lastMiddle ? lastMiddle.x - startMiddle.x : 0)
      : (lastPoint ? lastPoint.x - startPoint.x : 0);
    const ty = startDistance > 0
      ? (lastMiddle ? lastMiddle.y - startMiddle.y : 0)
      : (lastPoint ? lastPoint.y - startPoint.y : 0);

    if (startDistance > 0) {
      // Р©РёРїРѕРє: РјР°СЃС€С‚Р°Р± РјРµРЅСЏРµС‚СЃСЏ РЅР° С†РµР»С‹Рµ СѓСЂРѕРІРЅРё, С†РµРЅС‚СЂ РґРµСЂР¶РёРј РїРѕРґ РїР°Р»СЊС†Р°РјРё
      const nextZoom = Math.min(19, Math.max(3, Math.round(startZoom + Math.log2(scale))));
      const ratio = Math.pow(2, nextZoom - startZoom);
      mapState.zoom = nextZoom;
      mapState.center = mercatorLatLon(
        startCenterPx.x * ratio - tx,
        startCenterPx.y * ratio - ty,
        nextZoom
      );
    } else if (tx || ty) {
      // РџРµСЂРµС‚Р°СЃРєРёРІР°РЅРёРµ: СЃРґРІРёРі РІ РїРёРєСЃРµР»СЏС… РїРµСЂРµРІРѕРґРёРј РІ РєРѕРѕСЂРґРёРЅР°С‚С‹
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
 * РџРѕРґРїРёСЃСЊ РїСѓРЅРєС‚Р° РЅР° РєР°СЂС‚Рµ, РєР°Рє checkPointOrderLabel РІ РїСЂРёР»РѕР¶РµРЅРёРё:
 * В«1 - 31В» вЂ” РЅРѕРјРµСЂ РїРѕ РїРѕСЂСЏРґРєСѓ, РґРµС„РёСЃ, РєРѕРґ РґРІСѓРјСЏ Р·РЅР°РєР°РјРё; Сѓ СЂРѕРіРµР№РЅР° вЂ” РєРѕРґ.
 */
function mapLabelOf(point, order) {
  const code = String(codeOf(point));

  // РќРѕРјРµСЂ РїРѕ РїРѕСЂСЏРґРєСѓ РїРѕР»СѓС‡Р°СЋС‚ С‚РѕР»СЊРєРѕ РєРѕРЅС‚СЂРѕР»СЊРЅС‹Рµ РїСѓРЅРєС‚С‹ (31вЂ¦99), РєР°Рє
  // routeOrderNumbers: Сѓ СЃС‚Р°СЂС‚Р°, С„РёРЅРёС€Р° Рё СЃР»СѓР¶РµР±РЅС‹С… РєРѕРґРѕРІ РїРѕРґРїРёСЃРё РЅРµС‚
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

  // Р РѕРіРµР№РЅ: РїРѕРґРїРёСЃСЊ вЂ” СЃР°Рј РєРѕРґ, СЃС‚Р°СЂС‚ Рё С„РёРЅРёС€ Р±РµР· РїРѕРґРїРёСЃРё
  const start = isStart(code, true);
  const finish = isFinish(code, true);
  return start || finish ? null : code;
}

function drawMap(box) {
  mapState.box = box;
  if (!mapState.fullscreen) mapState.rotation = 0;
  const points = mapState.points;
  const kind = currentMapKind();

  const width = box.clientWidth || 360;
  const height = box.clientHeight || 260;

  // РџРѕРґР±РѕСЂ РјР°СЃС€С‚Р°Р±Р° РїРѕ РіСЂР°РЅРёС†Р°Рј: РєР°СЂС‚Р° РїРѕРєР°Р·С‹РІР°РµС‚ РІРµСЃСЊ РјР°СЂС€СЂСѓС‚ С†РµР»РёРєРѕРј
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
    const padding = mapState.cloudEntries ? 120 : 60;
    const fits = Math.abs(bottomRight.px - topLeft.px) <= width - padding
      && Math.abs(bottomRight.py - topLeft.py) <= height - padding;
    zoom = candidate;
    if (fits) break;
  }

  // РњР°СЃС€С‚Р°Р± Рё С†РµРЅС‚СЂ: РµСЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СѓР¶Рµ РґРІРёРіР°Р» РєР°СЂС‚Сѓ вЂ” Р±РµСЂС‘Рј РµРіРѕ Р·РЅР°С‡РµРЅРёСЏ,
  // РёРЅР°С‡Рµ РїРѕРґР±РёСЂР°РµРј РїРѕ РіСЂР°РЅРёС†Р°Рј Рё Р·Р°РїРѕРјРёРЅР°РµРј
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

  // Р’СЃС‘ СЃРѕРґРµСЂР¶РёРјРѕРµ РєР°СЂС‚С‹ Р¶РёРІС‘С‚ РІ РѕРґРЅРѕРј СЃР»РѕРµ: РІРѕ РІСЂРµРјСЏ Р¶РµСЃС‚Р° РµРіРѕ РґРІРёРіР°РµРј
  // transform-РѕРј (РїР»Р°РІРЅРѕ), Р° РїРѕСЃР»Рµ Р¶РµСЃС‚Р° РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј С‡С‘С‚РєРѕ
  const layer = document.createElement('div');
  layer.className = 'map-layer';
  box.append(layer);
  mapState.layerScale = 1;
  mapState.layerTx = 0;
  mapState.layerTy = 0;
  applyMapLayerTransform();

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

  // Р›РёРЅРёСЏ РјР°СЂС€СЂСѓС‚Р°: РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё вЂ” РєСЂР°СЃРЅР°СЏ, РїРѕ РїРѕСЂСЏРґРєСѓ РїСѓРЅРєС‚РѕРІ
  const current = state.event || {};
  const order = mapState.routeCodes || (current.distance && current.distance.order) || [];
  const routeVisible = mapState.showRoute
    && !(current.distance && current.distance.routeVisible === false);
  // Р›РёРЅРёСЏ РјР°СЂС€СЂСѓС‚Р°: РєСЂР°СЃРЅР°СЏ, 1.6, РєСЂСѓРіР»С‹Рµ РєРѕРЅС†С‹, РєР°Р¶РґС‹Р№ РѕС‚СЂРµР·РѕРє СѓРєРѕСЂРѕС‡РµРЅ
  // РЅР° СЂР°РґРёСѓСЃ Р·РЅР°С‡РєР° (14) СЃ РѕР±РµРёС… СЃС‚РѕСЂРѕРЅ вЂ” РєР°Рє RouteLineOverlay
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

  if (mapState.cloudEntries) {
    const pins = [];
    points.forEach((point) => {
      const unit = mapState.cloudEntries.get(String(codeOf(point)));
      if (!unit) return;
      const { x, y } = positionOf(point);
      const near = pins.find((pin) => Math.hypot(pin.x - x, pin.y - y) <= 48);
      if (near) {
        near.units.push(unit);
        near.x = (near.x * (near.units.length - 1) + x) / near.units.length;
        near.y = (near.y * (near.units.length - 1) + y) / near.units.length;
      } else {
        pins.push({ x, y, units: [unit] });
      }
    });
    pins.forEach((group) => {
      const pin = document.createElement('button');
      pin.className = 'cloud-map-pin' + (group.units.length > 1 ? ' cluster' : ' single');
      pin.style.left = `${group.x}px`;
      pin.style.top = `${group.y}px`;
      pin.title = group.units.length === 1
        ? (group.units[0][0].name || 'РЎРѕР±С‹С‚РёРµ')
        : `РЎРѕР±С‹С‚РёР№: ${group.units.length}`;
      if (group.units.length > 1) {
        const number = document.createElement('span');
        number.textContent = String(group.units.length);
        pin.append(number);
      }
      pin.addEventListener('click', (event) => {
        event.stopPropagation();
        selectCloudMapGroup(group.units);
      });
      layer.append(pin);
    });
    return;
  }

  points.forEach((point) => {
    const { x, y } = positionOf(point);
    const code = String(codeOf(point));
    const start = isStart(code, rogaineMode());
    const finish = isFinish(code, rogaineMode());
    const radius = 14;

    if (start) {
      // Р’РµСЂС€РёРЅР° СЃРјРѕС‚СЂРёС‚ РЅР° РїРµСЂРІС‹Р№ РїСѓРЅРєС‚ РјР°СЂС€СЂСѓС‚Р°, РµСЃР»Рё РЅР°РїСЂР°РІР»РµРЅРёРµ РёР·РІРµСЃС‚РЅРѕ
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
    if (point.dashed) circle.setAttribute('stroke-dasharray', '6 4');
    svg.append(circle);

    const markerLabel = mapState.labels
      ? mapState.labels.get(String(code))
      : mapLabelOf(point, order);
    if (!markerLabel) return;

    // РќРѕРјРµСЂ СЃРїСЂР°РІР° РѕС‚ РѕРєСЂСѓР¶РЅРѕСЃС‚Рё: Р±РµР»Р°СЏ РѕР±РІРѕРґРєР°, С‡С‚РѕР±С‹ С‡РёС‚Р°Р»СЃСЏ РЅР° РєР°СЂС‚Рµ
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
    // РџСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј РјРѕР¶РµС‚ Р·Р°РїСЂРµС‚РёС‚СЊ Р·Р°РїРёСЃСЊ
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

/** Р’СЂРµРјСЏ РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: С‡С‡:РјРј:СЃСЃ РёР»Рё РјРј:СЃСЃ. */
function formatDuration(millis) {
  if (!Number.isFinite(millis) || millis <= 0) return 'вЂ”';
  const total = Math.ceil(millis / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Р’СЂРµРјСЏ РІ СЃРїР»РёС‚Р°С…: РЅРѕР»СЊ РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РєР°Рє 0:00, РґР°Р»СЊС€Рµ РєР°Рє РІ Android. */
function formatSplitTime(millis) {
  const value = Number.isFinite(millis) ? Math.max(0, millis) : 0;
  return value > 0 ? formatDuration(value) : '0:00';
}

function formatClock(millis) {
  if (!Number.isFinite(millis) || millis <= 0) return 'вЂ”';
  return new Date(Math.ceil(millis / 1000) * 1000).toLocaleTimeString('ru-RU');
}

/** РЎРєРѕР»СЊРєРѕ СЃС‚СЂРѕРє РїСЂРѕС‚РѕРєРѕР»Р° РІРёРґРЅРѕ Р±РµР· В«РџРѕРєР°Р·Р°С‚СЊ РІСЃРµС…В». */
const PROTOCOL_PREVIEW_ROWS = 10;

/**
 * РЎС‚Р°С‚СѓСЃ СЂРµР·СѓР»СЊС‚Р°С‚Р° вЂ” С‚Рµ Р¶Рµ РїСЂР°РІРёР»Р°, С‡С‚Рѕ РІ РїСЂРёР»РѕР¶РµРЅРёРё:
 * DNS вЂ” РЅРµ Р±С‹Р»Рѕ СЃС‚Р°СЂС‚Р°, DNF вЂ” РЅРµС‚ С„РёРЅРёС€Р°, DSQ вЂ” РѕС‚РјРµС‚РєРё РЅРµ РїРѕ РјР°СЂС€СЂСѓС‚Сѓ,
 * РёРЅР°С‡Рµ В«С„РёРЅРёС€В».
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

/** Р‘Р°Р»Р»С‹ СЂРѕРіРµР№РЅР°: РѕС‡РєРё РїСѓРЅРєС‚РѕРІ Р±РµР· РїРѕРІС‚РѕСЂРѕРІ, СЃС‚Р°СЂС‚ Рё С„РёРЅРёС€ РЅРµ СЃС‡РёС‚Р°СЋС‚СЃСЏ. */
/** Р‘Р°Р»Р» РљРџ СЂРѕРіРµР№РЅР°: score РёР· РѕР±Р»Р°РєР° РёР»Рё РїРµСЂРІР°СЏ С†РёС„СЂР° РєРѕРґР°. */
function rogainePointScore(point) {
  const direct = Number(point && point.score);
  if (Number.isFinite(direct)) return direct;
  const code = String((point && point.code) || '');
  return /^[1-9]/.test(code) ? Number(code[0]) : null;
}

function formatRogainePoints(score) {
  return `(+${Number(score)})`;
}

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

/** РЁС‚СЂР°С„ СЂРѕРіРµР№РЅР°: РЅРµРїРѕР»РЅР°СЏ РјРёРЅСѓС‚Р° СЃС‡РёС‚Р°РµС‚СЃСЏ С†РµР»РѕР№, СЂРѕРІРЅРѕ РІ СЃСЂРѕРє вЂ” РЅРѕР»СЊ. */
function rogainePenaltyOf(finishTime, startTime, controlMinutes, penaltyPerMinute) {
  const limit = startTime + (controlMinutes || 0) * 60000;
  const late = finishTime - limit;
  if (late <= 0) return { minutes: 0, points: 0 };
  const minutes = Math.ceil(late / 60000);
  return { minutes, points: minutes * (penaltyPerMinute || 0) };
}

/**
 * РџСЂРѕС‚РѕРєРѕР» РёР· СЃРєР°С‡Р°РЅРЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё вЂ” РїРѕ РїСЂР°РІРёР»Р°Рј РїСЂРёР»РѕР¶РµРЅРёСЏ:
 * СЃРЅР°С‡Р°Р»Р° С„РёРЅРёС€РёСЂРѕРІР°РІС€РёРµ, РјРµСЃС‚Р° СЃ РїСЂРѕРїСѓСЃРєРѕРј РїСЂРё СЂР°РІРµРЅСЃС‚РІРµ, Сѓ СЂРѕРіРµР№РЅР°
 * СЃРѕСЂС‚РёСЂРѕРІРєР° РїРѕ Р±Р°Р»Р»Р°Рј Рё Р·Р°С‚РµРј РїРѕ РІСЂРµРјРµРЅРё.
 */
function buildProtocol(distance) {
  const allResults = Array.isArray(distance.results) ? distance.results : [];
  // РџСЂР°РІРёР»Рѕ СЃРѕР±С‹С‚РёСЏ РїСЂРёРјРµРЅСЏРµС‚ РЈРЎРўР РћР™РЎРўР’Рћ: СЃРµСЂРІРµСЂ С…СЂР°РЅРёС‚ РІСЃРµ РїРѕРїС‹С‚РєРё
  const policy = String(distance.resubmit || 'update');
  const version = (row) => Number(row && row.updatedAt) || Number(row && row.finishTime) || 0;
  // В«РћСЃС‚Р°РІР»СЏС‚СЊ РѕР±Р°В» вЂ” РІСЃРµ СЃС‚СЂРѕРєРё СѓС‡Р°СЃС‚РЅРёРєР°; РёРЅР°С‡Рµ РѕРґРЅСѓ РІС‹Р±РёСЂР°РµС‚ РїСЂР°РІРёР»Рѕ
  const byUser = new Map();
  if (policy !== 'both') {
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
  const results = policy === 'both'
    ? allResults.filter((row) => row && row.userId)
    : Array.from(byUser.values());
  const rogaine = rogaineMode();
  // РЈС‡Р°СЃС‚РЅРёРє СЃ РЅРµСЃРєРѕР»СЊРєРёРјРё СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё РІС‹РґРµР»СЏРµС‚СЃСЏ Р¶С‘Р»С‚С‹Рј РІРµСЃСЊ
  const countByUser = new Map();
  results.forEach((row) => {
    const key = String(row.userId);
    countByUser.set(key, (countByUser.get(key) || 0) + 1);
  });

  const rows = results.map((row) => {
    // Округляем каждую отметку один раз; все дальнейшие времена — разности.
    const allMarks = (Array.isArray(row.marks) ? row.marks : []).map((mark) => ({
      ...mark,
      time: Math.ceil((mark.time || 0) / 1000) * 1000,
    }));
    // Р’ РїСЂРѕС‚РѕРєРѕР» РёРґСѓС‚ С‚РѕР»СЊРєРѕ РѕС‚РјРµС‚РєРё РјРµР¶РґСѓ РїРѕСЃР»РµРґРЅРёРј СЃС‚Р°СЂС‚РѕРј Рё РїРµСЂРІС‹Рј С„РёРЅРёС€РµРј
    const counted = attemptMarks(allMarks, rogaine);
    // Р’ СЂРѕРіРµР№РЅРµ СЃРїР»РёС‚ РїРѕРєР°Р·С‹РІР°РµС‚ РІСЃРµ РѕС‚РјРµС‚РєРё, Р° РѕС‡РєРё СЃС‡РёС‚Р°СЋС‚СЃСЏ РїРѕ Р·Р°С‡С‘С‚РЅС‹Рј
    const marks = rogaine ? allMarks : counted;
    const status = rogaine
      ? (!row.startTime ? 'DNS' : row.finishTime ? 'OK' : 'DNF')
      : resultStatusOf({ ...row, marks }, distance);
    const elapsed = row.startTime && row.finishTime
      ? Math.max(0, Math.ceil(row.finishTime / 1000) * 1000 - Math.ceil(row.startTime / 1000) * 1000)
      : 0;
    const score = rogaine ? rogainePoints(counted) : 0;
    const penalty = rogaine && row.finishTime && row.startTime
      ? rogainePenaltyOf(row.finishTime, row.startTime, distance.controlTimeMinutes, distance.penaltyPerMinute)
      : { minutes: 0, points: 0 };

    return {
      userId: row.userId || '',
      nick: row.nick || row.userId || 'РЈС‡Р°СЃС‚РЅРёРє',
      // Р–С‘Р»С‚С‹Рј РІС‹РґРµР»СЏСЋС‚СЃСЏ РІСЃРµ СЃС‚СЂРѕРєРё СѓС‡Р°СЃС‚РЅРёРєР° СЃ РЅРµСЃРєРѕР»СЊРєРёРјРё СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё
      duplicate: (countByUser.get(String(row.userId)) || 0) > 1,
      startTime: Math.ceil((row.startTime || 0) / 1000) * 1000,
      finishTime: Math.ceil((row.finishTime || 0) / 1000) * 1000,
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

  // РњРµСЃС‚Рѕ вЂ” РїРѕР·РёС†РёСЏ РІ РїСЂРѕС‚РѕРєРѕР»Рµ; РїСЂРё СЂР°РІРµРЅСЃС‚РІРµ РјРµСЃС‚Рѕ РїРѕРІС‚РѕСЂСЏРµС‚СЃСЏ, СЃР»РµРґСѓСЋС‰РµРµ
  // РёРґС‘С‚ СЃ РїСЂРѕРїСѓСЃРєРѕРј (1, 2, 2, 5)
  let lastKey = null;
  let lastPlace = 0;
  let best = null;
  ordered.forEach((row, index) => {
    if (row.status !== 'OK') return;
    // РњРµСЃС‚Рѕ вЂ” РїРѕ РІСЂРµРјРµРЅРё, РєРѕС‚РѕСЂРѕРµ РІРёРґРёС‚ СѓС‡Р°СЃС‚РЅРёРє: РґРѕР»Рё СЃРµРєСѓРЅРґС‹ РѕС‚Р±СЂР°СЃС‹РІР°СЋС‚СЃСЏ
    const elapsedKey = Math.ceil(row.elapsed / 1000);
    const key = rogaine ? `${row.total}/${elapsedKey}` : String(elapsedKey);
    if (key === lastKey) {
      row.place = lastPlace;
    } else {
      row.place = index + 1;
      lastPlace = row.place;
      lastKey = key;
    }
    if (best === null) best = row;
    row.behind = rogaine
      ? Math.max(0, best.total - row.total)
      : Math.max(0, Math.ceil(row.elapsed / 1000) * 1000 - Math.ceil(best.elapsed / 1000) * 1000);
  });

  return ordered;
}

/**
 * РЎРІРѕСЏ СЃС‚СЂРѕРєР° РґР»СЏ РєР°СЂС‚РѕС‡РєРё СЃРѕР±С‹С‚РёСЏ.
 *
 * В«РџРµСЂРІС‹Р№В»/В«РѕР±РЅРѕРІР»СЏС‚СЊВ» вЂ” СЃС‚СЂРѕРєР° С‚Р° Р¶Рµ, С‡С‚Рѕ РІ РїСЂРѕС‚РѕРєРѕР»Рµ. В«РћР±Р°В» вЂ” Р»СѓС‡С€Р°СЏ:
 * РјРµРЅСЊС€Рµ РјРµСЃС‚Рѕ, РїСЂРё СЂР°РІРµРЅСЃС‚РІРµ Р±РѕР»СЊС€Рµ Р±Р°Р»Р»РѕРІ; Р±РµР· РјРµСЃС‚Р° вЂ” Р±РѕР»СЊС€Рµ РѕС‚РјРµС‚РѕРє.
 */
function bestOwnProtocolRow(rows, userId, distance) {
  const own = (rows || []).filter((row) => String(row.userId) === String(userId));
  if (!own.length) return null;
  const policy = String((distance && distance.resubmit) || 'update');
  if (policy !== 'both') return own[0];
  const rogaine = rogaineMode();
  const markCount = (row) => (row.marks || []).filter(
    (mark) => !isStart(mark.code, rogaine) && !isFinish(mark.code, rogaine)
  ).length;
  const placed = own.filter((row) => row.place);
  if (placed.length) {
    placed.sort((left, right) => {
      if (left.place !== right.place) return left.place - right.place;
      return rogaine ? right.total - left.total : markCount(right) - markCount(left);
    });
    return placed[0];
  }
  return own.slice().sort((left, right) => markCount(right) - markCount(left))[0];
}

let protocolExpanded = false;

/** РџСЂРѕС‚РѕРєРѕР»: Р·Р°РіРѕР»РѕРІРѕРє, С‡РёСЃР»Рѕ СѓС‡Р°СЃС‚РЅРёРєРѕРІ, РєРѕР»РѕРЅРєРё Рё СЃС‚СЂРѕРєРё. */
function renderProtocol(distance) {
  const rows = buildProtocol(distance);
  const rogaine = rogaineMode();

  $('detailProtocol').classList.remove('hidden');
  $('protoEmpty').classList.toggle('hidden', rows.length > 0);
  $('protoCount').textContent = `РЈС‡Р°СЃС‚РЅРёРєРѕРІ: ${participantCount(rows)}`;
  // РџРѕСЏСЃРЅРµРЅРёРµ РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ РєРѕРіРґР° РµСЃС‚СЊ СѓС‡Р°СЃС‚РЅРёРєРё СЃ РЅРµСЃРєРѕР»СЊРєРёРјРё СЃС‚СЂРѕРєР°РјРё
  $('protoLegend').classList.toggle('hidden', !rows.some((row) => row.duplicate));

  const list = $('protoList');
  list.textContent = '';

  if (rows.length) {
    const head = document.createElement('div');
    head.className = 'proto-row head' + (rogaine ? ' rogaine' : '');
    head.innerHTML = rogaine
      ? '<span class="proto-nick">РќРёРє</span>' +
        '<span class="proto-time">Р’СЂРµРјСЏ (СЂРµР·СѓР»СЊС‚Р°С‚)</span>' +
        '<span class="proto-score">Р‘Р°Р»Р»С‹</span>' +
        '<span class="proto-place">РњРµСЃС‚Рѕ</span>'
      : '<span class="proto-place">РњРµСЃС‚Рѕ</span>' +
        '<span class="proto-nick">РќРёРє</span>' +
        '<span class="proto-result">Р РµР·СѓР»СЊС‚Р°С‚</span>' +
        '<span class="proto-behind">РћС‚СЃС‚.</span>';
    list.append(head);

    const shown = protocolExpanded ? rows : rows.slice(0, PROTOCOL_PREVIEW_ROWS);
    shown.forEach((row) => list.append(rogaine ? protocolRowRogaine(row) : protocolRow(row, false)));
  }

  const more = $('protoMore');
  more.classList.toggle('hidden', rows.length <= PROTOCOL_PREVIEW_ROWS);
  more.textContent = protocolExpanded ? 'РЎРІРµСЂРЅСѓС‚СЊ' : `РџРѕРєР°Р·Р°С‚СЊ РІСЃРµС… (${rows.length})`;
}

/**
 * РЎС‚СЂРѕРєР° РїСЂРѕС‚РѕРєРѕР»Р° СЂРѕРіРµР№РЅР°: РЅРёРє, РІСЂРµРјСЏ РѕС‚ СЃС‚Р°СЂС‚Р° РґРѕ С„РёРЅРёС€Р°, Р±Р°Р»Р»С‹ РїРѕСЃР»Рµ
 * С€С‚СЂР°С„Р° Рё РјРµСЃС‚Рѕ. РЈ DNF РІСЂРµРјРµРЅРё РЅРµС‚ вЂ” РїСЂРѕС‡РµСЂРє, РІРјРµСЃС‚Рѕ РјРµСЃС‚Р° вЂ” СЃС‚Р°С‚СѓСЃ.
 */
function protocolRowRogaine(row) {
  const item = document.createElement('button');
  item.className = 'proto-row rogaine' + (row.duplicate ? ' duplicate' : '');

  const nick = document.createElement('span');
  nick.className = 'proto-nick';
  nick.textContent = row.nick;

  const time = document.createElement('span');
  time.className = 'proto-time';
  time.textContent = row.status === 'OK' ? formatDuration(row.elapsed) : 'вЂ”';

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

/** РЎС‚СЂРѕРєР° РїСЂРѕС‚РѕРєРѕР»Р°: РјРµСЃС‚Рѕ (РёР»Рё СЃС‚Р°С‚СѓСЃ), РЅРёРє, СЂРµР·СѓР»СЊС‚Р°С‚, РѕС‚СЃС‚Р°РІР°РЅРёРµ. */
function protocolRow(row, rogaine) {
  const item = document.createElement('button');
  item.className = 'proto-row' + (row.duplicate ? ' duplicate' : '');

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
    : 'вЂ”';

  const behind = document.createElement('span');
  behind.className = 'proto-behind';
  if (row.status !== 'OK') {
    behind.textContent = '';
  } else if (rogaine) {
    behind.textContent = row.penalty ? `в€’${row.penalty}` : '0';
  } else {
    behind.textContent = row.behind ? '+' + formatDuration(row.behind) : 'вЂ”';
  }

  item.append(place, nick, result, behind);
  item.addEventListener('click', () => openParticipant(row, rogaine));
  return item;
}

/**
 * Р­РєСЂР°РЅ В«РЎРїР»РёС‚ СѓС‡Р°СЃС‚РЅРёРєР°В» вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё.
 *
 * РЎРІРµСЂС…Сѓ СЃРІРѕРґРєР° (РґРёСЃС‚Р°РЅС†РёСЏ, РЅРёРє, РІСЂРµРјСЏ СЃС‚Р°СЂС‚Р° Рё С„РёРЅРёС€Р°, СЂРµР·СѓР»СЊС‚Р°С‚, РјРµСЃС‚Рѕ),
 * РЅРёР¶Рµ С‚Р°Р±Р»РёС†Р° В«в„– Рї/Рї | Р’СЂРµРјСЏ РѕС‚РјРµС‚РєРё (РЅРѕРјРµСЂ РљРџ)В»: Сѓ РїСѓРЅРєС‚Р° РЅРѕРјРµСЂ РїРѕ РїРѕСЂСЏРґРєСѓ,
 * РІСЂРµРјСЏ СЌС‚Р°РїР° Рё РЅР°РєРѕРїР»РµРЅРЅРѕРµ РІСЂРµРјСЏ. РЎС‚Р°СЂС‚ Рё С„РёРЅРёС€ вЂ” Р±РµР· РЅРѕРјРµСЂР°.
 */
/** РўРµРјРї РЅР° РєРёР»РѕРјРµС‚СЂ: В«5:42/РєРјВ». */
function formatPace(msPerKm) {
  const total = Math.max(0, Math.floor(msPerKm / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}/РєРј`;
}

function formatDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters)} Рј`
    : `${(meters / 1000).toFixed(2).replace('.', ',')} РєРј`;
}

/** РћР±С‰РµРµ СЂР°СЃСЃС‚РѕСЏРЅРёРµ РїРѕ РїСЂСЏРјРѕР№ Рё СЃСЂРµРґРЅСЏСЏ СЃРєРѕСЂРѕСЃС‚СЊ Р·Р° РїСЂРѕС…РѕР¶РґРµРЅРёРµ. */
function courseStatsWeb(points, startTime, finishTime) {
  const located = (points || []).filter(Boolean);
  if (located.length < 2) return null;
  let meters = 0;
  for (let index = 1; index < located.length; index += 1) {
    const previous = located[index - 1];
    const current = located[index];
    if (previous.latitude == null || previous.longitude == null
      || current.latitude == null || current.longitude == null) continue;
    meters += distanceMeters(previous.latitude, previous.longitude, current.latitude, current.longitude);
  }
  const average = startTime && finishTime && finishTime > startTime && meters > 0
    ? formatPace(((finishTime - startTime) * 1000) / meters)
    : null;
  return { meters, average };
}

/**
 * Р›СѓС‡С€РёРµ РЅР° РѕС‚СЂРµР·РєР°С… вЂ” РїРѕ РІСЃРµРј СЃС‚СЂРѕРєР°Рј РїСЂРѕС‚РѕРєРѕР»Р°, РіРґРµ РѕС‚СЂРµР·РѕРє РїСЂРѕР№РґРµРЅ.
 * DNF СѓС‡Р°СЃС‚РІСѓРµС‚ РЅР°СЂР°РІРЅРµ СЃ С„РёРЅРёС€РёСЂРѕРІР°РІС€РёРјРё. Р‘РµСЂСѓС‚СЃСЏ С‚РѕР»СЊРєРѕ РІРµСЂРЅС‹Рµ РѕС‚РјРµС‚РєРё
 * РїРѕ РїРѕСЂСЏРґРєСѓ РјР°СЂС€СЂСѓС‚Р°.
 */
/**
 * РћС‚РјРµС‚РєРё РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРёСЏ РґРѕ РїРѕСЃР»РµРґРЅРµР№ РїСЂР°РІРёР»СЊРЅРѕР№. DSQ Рё DNF РЅРµ РїРѕРєР°Р·С‹РІР°СЋС‚
 * С…РІРѕСЃС‚ РїРѕСЃР»Рµ РѕС€РёР±РєРё; РїСЂРё DSQ С„РёРЅРёС€ С‚РѕР¶Рµ СЃРєСЂС‹С‚.
 */
function visibleOrienteeringMarks(distance, marks, status) {
  if (status === 'OK') return marks;
  const route = (distance.order || []).map((code) => String(code));
  if (!route.length) return marks;
  const starts = startAliasCodes(distance);
  let position = -1;
  let lastAccepted = -1;
  marks.forEach((mark, index) => {
    const code = String(mark.code);
    if (starts.has(code)) {
      position = Math.max(0, route.indexOf(code));
      lastAccepted = index;
      return;
    }
    const expected = route[position + 1];
    if (expected !== undefined && expected === code) {
      position += 1;
      lastAccepted = index;
    }
  });
  if (lastAccepted < 0) return [];
  let shown = marks.slice(0, lastAccepted + 1);
  if (status === 'DSQ') shown = shown.filter((mark) => !isFinish(String(mark.code), false));
  return shown;
}

/**
 * DSQ Рё DNF: РїРѕР»РЅС‹Р№ РјР°СЂС€СЂСѓС‚ РїРѕ РїРѕР·РёС†РёСЏРј. РџСЂР°РІРёР»СЊРЅС‹Рµ РѕС‚РјРµС‚РєРё Рё С„РёРЅРёС€
 * СЃРѕС…СЂР°РЅСЏСЋС‚ РІСЂРµРјСЏ, Сѓ Р»СЋР±РѕР№ РїРѕР·РёС†РёРё Р±РµР· РѕС‚РјРµС‚РєРё вЂ” СЃРѕСЃС‚РѕСЏРЅРёРµ noMark.
 */
function fullRouteMarks(distance, marks) {
  const route = (distance.order || []).map((code) => String(code));
  const starts = startAliasCodes(distance);
  const accepted = [];
  let position = 0;
  marks.forEach((mark) => {
    if (position < route.length && route[position] === String(mark.code)) {
      accepted.push(mark);
      position += 1;
    }
  });
  const finishMark = marks.find((mark) => isFinish(String(mark.code), false));
  return route.map((code, index) => {
    const row = accepted[index];
    if (row && String(row.code) === code) return row;
    if (isFinish(code, false) && finishMark) return finishMark;
    const finish = isFinish(code, false);
    return {
      code,
      time: null,
      routeState: 'noMark',
    };
  });
}

/** РћС‚РјРµС‚РєРё СЂРѕРіРµР№РЅР° Р±РµР· РїРѕРІС‚РѕСЂРЅС‹С… РљРџ: РґР»СЏ СЃРєРѕСЂРѕСЃС‚Рё Рё РѕР±С‰РµРіРѕ СЂР°СЃСЃС‚РѕСЏРЅРёСЏ. */
function uniqueRogaineMarks(marks) {
  const seen = new Set();
  return (marks || []).filter((mark) => {
    const code = String(mark.code);
    if (!/^[1-9]/.test(code)) return true;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function orienteeringLegLeaders(distance) {
  const leaders = new Map();
  const route = (distance.order || []).map((code) => String(code));
  const starts = startAliasCodes(distance);
  if (!route.length) return leaders;

  buildProtocol(distance).forEach((row) => {
    const marks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));
    const accepted = [];
    let position = -1;
    marks.forEach((mark) => {
      const code = String(mark.code);
      if (starts.has(code)) {
        position = Math.max(0, route.indexOf(code));
        accepted.push(mark);
        return;
      }
      const expected = route[position + 1];
      if (expected !== undefined && expected === code) {
        position += 1;
        accepted.push(mark);
      }
    });
    for (let index = 1; index < accepted.length; index += 1) {
      const leg = Math.max(
        0,
        Math.ceil((accepted[index].time || 0) / 1000) * 1000
          - Math.ceil((accepted[index - 1].time || 0) / 1000) * 1000
      );
      if (leg <= 0) continue;
      const key = `${accepted[index - 1].code}>${accepted[index].code}`;
      const known = leaders.get(key);
      if (!known || leg < known.millis) {
        leaders.set(key, { nick: row.nick || row.userId || 'РЈС‡Р°СЃС‚РЅРёРє', millis: leg });
      }
    }
  });
  return leaders;
}

/** РџСЂРёРЅСЏС‚С‹Рµ РѕС‚РјРµС‚РєРё СѓС‡Р°СЃС‚РЅРёРєР° РІ РїРѕСЂСЏРґРєРµ РјР°СЂС€СЂСѓС‚Р°. */
function analysisAcceptedMarks(distance, row) {
  const route = (distance.order || []).map((code) => String(code));
  const starts = startAliasCodes(distance);
  const marks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));
  const accepted = [];
  let position = -1;
  marks.forEach((mark) => {
    const code = String(mark.code);
    if (starts.has(code)) {
      const index = route.indexOf(code);
      position = index >= 0 ? index : 0;
      accepted.push(mark);
      return;
    }
    if (route[position + 1] === code) {
      position += 1;
      accepted.push(mark);
    }
  });
  return accepted;
}

function analysisLegLabel(code, distance) {
  if (isStart(String(code), false)) return 'РЎ';
  if (isFinish(String(code), false)) return 'Р¤';
  return String(code);
}

function analysisCellClass(ratio) {
  if (ratio <= 0) return 'analysis-c0';
  return `analysis-c${Math.min(9, Math.ceil(ratio * 9))}`;
}

function renderAnalysis(distance) {
  const table = $('analysisTable');
  if (!table) return;
  table.textContent = '';
  const route = (distance.order || []).map((code) => String(code));
  const legs = route.slice(0, -1).map((code, index) => [code, route[index + 1]]);
  const protocol = buildProtocol(distance);
  const rows = protocol
    .map((row) => {
      const accepted = analysisAcceptedMarks(distance, row);
      const times = new Map();
      for (let index = 1; index < accepted.length; index += 1) {
        const previous = accepted[index - 1];
        const current = accepted[index];
        if (!previous.time || !current.time) continue;
        const key = `${previous.code}>${current.code}`;
        // РЎРµРєСѓРЅРґС‹ РѕРєСЂСѓРіР»СЏРµРј С‚Р°Рє Р¶Рµ, РєР°Рє РїСЂРё РїРѕРєР°Р·Рµ: РёРЅР°С‡Рµ В«0:04 в€’ 0:02В»
        // РјРѕР¶РµС‚ РґР°С‚СЊ В«+0:01В» РёР·-Р·Р° РјРёР»Р»РёСЃРµРєСѓРЅРґ.
        const previousTick = Math.ceil(previous.time / 1000) * 1000;
        const currentTick = Math.ceil(current.time / 1000) * 1000;
        times.set(key, Math.max(0, currentTick - previousTick));
      }
      return { row, times };
    })
    .filter((item) => item.times.size > 0);
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'analysis-empty';
    empty.textContent = 'РќРµС‚ РґР°РЅРЅС‹С… РґР»СЏ Р°РЅР°Р»РёР·Р°';
    table.append(empty);
    return;
  }
  const best = new Map();
  legs.forEach(([from, to]) => {
    const key = `${from}>${to}`;
    rows.forEach(({ times }) => {
      const value = times.get(key);
      if (value === undefined) return;
      const known = best.get(key);
      if (known === undefined || value < known) best.set(key, value);
    });
  });
  const maxGaps = new Map();
  legs.forEach(([from, to]) => {
    const key = `${from}>${to}`;
    let max = 0;
    rows.forEach(({ times }) => {
      const value = times.get(key);
      if (value === undefined) return;
      max = Math.max(max, value - (best.get(key) || value));
    });
    maxGaps.set(key, max);
  });

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const nameHead = document.createElement('th');
  nameHead.textContent = 'РЈС‡Р°СЃС‚РЅРёРє';
  nameHead.className = 'analysis-name';
  headRow.append(nameHead);
  legs.forEach(([from, to]) => {
    const th = document.createElement('th');
    th.textContent = `${analysisLegLabel(from, distance)} в†’ ${analysisLegLabel(to, distance)}`;
    headRow.append(th);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  rows.forEach(({ row, times }) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.className = 'analysis-name';
    const nick = document.createElement('div');
    nick.textContent = row.nick || 'РЈС‡Р°СЃС‚РЅРёРє';
    name.append(nick);
    if (row.status && row.status !== 'OK') {
      const status = document.createElement('small');
      status.textContent = row.status;
      status.className = 'analysis-status';
      name.append(status);
    }
    tr.append(name);
    legs.forEach(([from, to]) => {
      const key = `${from}>${to}`;
      const value = times.get(key);
      const cell = document.createElement('td');
      cell.className = 'analysis-cell';
      if (value !== undefined) {
        const bestValue = best.get(key) || value;
        const gap = Math.max(0, value - bestValue);
        const maxGap = maxGaps.get(key) || 0;
        const ratio = maxGap > 0 ? gap / maxGap : 0;
        cell.classList.add(analysisCellClass(ratio));
        const time = document.createElement('div');
        time.textContent = formatSplitTime(value);
        time.className = 'analysis-time';
        const diff = document.createElement('small');
        diff.textContent = gap === 0 ? 'Р»СѓС‡С€РёР№' : `+${formatSplitTime(gap)}`;
        diff.className = 'analysis-gap';
        cell.append(time, diff);
      }
      tr.append(cell);
    });
    body.append(tr);
  });
  table.append(body);
}

function openAnalysis() {
  const distance = (state.event && (state.event.distance || state.event.entry)) || null;
  if (!distance || rogaineMode()) {
    setStatus('РђРЅР°Р»РёР· РґРѕСЃС‚СѓРїРµРЅ С‚РѕР»СЊРєРѕ РґР»СЏ РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРёСЏ', 'error');
    return;
  }
  renderAnalysis(distance);
  showTab('analysis');
}

function openParticipant(row, rogaine, fromProtocol = true) {
  const distance = (state.event && state.event.distance) || {};
  $('participantAnalysis').classList.toggle('hidden', Boolean(rogaine) || !fromProtocol);

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

  const allMarks = (row.marks || []).slice().sort((left, right) => (left.time || 0) - (right.time || 0));
  const firstFinishMark = allMarks.find((mark) => isFinish(String(mark.code), rogaine));
  summaryRow('Р”РёСЃС‚Р°РЅС†РёСЏ', distance.name || 'вЂ”');
  summaryRow('РќРёРє', row.nick);
  // Р’ В«РњРѕРёС… РѕС‚РјРµС‚РєР°С…В» РІСЂРµРјРµРЅРё, СЂРµР·СѓР»СЊС‚Р°С‚Р°, Р±Р°Р»Р»РѕРІ Рё РјРµСЃС‚Р° РЅРµС‚: С‚Р°Рј С‚РѕР»СЊРєРѕ
  // РґРёСЃС‚Р°РЅС†РёСЏ, РЅРёРє Рё СЃРІРѕРё РѕС‚РјРµС‚РєРё, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  if (fromProtocol) {
    summaryRow('Р’СЂРµРјСЏ СЃС‚Р°СЂС‚Р°', row.startTime ? formatClock(row.startTime) : 'вЂ”');
    const finishClock = (firstFinishMark && firstFinishMark.time) || 0;
    summaryRow('Р’СЂРµРјСЏ С„РёРЅРёС€Р°', finishClock ? formatClock(finishClock) : 'вЂ”');
    summaryRow(
      'Р РµР·СѓР»СЊС‚Р°С‚',
      row.status && row.status !== 'OK'
        ? row.status
        : (row.startTime && row.finishTime ? formatDuration(row.elapsed) : 'вЂ”')
    );
    if (rogaine) {
      summaryRow('Р‘Р°Р»Р»С‹ Р±РµР· С€С‚СЂР°С„Р°', String(row.score ?? 0));
      summaryRow('РЁС‚СЂР°С„', String(row.penalty ?? 0));
      summaryRow('Р‘Р°Р»Р»С‹', String(row.total ?? 0));
    }
    if (row.place) summaryRow('РњРµСЃС‚Рѕ', String(row.place));
  }

  const list = $('participantMarks');
  list.textContent = '';
  const fullRoute = !rogaine && (row.status === 'DSQ' || row.status === 'DNF');
  const noStart = !rogaine && !row.startTime;
  const rogaineMarks = allMarks.filter((mark) =>
    !isFinish(String(mark.code), true) || mark === firstFinishMark
  );
  const marks = rogaine
    ? rogaineMarks
    : (fullRoute
      ? fullRouteMarks(distance, allMarks)
      : (noStart ? allMarks : visibleOrienteeringMarks(distance, allMarks, row.status)));
  const displayedMarks = marks.filter((mark) =>
    !isFinish(String(mark.code), rogaine) || mark === firstFinishMark
  );
  const pointByCode = new Map((distance.points || []).map((point) => [String(point.code), point]));
  const statsMarks = rogaine ? uniqueRogaineMarks(displayedMarks) : displayedMarks;
  const courseStats = courseStatsWeb(
    statsMarks.map((mark) => pointByCode.get(String(mark.code))),
    row.startTime,
    row.finishTime
  );
  const gpsMode = String(distance.markMode || '').toUpperCase() !== 'QR';
  if (courseStats && row.status === 'OK' && gpsMode) {
    summaryRow('РЎСЂРµРґРЅСЏСЏ СЃРєРѕСЂРѕСЃС‚СЊ', courseStats.average || 'вЂ”');
    if (rogaine) summaryRow('Р Р°СЃСЃС‚РѕСЏРЅРёРµ', formatDistance(courseStats.meters));
  }

  const starts = startAliasCodes(distance);
  const hasStart = Boolean(row.startTime);
  const gps = String(distance.markMode || '').toUpperCase() !== 'QR';
  const legLeaders = !rogaine && fromProtocol ? orienteeringLegLeaders(distance) : new Map();
  const route = (distance.order || []).map((code) => String(code));
  const noStartRoute = !hasStart && !rogaine;
  const noStartCheckpoints = route.filter((code) =>
    !starts.has(code) && !isFinish(code, false)
  );
  const finishPredecessor = noStartRoute
    ? (noStartCheckpoints[noStartCheckpoints.length - 1] || null)
    : (route.filter((code) => !starts.has(code) && !isFinish(code, false)).slice(-1)[0] || null);
  let noStartPosition = 0;
  let routePosition = -1;
  let number = 0;
  let previousRounded = null;
  let previousCode = null;
  let previousAcceptedCode = null;
  let previousAcceptedTime = null;
  let previousRogaineCode = null;
  let previousRogaineTime = null;
  let previousValidTime = null;
  // РџСѓРЅРєС‚С‹, РѕС‚РјРµС‡РµРЅРЅС‹Рµ С…РѕС‚СЏ Р±С‹ СЂР°Р·: РїРѕРІС‚РѕСЂ РЅРѕРјРµСЂР° РЅРµ РїРѕР»СѓС‡Р°РµС‚, Р° РїРѕРјРµС‡Р°РµС‚СЃСЏ
  // СЃР»РѕРІРѕРј В«РґСѓР±Р»СЊВ» вЂ” РєР°Рє РЅР° СЌРєСЂР°РЅРµ СЃРїР»РёС‚Р° РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const seen = new Set();

  displayedMarks.forEach((mark) => {
    const code = String(mark.code);
    const startPoint = starts.has(code);
    const finishPoint = isFinish(code, rogaine);
    const noMark = mark.routeState === 'noMark';
    // РЎС‚Р°СЂС‚ РЅСѓР¶РµРЅ С‚РѕР»СЊРєРѕ РєР°Рє РЅР°С‡Р°Р»Рѕ РѕС‚СЃС‡С‘С‚Р°; СЃС‚СЂРѕРєРѕР№ РІ СЃРїР»РёС‚Рµ РЅРµ РїРѕРєР°Р·С‹РІР°РµРј
    if (startPoint) {
      // РЎС‚Р°СЂС‚ РЅРµ РїРѕРєР°Р·С‹РІР°РµРј СЃС‚СЂРѕРєРѕР№, РЅРѕ РІ СЂР°СЃС‡С‘С‚Рµ РјР°СЂС€СЂСѓС‚Р° РѕРЅ СѓС‡Р°СЃС‚РІСѓРµС‚
      if (route.length) routePosition = Math.max(0, route.indexOf(code));
      previousValidTime = mark.time;
      previousAcceptedCode = code;
      previousAcceptedTime = mark.time;
      if (rogaine) {
        previousRogaineCode = code;
        previousRogaineTime = mark.time;
      }
      return;
    }
    // Р’РµСЂРЅР°СЏ РѕС‚РјРµС‚РєР° РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРёСЏ: С‚РѕР»СЊРєРѕ СЃР»РµРґСѓСЋС‰РёР№ РїСѓРЅРєС‚ РјР°СЂС€СЂСѓС‚Р°.
    // РќРµРІРµСЂРЅС‹Рµ РљРџ РІ СЂР°СЃС‡С‘С‚Рµ СЃРєРѕСЂРѕСЃС‚Рё Рё РѕС‚СЃС‚Р°РІР°РЅРёСЏ РЅРµ СѓС‡Р°СЃС‚РІСѓСЋС‚.
    if (!noMark && startPoint && route.length) routePosition = Math.max(0, route.indexOf(code));
    let accepted = !noMark && startPoint;
    if (!noMark && noStartRoute && !startPoint && !finishPoint) {
      // Р‘РµР· СЃС‚Р°СЂС‚Р° РїСЂР°РІРёР»СЊРЅРѕСЃС‚СЊ РљРџ СЃС‡РёС‚Р°РµРј РїРѕ РїРѕСЂСЏРґРєСѓ РјР°СЂС€СЂСѓС‚Р°: РїРµСЂРІР°СЏ
      // РѕС‚РјРµС‚РєР° Р·Р°РґР°С‘С‚ РЅР°С‡Р°Р»Рѕ, РґР°Р»СЊС€Рµ вЂ” С‚РѕР»СЊРєРѕ СЃР»РµРґСѓСЋС‰РёР№ РљРџ
      const expected = noStartCheckpoints[noStartPosition];
      accepted = expected !== undefined && expected === code;
      if (accepted) noStartPosition += 1;
    } else if (!noMark && !startPoint && route.length) {
      const expected = route[routePosition + 1];
      accepted = expected !== undefined && expected === code;
      if (accepted) routePosition += 1;
    }
    // Р¤РёРЅРёС€ вЂ” С‚Р°РєР°СЏ Р¶Рµ С‚РѕС‡РєР° РѕС‚СЂРµР·РєР°: СЃРєРѕСЂРѕСЃС‚СЊ Рё Р»РёРґРµСЂ СЃС‡РёС‚Р°СЋС‚СЃСЏ Рё РґР»СЏ РЅРµРіРѕ
    const acceptedCheckpoint = !rogaine && (
      finishPoint
        ? (finishPredecessor !== null && previousAcceptedCode === finishPredecessor)
        : (accepted && !startPoint)
    );
    // РџРѕРІС‚РѕСЂ РљРџ СЂРѕРіРµР№РЅР°: РІ РїСЂРѕС‚РѕРєРѕР»Рµ РѕРЅ РЅРµ РЅСѓРјРµСЂСѓРµС‚СЃСЏ, Р° СЃРєРѕСЂРѕСЃС‚СЊ Рё
    // СЂР°СЃСЃС‚РѕСЏРЅРёРµ СЃ РЅРёРј РЅРµ СЃС‡РёС‚Р°СЋС‚СЃСЏ РІ Р»СЋР±РѕРј РѕРєРЅРµ
    const rogaineCheckpoint = rogaine && !startPoint && !finishPoint && /^[1-9]/.test(code);
    const repeatMark = rogaineCheckpoint && seen.has(code);
    if (rogaineCheckpoint) seen.add(code);
    // РР· РїСЂРѕС‚РѕРєРѕР»Р° РїРѕРІС‚РѕСЂ РїРѕРјРµС‡Р°РµС‚СЃСЏ В«РґСѓР±Р»СЊВ» Рё РЅРѕРјРµСЂР° РЅРµ РїРѕР»СѓС‡Р°РµС‚; РІ В«РњРѕРёС…
    // РѕС‚РјРµС‚РєР°С…В» РЅСѓРјРµСЂСѓСЋС‚СЃСЏ РІСЃРµ РѕС‚РјРµС‚РєРё РїРѕРґСЂСЏРґ, РІРєР»СЋС‡Р°СЏ РїРѕРІС‚РѕСЂРЅС‹Рµ
    const checkpoint = fromProtocol && rogaineCheckpoint;
    const repeat = checkpoint && repeatMark;
    const rogainePoint = rogaine && !startPoint;
    const validRow = rogaine ? (rogainePoint && !repeatMark) : acceptedCheckpoint;
    const elapsed = validRow && row.startTime && mark.time
      ? Math.max(0, mark.time - row.startTime)
      : null;
    const elapsedRounded = elapsed === null
      ? null
      : Math.max(0, Math.ceil(mark.time / 1000) * 1000 - Math.ceil(row.startTime / 1000) * 1000);
    // Р­С‚Р°Рї вЂ” СЂР°Р·РЅРёС†Р° РјРµР¶РґСѓ СЃРѕСЃРµРґРЅРёРјРё РёР·РІРµСЃС‚РЅС‹РјРё РѕС‚РјРµС‚РєР°РјРё. РЎС‚Р°СЂС‚ РґР»СЏ РЅРµРіРѕ
    // РЅРµ РЅСѓР¶РµРЅ; РґСѓР±Р»Рё Рё РЅРµРІРµСЂРЅС‹Рµ РѕС‚РјРµС‚РєРё РїСЂРѕРїСѓСЃРєР°СЋС‚СЃСЏ
    const leg = !validRow || startPoint || previousValidTime === null
      ? null
      : Math.max(0, Math.ceil(mark.time / 1000) * 1000 - Math.ceil(previousValidTime / 1000) * 1000);
    const point = pointByCode.get(code);
    const acceptedLeg = acceptedCheckpoint && previousAcceptedTime !== null && mark.time
      ? Math.max(0, Math.ceil(mark.time / 1000) * 1000 - Math.ceil(previousAcceptedTime / 1000) * 1000)
      : null;
    const rogaineLeg = rogainePoint && !repeatMark && previousRogaineTime !== null && mark.time
      ? Math.max(0, Math.ceil(mark.time / 1000) * 1000 - Math.ceil(previousRogaineTime / 1000) * 1000)
      : null;
    const showSpeed = rogaine ? (rogainePoint && !repeatMark) : acceptedCheckpoint;
    const speedLeg = rogaine ? rogaineLeg : acceptedLeg;
    const speedPrevious = rogaine ? previousRogaineCode : previousAcceptedCode;
    const previousPoint = speedPrevious === null ? null : pointByCode.get(speedPrevious);
    let speed = null;
    if (gps && showSpeed && speedLeg !== null && speedLeg > 0 && point && previousPoint) {
      const meters = distanceMeters(previousPoint.latitude, previousPoint.longitude, point.latitude, point.longitude);
      if (meters > 0) speed = formatPace((speedLeg * 1000) / meters);
    }
    let best = null;
    if (!rogaine && fromProtocol && acceptedCheckpoint && previousAcceptedCode !== null && acceptedLeg !== null) {
      const leader = legLeaders.get(`${previousAcceptedCode}>${code}`);
      if (leader) best = `+${formatSplitTime(Math.max(0, acceptedLeg - leader.millis))}\n${leader.nick}`;
    }

    let label;
    if (startPoint) {
      label = '(РЎС‚Р°СЂС‚)';
    } else if (finishPoint) {
      label = 'Р¤РёРЅРёС€';
    } else {
      if (!repeat) number += 1;
      label = `(${code})`;
    }

    const item = document.createElement('div');
    item.className = 'split-row';

    const num = document.createElement('span');
    num.className = 'split-number';
    if (startPoint || finishPoint) num.textContent = '';
    else if (repeat) num.textContent = '';
    else if (noMark) num.textContent = '';
    else num.textContent = number + '.';

    const codeEl = document.createElement('span');
    codeEl.className = 'split-code';
    if (finishPoint && !noMark) {
      num.textContent = 'Р¤РёРЅРёС€';
      num.classList.add('split-finish');
      item.append(num);
    } else {
      codeEl.textContent = noMark ? `${label} РЅРµС‚ РѕС‚РјРµС‚РєРё` : label;
      item.append(num, codeEl);
    }

    const showTimes = !noMark && !repeatMark &&
      (validRow || (finishPoint && mark.time));
    if (showTimes) {
      const times = document.createElement('span');
      times.className = 'split-times';
      const stage = document.createElement('span');
      stage.className = 'split-line';
      stage.textContent = leg === null ? 'вЂ”' : formatSplitTime(leg);
      const total = document.createElement('span');
      total.className = 'split-line total';
      total.textContent = elapsedRounded === null
        ? 'вЂ”'
        : formatSplitTime(elapsedRounded);
      times.append(stage, total);
      item.append(times);
    }
    if (repeatMark) {
      const repeatTime = document.createElement('span');
      repeatTime.className = 'split-times';
      repeatTime.textContent = 'РґСѓР±Р»СЊ';
      item.append(repeatTime);
    }
    const pointScore = rogainePointScore(point);
    const pointsText = rogaine && !repeatMark && !finishPoint && pointScore !== null
      ? formatRogainePoints(pointScore)
      : null;
    if (pointsText) {
      const points = document.createElement('span');
      points.className = 'split-points';
      points.textContent = pointsText;
      item.append(points);
    }
    if (speed || best) {
      const block = document.createElement('div');
      block.className = 'split-speed';
      if (best) {
        const bestLine = document.createElement('span');
        bestLine.className = 'split-speed-best';
        bestLine.textContent = best;
        block.append(bestLine);
      }
      if (speed) {
        const speedLine = document.createElement('span');
        speedLine.className = 'split-speed-value';
        speedLine.textContent = speed;
        block.append(speedLine);
      }
      item.append(block);
    }
    list.append(item);

    if (!noMark && (startPoint || validRow)) {
      previousValidTime = mark.time;
      previousCode = code;
    }
    if (accepted) {
      previousAcceptedCode = code;
      previousAcceptedTime = mark.time;
    }
    if (rogaine && !noMark && (startPoint || (rogainePoint && !repeatMark))) {
      previousRogaineCode = code;
      previousRogaineTime = mark.time;
    }
  });

  const reasonStarts = startAliasCodes(distance);
  const routeCheckpoints = (distance.order || [])
    .map((code) => String(code))
    .filter((code) => !reasonStarts.has(code) && !isFinish(code, false));
  const markedCheckpoints = (row.marks || [])
    .map((mark) => String(mark.code))
    .filter((code) => !reasonStarts.has(code) && !isFinish(code, false));
  const orderBroken = !rogaine && routeCheckpoints.length > 0 &&
    (markedCheckpoints.length !== routeCheckpoints.length ||
      markedCheckpoints.some((code, index) => code !== routeCheckpoints[index]));
  const hasFinishMark = (row.marks || []).some(
    (mark) => isFinish(String(mark.code), rogaine)
  );
  const reasons = [];
  if (!row.startTime) reasons.push('РЅРµС‚ СЃС‚Р°СЂС‚Р°');
  if (orderBroken) reasons.push('РЅР°СЂСѓС€РµРЅ РїРѕСЂСЏРґРѕРє РїСЂРѕС…РѕР¶РґРµРЅРёСЏ РљРџ');
  if (!row.finishTime && !hasFinishMark) reasons.push('РЅРµС‚ С„РёРЅРёС€Р°');
  if (reasons.length) {
    const reason = document.createElement('div');
    reason.className = 'split-reason';
    reason.textContent = `РџСЂРёС‡РёРЅР° РѕС‚СЃСѓС‚СЃС‚РІРёСЏ СЂРµР·СѓР»СЊС‚Р°С‚Р°:\n${reasons.join('\n')}`;
    list.append(reason);
  }

  // РЎРІРѕСЏ РѕС‚РјРµС‚РєР°: СЃСѓРјРјР° Р±Р°Р»Р»РѕРІ РѕРґРЅРѕР№ СЃС‚СЂРѕРєРѕР№ РїРѕРґ С‚Р°Р±Р»РёС†РµР№, РЅРµ РІ СЃРІРѕРґРєРµ.
  // РџСЂРµР¶РЅСЋСЋ СЃС‚СЂРѕРєСѓ СѓР±РёСЂР°РµРј, РёРЅР°С‡Рµ РїСЂРё РїРѕРІС‚РѕСЂРЅРѕРј РѕС‚РєСЂС‹С‚РёРё РѕРЅРё РєРѕРїРёР»РёСЃСЊ Р±С‹
  const oldTotal = $('myMarksTotal');
  if (oldTotal) oldTotal.remove();
  if (!fromProtocol && rogaine) {
    const total = document.createElement('p');
    total.className = 'meta';
    total.id = 'myMarksTotal';
    total.textContent = `Р‘Р°Р»Р»С‹: ${row.total ?? 0}`;
    list.after(total);
  }

  // РљР°СЂС‚Р° РїРѕСЂСЏРґРєР° РїСЂРѕС…РѕР¶РґРµРЅРёСЏ вЂ” С‚РѕР»СЊРєРѕ РІ СЃРїР»РёС‚Рµ СѓС‡Р°СЃС‚РЅРёРєР° GPS-СЂРѕРіРµР№РЅР° Рё
  // С‚РѕР»СЊРєРѕ РµСЃР»Рё Р°РІС‚РѕСЂ СЂР°Р·СЂРµС€РёР» РїРѕРєР°Р· РїСѓРЅРєС‚РѕРІ. Р”СѓР±Р»Рё РІ Р»РёРЅРёСЋ РЅРµ РїРѕРїР°РґР°СЋС‚.
  const participantMap = $('participantMap');
  const participantMapTitle = $('participantMapTitle');
  const showParticipantMap = rogaine && fromProtocol && gps &&
    distance.routeVisible !== false;
  if (!showParticipantMap) {
    participantMap.classList.add('hidden');
    participantMapTitle.classList.add('hidden');
    participantMap.textContent = '';
    if (mapState.box === participantMap) mapState.box = null;
  } else {
    const seenCodes = new Set();
    const mapPoints = [];
    const routePoints = [];
    const routeCodes = [];
    const labels = new Map();
    const addMapPoint = (point, dashed) => {
      const code = String(point.code);
      mapPoints.push(Object.assign({}, point, { dashed }));
      labels.set(code, isStart(code, true) || isFinish(code, true) ? null : code);
    };

    displayedMarks.forEach((mark) => {
      const code = String(mark.code);
      if (seenCodes.has(code)) return;
      seenCodes.add(code);
      let point = pointByCode.get(code);
      // РЎС‚Р°СЂС‚ РјРѕРі РЅРµ С…СЂР°РЅРёС‚СЊСЃСЏ РѕС‚РґРµР»СЊРЅС‹Рј РїСѓРЅРєС‚РѕРј, Р° Р»РµР¶Р°С‚СЊ РІ РїРѕР»СЏС… РґРёСЃС‚Р°РЅС†РёРё
      if (!point && isStart(code, true) &&
          Number.isFinite(Number(distance.latitude)) &&
          Number.isFinite(Number(distance.longitude))) {
        point = {
          code,
          latitude: Number(distance.latitude),
          longitude: Number(distance.longitude),
          accuracyMeters: 0
        };
      }
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
      routePoints.push(point);
      routeCodes.push(code);
      addMapPoint(point, false);
    });

    // Р’СЃРµ С‚РѕС‡РєРё РґРёСЃС‚Р°РЅС†РёРё, РґР°Р¶Рµ Р±РµР· РѕС‚РјРµС‚РєРё: РѕРЅРё РІРёРґРЅС‹, РЅРѕ РІ РїСѓС‚СЊ РЅРµ РІС…РѕРґСЏС‚.
    // РќРµРѕС‚РјРµС‡РµРЅРЅС‹Рµ РљРџ СЂРёСЃСѓСЋС‚СЃСЏ РїСѓРЅРєС‚РёСЂРѕРј.
    (distance.points || []).forEach((point) => {
      const code = String(point.code);
      if (seenCodes.has(code)) return;
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
      const checkpoint = !isStart(code, true) && !isFinish(code, true);
      addMapPoint(point, checkpoint);
    });

    if (!mapPoints.length) {
      participantMap.classList.add('hidden');
      participantMapTitle.classList.add('hidden');
      participantMap.textContent = '';
      if (mapState.box === participantMap) mapState.box = null;
    } else {
      participantMapTitle.classList.remove('hidden');
      participantMap.classList.remove('hidden');
      showMapOn(participantMap, mapPoints, {
        routeCodes,
        labels,
        showRoute: true
      });
    }
  }

  showTab('participant');
}

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РѕС‚РјРµС‚РєРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/**
 * РљРѕРґС‹, РєРѕС‚РѕСЂС‹Рµ СЃС‡РёС‚Р°СЋС‚СЃСЏ СЃС‚Р°СЂС‚РѕРј.
 *
 * РЎС‚Р°СЂС‚ Рё В«РјРµСЃС‚Рѕ СЃС‚Р°СЂС‚Р°В» вЂ” РѕРґРЅР° С‚РѕС‡РєР°: РєСЂРѕРјРµ РєРѕРґР° СЃС‚Р°СЂС‚Р° СЃСЋРґР° РїРѕРїР°РґР°СЋС‚ РїСѓРЅРєС‚С‹,
 * СЃС‚РѕСЏС‰РёРµ РІ С‚РµС… Р¶Рµ РєРѕРѕСЂРґРёРЅР°С‚Р°С… (Сѓ СЃРѕР±С‹С‚РёСЏ СЃС‚Р°СЂС‚ РјРѕР¶РµС‚ Р±С‹С‚СЊ Р·Р°РїРёСЃР°РЅ РєР°Рє
 * РѕР±С‹С‡РЅС‹Р№ РїСѓРЅРєС‚, РЅР°РїСЂРёРјРµСЂ РєРѕРґРѕРј 3).
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

/** РљР°Рє РѕС‚РјРµС‡Р°СЋС‚СЃСЏ РІ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё: В«QRВ» РёР»Рё В«GPSВ» (MarkMode РІ РїСЂРёР»РѕР¶РµРЅРёРё). */
function qrMode() {
  const distance = (state.event && state.event.distance) || {};
  return String(distance.markMode || '').toUpperCase() === 'QR';
}

function rogaineMode() {
  return Boolean(state.event && state.event.kind === 'rogaine');
}

/** РџРѕРґРїРёСЃСЊ РїСѓРЅРєС‚Р° РїРѕ РїСЂР°РІРёР»Р°Рј Labels.kt: В«РЎС‚Р°СЂС‚В», В«Р¤РёРЅРёС€В» РёР»Рё РєРѕРґ. */
function labelOf(point) {
  // РџСЂРёРЅРёРјР°РµС‚ Рё РїСѓРЅРєС‚, Рё СЃР°Рј РєРѕРґ: Сѓ QR РїРѕРґРїРёСЃСЊ СЃС‚СЂРѕРёС‚СЃСЏ РїРѕ РєРѕРґСѓ РёР· С‚Р°Р±Р»РёС‡РєРё,
  // Рё Р±РµР· СЌС‚РѕРіРѕ РЅРѕРјРµСЂ РїСЂРµРІСЂР°С‰Р°Р»СЃСЏ РІ РїСѓСЃС‚СѓСЋ СЃС‚СЂРѕРєСѓ
  const code = typeof point === 'string' || typeof point === 'number'
    ? String(point)
    : codeOf(point);
  if (isStart(code, rogaineMode())) return 'РЎС‚Р°СЂС‚';
  if (isFinish(code, rogaineMode())) return 'Р¤РёРЅРёС€';
  return String(code);
}

function markedCodes() {
  return new Set(
    state.marks.filter((mark) => !mark.start && !mark.finish).map((mark) => String(mark.code))
  );
}

/** РЎРєРѕР»СЊРєРѕ РґРµСЂР¶РёС‚СЃСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РѕС‚РјРµС‚РєРё, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
const MARKED_MESSAGE_MILLIS = 3000;
/** РЎРєРѕР»СЊРєРѕ Р¶РґР°С‚СЊ СѓС‚РѕС‡РЅРµРЅРёСЏ РјРµСЃС‚Р°, РїСЂРµР¶РґРµ С‡РµРј РїСЂРµРґР»РѕР¶РёС‚СЊ Р°РІР°СЂРёР№РЅСѓСЋ РѕС‚РјРµС‚РєСѓ. */
const EMERGENCY_WAIT_MILLIS = 10000;
/** Р§РµСЂРµР· СЃРєРѕР»СЊРєРѕ РєРѕРґ СЃС‡РёС‚Р°РµС‚СЃСЏ СѓС€РµРґС€РёРј РёР· РєР°РґСЂР°. */
const CODE_GONE_MILLIS = 1000;
/** РћРєРЅРѕ, РІ РєРѕС‚РѕСЂРѕРј РёС‰РµРј Р±Р»РёР¶Р°Р№С€СѓСЋ С‚РѕС‡РєСѓ РґР»СЏ РѕС‚РјРµС‚РєРё РЅР° С…РѕРґСѓ. */
const FIX_WINDOW_MILLIS = 5000;
/** Р‘РѕР»СЊС€Рµ С‚РѕС‡РµРє РІ Р±СѓС„РµСЂРµ РЅРµ РґРµСЂР¶РёРј. */
const MAX_RECENT_FIXES = 60;

/** РЎС‚Р°СЂС‚ РёР»Рё С„РёРЅРёС€ СЌС‚РѕС‚ РєРѕРґ: РїРѕРґРїРёСЃСЊ Рё РїСЂР°РІРёР»Р° Сѓ РЅРёС… РѕСЃРѕР±С‹Рµ. */
function startOrFinishOf(code) {
  if (isStart(code, rogaineMode())) return 'start';
  if (isFinish(code, rogaineMode())) return 'finish';
  return null;
}

/** РЎРєР»РѕРЅРµРЅРёРµ С‡РёСЃР»Р°: 1 Р±Р°Р»Р», 2 Р±Р°Р»Р»Р°, 5 Р±Р°Р»Р»РѕРІ. */
function plural(count, one, few, many) {
  const value = Math.abs(Number(count) || 0) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** РўРѕС‡РєР° РІ Р·РѕРЅРµ РїСѓРЅРєС‚Р°: РґРѕРїСѓСЃРє вЂ” РїРѕРіСЂРµС€РЅРѕСЃС‚СЊ РїСѓРЅРєС‚Р° + РїРѕРіСЂРµС€РЅРѕСЃС‚СЊ РїСЂРёС‘РјРЅРёРєР° + 5 Рј. */
function inZone(point, position) {
  if (!point || !position) return false;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return false;
  const allowed = (point.accuracyMeters || 0)
    + position.accuracy * GPS_ACCURACY_FACTOR + 5;
  return distanceMeters(position.lat, position.lon, point.latitude, point.longitude) <= allowed;
}

/** РџСѓРЅРєС‚, Сѓ РєРѕС‚РѕСЂРѕРіРѕ СЃС‚РѕРёС‚ СѓС‡Р°СЃС‚РЅРёРє. loose вЂ” Р±РµР· РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїРѕРіСЂРµС€РЅРѕСЃС‚Рё. */
function findMarkPoint(loose) {
  if (!state.event || !state.position) return null;
  if (!loose && state.position.accuracy > MAX_ACCURACY_METERS) return null;
  const points = (state.event.distance && state.event.distance.points) || [];
  for (const point of points) {
    if (inZone(point, state.position)) return point;
  }
  return null;
}

/**
 * Р‘Р»РёР¶Р°Р№С€Р°СЏ Рє РїСѓРЅРєС‚Сѓ С‚РѕС‡РєР° РёР· РїРѕСЃР»РµРґРЅРёС… СЃРµРєСѓРЅРґ.
 *
 * РќСѓР¶РЅР° РґР»СЏ РѕС‚РјРµС‚РєРё РЅР° С…РѕРґСѓ: СѓС‡Р°СЃС‚РЅРёРє РјРѕРі СѓР¶Рµ РІС‹Р№С‚Рё РёР· Р·РѕРЅС‹, РїРѕРєР° РЅР°Р¶РёРјР°РµС‚.
 * Р‘РµСЂС‘Рј РёРјРµРЅРЅРѕ Р±Р»РёР¶Р°Р№С€РёР№ Р·Р°РјРµСЂ, Р° РЅРµ РїРѕСЃР»РµРґРЅРёР№, Рё С‚РѕР»СЊРєРѕ РµСЃР»Рё РѕРЅ СЃР°Рј РЅРµ РіСЂСѓР±РµРµ
 * РґРѕРїСѓСЃС‚РёРјРѕРіРѕ.
 */
function bestBufferedPoint() {
  if (!state.event || !state.position) return null;
  const now = Date.now();
  const fixes = (state.recentFixes || []).filter(
    (fix) => now - fix.at <= FIX_WINDOW_MILLIS && fix.accuracy > 0
      && fix.accuracy <= MAX_ACCURACY_METERS
  );
  if (!fixes.length) return null;
  const points = (state.event.distance && state.event.distance.points) || [];
  let best = null;
  fixes.forEach((fix) => {
    points.forEach((point) => {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
      const allowed = (point.accuracyMeters || 0)
        + fix.accuracy * GPS_ACCURACY_FACTOR + 5;
      const distance = distanceMeters(fix.lat, fix.lon, point.latitude, point.longitude);
      if (distance <= allowed && (!best || distance < best.distance)) {
        best = { point, fix, distance };
      }
    });
  });
  return best;
}

/** РџРѕРґРїРёСЃСЊ РѕС‚РјРµС‚РєРё РґРѕ Р·Р°РїРёСЃРё: РЅРѕРјРµСЂ РїСѓРЅРєС‚Р°, Р±Р°Р»Р»С‹ СЂРѕРіРµР№РЅР° Рё РґСѓР±Р»СЊ. */
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

/** РСЃС…РѕРґ РѕС‚РјРµС‚РєРё: С‚Рµ Р¶Рµ СЃР»РѕРІР°, С‡С‚Рѕ РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
function outcomeText(kind) {
  return {
    recorded: 'РћС‚РјРµС‚РєР° Р·Р°РїРёСЃР°РЅР°',
    finish: 'Р’С‹ СѓР¶Рµ С„РёРЅРёС€РёСЂРѕРІР°Р»Рё',
    start: 'Р’РЅР°С‡Р°Р»Рµ РѕС‚РјРµС‚СЊС‚Рµ СЃС‚Р°СЂС‚ РЅР° РІС‹Р±СЂР°РЅРЅРѕР№ РґРёСЃС‚Р°РЅС†РёРё',
    foreign: 'РљРѕРґ РґСЂСѓРіРѕР№ РґРёСЃС‚Р°РЅС†РёРё',
    unknown: 'Р­С‚Рѕ РЅРµ РєРѕРґ РєРѕРЅС‚СЂРѕР»СЊРЅРѕРіРѕ РїСѓРЅРєС‚Р° вЂ” РёР»Рё РЅРµ РІР°С€РµР№ РґРёСЃС‚Р°РЅС†РёРё',
    skipped: 'РљРѕРґ РїСЂРѕРїСѓС‰РµРЅ',
  }[kind] || '';
}

/** РљСЂСѓРїРЅРѕРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РѕС‚РјРµС‚РєРё: Р±Р°РЅРЅРµСЂ, РІСЃРїС‹С€РєР° СЂР°РјРєРё Рё С‚РѕР»С‡РѕРє РєРЅРѕРїРєРё. */
function showMarkConfirmation(label, time) {
  const banner = $('markBanner');
  if (!banner) return;
  $('markBannerTitle').textContent = 'РћРўРњР•РўРљРђ Р—РђРџРРЎРђРќРђ';
  const number = label && label.number ? label.number : '';
  const duplicate = label && label.duplicate ? ' В· РґСѓР±Р»СЊ' : '';
  $('markBannerDetail').textContent = `${number}${duplicate} В· ${formatClock(time)}`;

  banner.classList.remove('hidden');
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  clearTimeout(state.markBannerTimer);
  state.markBannerTimer = setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.classList.add('hidden'), 260);
  }, 4000);

  const flash = $('markFlash');
  if (flash) {
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
  }

  const circle = $('bigMark');
  if (circle) {
    circle.classList.remove('mark-pop');
    void circle.offsetWidth;
    circle.classList.add('mark-pop');
  }
}

/** РџРѕРєР°Р·Р°С‚СЊ РёСЃС…РѕРґ РЅР° 3 СЃРµРєСѓРЅРґС‹ Рё РїРѕРґРїРёСЃРё РѕС‚РјРµС‚РєРё СЂРѕРіРµР№РЅР°. */
function showOutcome(kind, label, code) {
  const text = $('markOutcome');
  const lines = [outcomeText(kind)];

  // РЈ Р·Р°РїРёСЃР°РЅРЅРѕР№ РѕС‚РјРµС‚РєРё СЂРѕРіРµР№РЅР° СЃСЂР°Р·Сѓ РїРѕРґ РёСЃС…РѕРґРѕРј вЂ” РЅРѕРјРµСЂ РїСѓРЅРєС‚Р°, Р±Р°Р»Р»С‹
  // Рё СЃСѓРјРјР°: РѕРґРЅР° СЃС‚СЂРѕРєР° РЅР° РєР°Р¶РґРѕРµ Р·РЅР°С‡РµРЅРёРµ, Р±РµР· РѕС‚РґРµР»СЊРЅС‹С… СЌР»РµРјРµРЅС‚РѕРІ,
  // РєРѕС‚РѕСЂС‹Рµ РјРѕРіР»Рё РѕСЃС‚Р°С‚СЊСЃСЏ СЃРєСЂС‹С‚С‹РјРё
  if (kind === 'recorded' && label && rogaineMode()) {
    lines.push(label.number);
    if (label.duplicate) {
      lines.push('РґСѓР±Р»РёСЂСѓСЋС‰Р°СЏ РѕС‚РјРµС‚РєР°, Р±Р°Р»Р»РѕРІ РЅРµС‚');
    } else if (label.score !== null) {
      lines.push(`${label.score} ${plural(label.score, 'Р±Р°Р»Р»', 'Р±Р°Р»Р»Р°', 'Р±Р°Р»Р»РѕРІ')}`);
    }
    if (label.total !== null) {
      lines.push(`РёС‚РѕРіРѕ: ${label.total} ${plural(label.total, 'Р±Р°Р»Р»', 'Р±Р°Р»Р»Р°', 'Р±Р°Р»Р»РѕРІ')}`);
    }
  }

  text.textContent = lines.join('\n');
  text.classList.remove('hidden');

  // Р”СѓР±Р»РёСЂСѓРµРј РёСЃС…РѕРґ РІСЃРїР»С‹РІР°СЋС‰РµР№ СЃС‚СЂРѕРєРѕР№: РѕРЅР° РІРёРґРЅР° РїСЂРё Р»СЋР±РѕРј СЂР°Р·РјРµСЂРµ РѕРєРЅР°
  // РєР°РјРµСЂС‹ Рё РЅРµ Р·Р°РІРёСЃРёС‚ РѕС‚ РІРµСЂСЃС‚РєРё РЅРёР¶РЅРµРіРѕ Р±Р»РѕРєР°
  if (kind === 'recorded' && rogaineMode() && label) {
    setStatus(lines.join(' В· '), 'good');
    // РС‚РѕРі РґСѓР±Р»РёСЂСѓРµРј РїСЂСЏРјРѕ РїРѕРґ РЅРѕРјРµСЂРѕРј РїСѓРЅРєС‚Р° РІ РїР°РЅРµР»Рё: С‚СѓРґР° СЃРјРѕС‚СЂРёС‚ СѓС‡Р°СЃС‚РЅРёРє
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

/** РџРѕРґСЃРєР°Р·РєР° РїРѕРґ РєРЅРѕРїРєРѕР№: РїРѕСЂСЏРґРѕРє РІР°Р¶РЅРµРµ вЂ” РѕС‚РєР°Р·, РіСЂСѓР±Р°СЏ С‚РѕС‡РЅРѕСЃС‚СЊ, СЃС‚Р°СЂС‚/С„РёРЅРёС€, СЂРµР¶РёРј. */
function renderHint(point, rough, auto) {
  const hint = $('markHint');
  hint.classList.remove('error');

  if (state.manualRefused) {
    hint.textContent = 'Р’РєР»СЋС‡РµРЅР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР°: РЅР°Р¶РёРјР°С‚СЊ РЅРµ РЅСѓР¶РЅРѕ. '
      + 'Р§С‚РѕР±С‹ РѕС‚РјРµС‡Р°С‚СЊСЃСЏ РІСЂСѓС‡РЅСѓСЋ, РІС‹РєР»СЋС‡РёС‚Рµ В«РђРІС‚РѕРјР°С‚РёС‡РµСЃРєСѓСЋ РѕС‚РјРµС‚РєСѓВ» РІ РЅР°СЃС‚СЂРѕР№РєР°С….';
    hint.classList.add('error');
    return;
  }
  if (rough) {
    hint.textContent = `Р–РґС‘Рј С‚РѕС‡РЅРѕРµ РјРµСЃС‚РѕРїРѕР»РѕР¶РµРЅРёРµ: РїРѕРіСЂРµС€РЅРѕСЃС‚СЊ Р±РѕР»СЊС€Рµ ${MAX_ACCURACY_METERS} РјРµС‚СЂРѕРІ. `
      + 'РћС‚РјРµС‚РєР° РІРєР»СЋС‡РёС‚СЃСЏ СЃР°РјР°, РєР°Рє С‚РѕР»СЊРєРѕ РїСЂРёС‘РјРЅРёРє СѓС‚РѕС‡РЅРёС‚ РјРµСЃС‚Рѕ.';
    return;
  }
  // РЎР»РѕРІР° РїСЂРѕ СЂСѓС‡РЅРѕР№ СЃС‚Р°СЂС‚ Рё С„РёРЅРёС€ РЅСѓР¶РЅС‹ С‚РѕР»СЊРєРѕ РїСЂРё РІРєР»СЋС‡С‘РЅРЅРѕР№
  // Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕР№ РѕС‚РјРµС‚РєРµ: РІ СЂСѓС‡РЅРѕРј СЂРµР¶РёРјРµ СЌС‚Рѕ Рё С‚Р°Рє РѕС‡РµРІРёРґРЅРѕ
  if (point && auto) {
    const kind = startOrFinishOf(codeOf(point));
    if (kind === 'start') {
      hint.textContent = 'РЎС‚Р°СЂС‚ РѕС‚РјРµС‡Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІСЂСѓС‡РЅСѓСЋ вЂ” РЅР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ';
      return;
    }
    if (kind === 'finish') {
      hint.textContent = 'Р¤РёРЅРёС€ РѕС‚РјРµС‡Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІСЂСѓС‡РЅСѓСЋ вЂ” РЅР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ';
      return;
    }
  }
  hint.textContent = auto
    ? 'РџРѕРґРѕР№РґРёС‚Рµ Рє РїСѓРЅРєС‚Сѓ вЂ” РѕС‚РјРµС‚РєР° РїРѕСЃС‚Р°РІРёС‚СЃСЏ СЃР°РјР°, РЅР°Р¶РёРјР°С‚СЊ РЅРµ РЅСѓР¶РЅРѕ'
    : 'РљРЅРѕРїРєР° СЃС‚Р°РЅРµС‚ Р·РµР»С‘РЅРѕР№ Сѓ РїСѓРЅРєС‚Р° вЂ” С‚РѕРіРґР° РЅР°Р¶РјРёС‚Рµ';
}

/** РЎС‚СЂРµР»РєР° РЅР° РІС‹Р±СЂР°РЅРЅС‹Р№ РљРџ: С‚РѕР»СЊРєРѕ GPS, С‚РѕР»СЊРєРѕ СЃ СЂР°Р·СЂРµС€РµРЅРёСЏ Р°РІС‚РѕСЂР° Рё СѓС‡Р°СЃС‚РЅРёРєР°. */
function updateHintArrow(distance, position, point) {
  const row = $('hintTargetRow');
  const select = $('hintTarget');
  const arrow = $('hintArrow');
  const label = $('markButtonLabel');
  const hintText = $('hintText');
  const enabled = Boolean(distance && distance.hintsAllowed) && Boolean(settings().hints) && !qrMode();
  row.classList.toggle('hidden', !enabled);
  hintText.classList.toggle('hidden', !enabled);
  if (!enabled) {
    arrow.classList.add('hidden');
    label.classList.remove('hidden');
    state.hintBearing = null;
    return;
  }
  // РўРѕР»СЊРєРѕ РїСѓРЅРєС‚С‹ СЌС‚РѕРіРѕ СЃРѕР±С‹С‚РёСЏ, Р±РµР· РїРѕРІС‚РѕСЂРѕРІ
  const codes = [...new Set((distance.points || []).map((item) => String(codeOf(item))))]
    .sort((left, right) => left.localeCompare(right, 'ru', { numeric: true }));
  // РЎРїРёСЃРѕРє РїРµСЂРµСЃС‚СЂР°РёРІР°РµРј С‚РѕР»СЊРєРѕ РїСЂРё СЃРјРµРЅРµ РЅР°Р±РѕСЂР° РљРџ, РёРЅР°С‡Рµ РІС‹Р±РѕСЂ РјРёРіР°РµС‚
  const signature = codes.join('|');
  if (select.dataset.signature !== signature) {
    const currentValue = select.value;
    select.textContent = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Р‘РµР· РїРѕРґСЃРєР°Р·РєРё';
    select.append(placeholder);
    codes.forEach((item) => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = labelOf(item);
      select.append(option);
    });
    if (codes.includes(currentValue)) select.value = currentValue;
    select.dataset.signature = signature;
  }
  if (!codes.includes(select.value)) {
    let stored = '';
    try {
      stored = localStorage.getItem(hintTargetKey(state.event && state.event.id)) || '';
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
    select.value = codes.includes(stored) ? stored : '';
  }
  const code = select.value;
  const target = (distance.points || []).find((item) => String(codeOf(item)) === code);
  if (!target || !position || point || !Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
    arrow.classList.add('hidden');
    label.classList.remove('hidden');
    hintText.textContent = '';
    state.hintBearing = null;
    return;
  }
  const meters = Math.round(distanceMeters(position.lat, position.lon, target.latitude, target.longitude));
  const bearing = bearingDegrees(position.lat, position.lon, target.latitude, target.longitude);
  const turn = ((bearing - state.heading + 540) % 360) - 180;
  state.hintBearing = bearing;
  hintText.textContent = `${labelOf(code)} В· ${meters} Рј В· ${Math.round(bearing)}В°`;
  $('hintArrowPointer').style.transform = `rotate(${turn}deg)`;
  arrow.classList.remove('hidden');
  label.classList.add('hidden');
}

/** РћС‚СЂРёСЃРѕРІРєР° СЌРєСЂР°РЅР° РѕС‚РјРµС‚РєРё РїРѕ СЃРѕСЃС‚РѕСЏРЅРёСЋ: GPS Рё QR. */
function renderMark() {
  const event = state.event;
  const auto = Boolean(settings().autoMark);
  const mode = $('markMode');
  mode.textContent = auto ? 'РћС‚РјРµС‚РєР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ' : 'РћС‚РјРµС‚РєР° СЂСѓС‡РЅР°СЏ';
  mode.classList.toggle('auto', auto);

  if (!event) {
    $('markTitle').textContent = 'РЎРЅР°С‡Р°Р»Р° Р°РєС‚РёРІРёСЂСѓР№С‚Рµ СЃРѕР±С‹С‚РёРµ';
    $('markAccuracy').textContent = 'Р’С‹Р±РµСЂРёС‚Рµ СЃРѕР±С‹С‚РёРµ РІ РѕР±Р»Р°РєРµ.';
    $('markReady').classList.add('hidden');
    setCircle(null, 'РџРѕРґРѕР№РґРёС‚Рµ Рє РїСѓРЅРєС‚Сѓ', false);
    renderHint(null, false, auto);
    return;
  }

  const distance = event.distance || {};
  const scanning = qrMode();
  $('markTitle').textContent = distance.name || 'РЎРѕР±С‹С‚РёРµ';
  $('qrBox').classList.toggle('hidden', !scanning);
  document.querySelector('.mark-center').classList.toggle('hidden', scanning);

  if (scanning) {
    $('markAccuracy').textContent = identity().nick || 'РџСЂРѕС„РёР»СЊ РЅРµ Р·Р°РїРѕР»РЅРµРЅ';
    $('markReady').classList.add('hidden');
    $('markHint').classList.remove('hidden');
    renderHint(null, false, auto);
    $('markHint').textContent = auto
      ? 'РќР°РІРµРґРёС‚Рµ РєР°РјРµСЂСѓ РЅР° QR-РєРѕРґ вЂ” РѕС‚РјРµС‚РєР° РїРѕСЃС‚Р°РІРёС‚СЃСЏ СЃР°РјР°, РЅР°Р¶РёРјР°С‚СЊ РЅРµ РЅСѓР¶РЅРѕ'
      : 'РќР°РІРµРґРёС‚Рµ РєР°РјРµСЂСѓ РЅР° QR-РєРѕРґ Рё РЅР°Р¶РјРёС‚Рµ В«РћРўРњР•РўРРўР¬В»';
    renderQrConfirm();
    return;
  }

  const position = state.position;
  if (position) {
    const accuracy = Math.round(position.accuracy * 10) / 10;
    $('markAccuracy').textContent = `РџРѕРіСЂРµС€РЅРѕСЃС‚СЊ: ${String(accuracy).replace('.', ',')} Рј`;
  } else {
    $('markAccuracy').textContent = 'РљРѕРѕСЂРґРёРЅР°С‚С‹ РїРѕРєР° РЅРµ РїРѕР»СѓС‡РµРЅС‹';
  }

  const current = findMarkPoint(false);
  const buffered = current ? null : bestBufferedPoint();
  const point = current || (buffered && buffered.point) || null;
  const pointFix = current ? null : (buffered && buffered.fix) || null;
  state.candidate = point;
  state.candidateFix = pointFix;
  // Р“СЂСѓР±Р°СЏ С‚РѕС‡РЅРѕСЃС‚СЊ РІР°Р¶РЅР°, С‚РѕР»СЊРєРѕ РєРѕРіРґР° Р·Р°С‡С‘С‚РЅРѕР№ С‚РѕС‡РєРё РЅРµС‚ РІРѕРІСЃРµ
  const rough = !point && Boolean(position) && position.accuracy > MAX_ACCURACY_METERS;

  const ready = $('markReady');
  if (!position) {
    ready.textContent = 'Р–РґС‘Рј СЃРёРіРЅР°Р» GPS';
    ready.classList.remove('hidden', 'ok');
  } else if (rough) {
    ready.textContent = `РўРѕС‡РЅРѕСЃС‚СЊ РїРѕРєР° РіСЂСѓР±Р°СЏ: В±${Math.round(position.accuracy)} Рј`;
    ready.classList.remove('hidden', 'ok');
  } else if (point) {
    ready.textContent = pointFix
      ? `Р“РѕС‚РѕРІРѕ вЂ” РїРѕ С‚РѕС‡РєРµ ${Math.max(1, Math.round((Date.now() - pointFix.at) / 1000))} СЃ РЅР°Р·Р°Рґ`
      : 'Р“РѕС‚РѕРІРѕ вЂ” РјРѕР¶РЅРѕ РѕС‚РјРµС‡Р°С‚СЊ';
    ready.classList.remove('hidden');
    ready.classList.add('ok');
  } else {
    ready.classList.add('hidden');
  }

  if (point) setCircle(point, labelOf(codeOf(point)), true);
  else setCircle(null, 'РџРѕРґРѕР№РґРёС‚Рµ Рє РїСѓРЅРєС‚Сѓ', false);
  updateHintArrow(distance, position, point);

  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР°: РѕРґРЅР° РЅР° РїСѓРЅРєС‚, СЃС‚Р°СЂС‚ Рё С„РёРЅРёС€ РЅРµ Р°РІС‚РѕРјР°С‚РёР·РёСЂСѓСЋС‚СЃСЏ.
  // Р‘Р»РёР¶Р°Р№С€Р°СЏ С‚РѕС‡РєР° РёР· Р±СѓС„РµСЂР° С‚РѕР¶Рµ РіРѕРґРёС‚СЃСЏ: СѓС‡Р°СЃС‚РЅРёРє РјРѕРі СѓР¶Рµ РІС‹Р№С‚Рё РёР· Р·РѕРЅС‹
  const code = point ? codeOf(point) : null;
  const kind = point ? startOrFinishOf(code) : null;
  if (auto && code && !kind) {
    if (state.autoMarked !== code) {
      state.autoMarked = code;
      state.manualRefused = false;
      markByCode(code);
    }
  } else {
    // РЈС€Р»Рё СЃ РїСѓРЅРєС‚Р°, РІСЃС‚Р°Р»Рё РЅР° СЃС‚Р°СЂС‚/С„РёРЅРёС€ РёР»Рё РІС‹РєР»СЋС‡РёР»Рё Р°РІС‚РѕРѕС‚РјРµС‚РєСѓ:
    // РєР»СЋС‡ СЃР±СЂР°СЃС‹РІР°РµС‚СЃСЏ, РєР°Рє autoMarkKey РІ Android
    state.autoMarked = null;
    if (!auto) state.manualRefused = false;
  }

  handleEmergency(point, position, rough);
  renderHint(point, rough, auto);
}

/** РљРЅРѕРїРєР° РѕС‚РјРµС‚РєРё: С†РІРµС‚ Рё РїРѕРґРїРёСЃСЊ Р·Р°РІРёСЃСЏС‚ РѕС‚ С‚РѕРіРѕ, РјРѕР¶РЅРѕ Р»Рё РѕС‚РјРµС‡Р°С‚СЊ. */
function setCircle(point, label, ready) {
  const circle = $('bigMark');
  $('markButtonLabel').textContent = label;
  circle.classList.toggle('ready', Boolean(ready));
  circle.disabled = !ready;
}

/** РќР°Р¶Р°С‚РёРµ РєСЂСѓРіР»РѕР№ РєРЅРѕРїРєРё. */
function markCandidate() {
  const auto = Boolean(settings().autoMark);
  const point = state.candidate;
  if (!point || !state.event) {
    if (state.marks.some((mark) => mark.finish)) showOutcome('finish');
    return;
  }

  const code = codeOf(point);
  const kind = startOrFinishOf(code);
  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР° РІРєР»СЋС‡РµРЅР°: СЂСѓС‡РЅР°СЏ РЅРµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ, СЌРєСЂР°РЅ РѕР±СЉСЏСЃРЅСЏРµС‚
  if (auto && !kind) {
    state.manualRefused = true;
    renderMark();
    return;
  }
  state.manualRefused = false;
  markByCode(code);
}

/**
 * РћСЃС‚Р°РІР»СЏРµС‚ С‚РѕР»СЊРєРѕ РѕС‚РјРµС‚РєРё С‚РµРєСѓС‰РµРіРѕ РїСЂРѕС…РѕРґР°: РїРѕСЃР»Рµ РїРѕСЃР»РµРґРЅРµРіРѕ СЃС‚Р°СЂС‚Р°
 * Рё РґРѕ РїРµСЂРІРѕРіРѕ С„РёРЅРёС€Р°.
 *
 * РџСЂР°РІРёР»Рѕ РїСЂРёР»РѕР¶РµРЅРёСЏ: РЅРѕРІС‹Р№ СЃС‚Р°СЂС‚ СЃС‚РёСЂР°РµС‚ РїСЂРµР¶РЅРёРµ РѕС‚РјРµС‚РєРё, Р° РїРѕСЃР»Рµ С„РёРЅРёС€Р°
 * РЅРёС‡РµРіРѕ РЅРµ Р·Р°РїРёСЃС‹РІР°РµС‚СЃСЏ. Р§РёСЃС‚РєР° РЅСѓР¶РЅР° Рё РґР»СЏ РѕС‚РјРµС‚РѕРє, Р·Р°РїРёСЃР°РЅРЅС‹С… СЃС‚Р°СЂС‹РјРё
 * СЃР±РѕСЂРєР°РјРё, РіРґРµ СЃР±СЂРѕСЃР° РµС‰С‘ РЅРµ Р±С‹Р»Рѕ.
 */
function sanitizeMarks() {
  const marks = state.marks || [];
  let startAt = -1;
  marks.forEach((mark, index) => {
    if (mark.start) startAt = index;
  });
  // РЎС‚Р°СЂС‚ СЃС‚РёСЂР°РµС‚ РІСЃС‘ РґРѕ РЅРµРіРѕ; РѕС‚РјРµС‚РєРё РїРѕСЃР»Рµ С„РёРЅРёС€Р° СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ, РЅРѕ РІ
  // СЂРµР·СѓР»СЊС‚Р°С‚ РЅРµ РёРґСѓС‚ вЂ” РёС… РѕС‚СЃРµРєР°РµС‚ attemptMarks
  const cleaned = startAt >= 0 ? marks.slice(startAt) : marks;
  if (cleaned.length !== marks.length || startAt > 0) {
    state.marks = cleaned;
    saveMarks();
  }
  return cleaned;
}

/** Р—Р°РїРёСЃСЊ РѕС‚РјРµС‚РєРё: РѕРґРЅРѕ РїСЂР°РІРёР»Рѕ Рё РѕРґРЅРё СЃР»РѕРІР° РґР»СЏ РєРЅРѕРїРєРё, Р°РІС‚РѕРјР°С‚РёРєРё Рё QR. */
function clearMapReturnTimer() {
  if (state.mapReturnTimer) {
    clearTimeout(state.mapReturnTimer);
    state.mapReturnTimer = null;
  }
}

/** Р’РѕР·РІСЂР°С‚ СЃ РѕС‚РјРµС‚РєРё РЅР° С‚Сѓ Р¶Рµ РїРѕР»РЅРѕСЌРєСЂР°РЅРЅСѓСЋ РєР°СЂС‚Сѓ. */
function returnToFullMap() {
  clearMapReturnTimer();
  state.returnToMap = false;
  $('markReturn').classList.add('hidden');
  showTab('detail');
  const box = $('detailMap');
  mapState.box = box;
  mapState.fullscreen = true;
  box.classList.remove('hidden');
  box.classList.add('fullscreen');
  redrawMap();
}

/** РћС‚СЃС‡С‘С‚ 3, 2, 1 РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕР№ GPS-РѕС‚РјРµС‚РєРё. */
function scheduleMapReturn(auto) {
  if (!state.returnToMap) return;
  if (auto && state.autoReturnUsed) return;
  if (auto) state.autoReturnUsed = true;
  clearMapReturnTimer();
  let seconds = 3;
  const label = $('markReturn');
  const tick = () => {
    if (!state.returnToMap) return;
    if (seconds > 0) {
      label.textContent = `Р’РѕР·РІСЂР°С‚ Рє РєР°СЂС‚Рµ С‡РµСЂРµР· ${seconds}`;
      label.classList.remove('hidden');
      seconds -= 1;
      state.mapReturnTimer = setTimeout(tick, 1000);
    } else {
      returnToFullMap();
    }
  };
  tick();
}

function markByCode(code, options = {}) {
  // Р’СЂРµРјСЏ вЂ” С‚РѕР»СЊРєРѕ РјРѕРјРµРЅС‚ РѕС‚РјРµС‚РєРё. Р‘СѓС„РµСЂ GPS РґР°С‘С‚ РєРѕРѕСЂРґРёРЅР°С‚С‹, РЅРѕ РЅРµ РІСЂРµРјСЏ
  const time = Date.now();
  const start = isStart(code, rogaineMode());
  const finish = isFinish(code, rogaineMode());

  const label = markLabelFor(code);
  if (start) {
    // РќРѕРІР°СЏ РѕС‚РјРµС‚РєР° СЃС‚Р°СЂС‚Р° РЅР°С‡РёРЅР°РµС‚ РїСЂРѕС‚РѕРєРѕР» Р·Р°РЅРѕРІРѕ
    state.marks = [{ code, time, start: true, finish: false }];
  } else {
    state.marks.push({ code, time, start: false, finish: Boolean(finish) });
  }
  // Р‘СѓС„РµСЂ РѕС‚РЅРѕСЃРёС‚СЃСЏ Рє С‚РѕР»СЊРєРѕ С‡С‚Рѕ Р·Р°РїРёСЃР°РЅРЅРѕР№ РѕС‚РјРµС‚РєРµ: СЃР»РµРґСѓСЋС‰Р°СЏ С‚РѕС‡РєР°
  // РґРѕР»Р¶РЅР° РїСЂРёР№С‚Рё СѓР¶Рµ РїРѕСЃР»Рµ РЅРµС‘
  state.recentFixes = [];
  state.candidateFix = null;
  state.autoMarked = options.auto ? String(code) : state.autoMarked;
  saveMarks();
  playMarkSound();
  renderMark();
  showOutcome('recorded', label);
  showMarkConfirmation(label, time);
  scheduleMapReturn(Boolean(options.auto));

  if (finish && settings().autoSend && identity().nick && identity().code.length >= 6) {
    sendResult();
  }
  return 'recorded';
}

/** РђРІР°СЂРёР№РЅР°СЏ РѕС‚РјРµС‚РєР°: СЃС‚РѕРёРј РІ Р·РѕРЅРµ 10 СЃРµРєСѓРЅРґ РїСЂРё РіСЂСѓР±РѕР№ РїРѕРіСЂРµС€РЅРѕСЃС‚Рё. */
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
      `РџСЂРёС‘РјРЅРёРє РЅРµ РјРѕР¶РµС‚ СѓС‚РѕС‡РЅРёС‚СЊ РјРµСЃС‚Рѕ: РїРѕРіСЂРµС€РЅРѕСЃС‚СЊ ${Math.round(position.accuracy)} РјРµС‚СЂРѕРІ, `
      + `Р° РґРѕ РїСѓРЅРєС‚Р° ${Math.round(meters)} РјРµС‚СЂРѕРІ. РћР±С‹С‡РЅРѕ РїСЂРё С‚Р°РєРѕР№ РїРѕРіСЂРµС€РЅРѕСЃС‚Рё РѕС‚РјРµС‚РєР° РЅРµ СЃС‚Р°РІРёС‚СЃСЏ вЂ” `
      + 'СЂСЏРґРѕРј СЃ РїСѓРЅРєС‚РѕРј РѕРєР°Р·Р°Р»СЃСЏ Р±С‹ СѓС‡Р°СЃС‚РѕРє РІ РґРµСЃСЏС‚РєРё РјРµС‚СЂРѕРІ.\n\n'
      + 'Р’С‹ СЃС‚РѕРёС‚Рµ РІРЅСѓС‚СЂРё Р·РѕРЅС‹ РїСѓРЅРєС‚Р°, РїРѕСЃС‡РёС‚Р°РЅРЅРѕР№ РїРѕ СЌС‚РѕР№ РїРѕРіСЂРµС€РЅРѕСЃС‚Рё, РїРѕСЌС‚РѕРјСѓ РѕС‚РјРµС‚РєСѓ РјРѕР¶РЅРѕ '
      + 'РїРѕСЃС‚Р°РІРёС‚СЊ РІСЂСѓС‡РЅСѓСЋ. Р—Р°РїРёСЃСЊ Р±СѓРґРµС‚ СЃРґРµР»Р°РЅР°, РЅРѕ РјРµСЃС‚Рѕ РѕРїСЂРµРґРµР»РµРЅРѕ РіСЂСѓР±Рѕ: РїСЂРё РїСЂРѕРІРµСЂРєРµ РѕСЂРіР°РЅРёР·Р°С‚РѕСЂ '
      + 'СѓРІРёРґРёС‚ СЌС‚Рѕ РїРѕ РїРѕРіСЂРµС€РЅРѕСЃС‚Рё.\n\n'
      + 'Р›СѓС‡С€Рµ РѕС‚РѕР№С‚Рё РѕС‚ РґРµСЂРµРІСЊРµРІ Рё СЃС‚РµРЅ Рё РїРѕРґРѕР¶РґР°С‚СЊ СѓС‚РѕС‡РЅРµРЅРёСЏ. Р•СЃР»Рё Р¶РґР°С‚СЊ РЅРµС‡РµРіРѕ вЂ” РїРѕРґС‚РІРµСЂРґРёС‚Рµ РѕС‚РјРµС‚РєСѓ.';
    $('emergencyText').style.whiteSpace = 'pre-line';
    state.emergencyPoint = codeOf(loose);
    dialog.classList.remove('hidden');
  }
}

/** РЎРєР°РЅРµСЂ QR: РєР°РјРµСЂР° Рё BarcodeDetector, РѕС‚РјРµС‚РєР° СЃС‚Р°РІРёС‚СЃСЏ СЃР°РјР°. */
let qrStream = null;
let qrTimer = null;
let qrBusy = false;

function startQrScanner() {
  if (qrTimer !== null) return;
  const video = $('qrVideo');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('РљР°РјРµСЂР° РЅРµРґРѕСЃС‚СѓРїРЅР° РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ', 'error');
    return;
  }

  // Р’ Chrome РЅР° Android РµСЃС‚СЊ РІСЃС‚СЂРѕРµРЅРЅС‹Р№ BarcodeDetector, РІ Safari РµРіРѕ РЅРµС‚ вЂ”
  // С‚Р°Рј СЂР°Р±РѕС‚Р°РµС‚ СЂРµР·РµСЂРІРЅС‹Р№ РґРµРєРѕРґРµСЂ jsQR
  const native = 'BarcodeDetector' in window;
  if (!native && typeof jsQR === 'undefined') {
    setStatus('РљР°РјРµСЂР° РµСЃС‚СЊ, РЅРѕ С‡РёС‚Р°С‚СЊ QR СЌС‚РѕС‚ Р±СЂР°СѓР·РµСЂ РЅРµ СѓРјРµРµС‚', 'error');
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
    .catch(() => setStatus('РљР°РјРµСЂР° РЅРµРґРѕСЃС‚СѓРїРЅР°: РїСЂРѕРІРµСЂСЊС‚Рµ СЂР°Р·СЂРµС€РµРЅРёРµ', 'error'));
}

/** Р РµР·РµСЂРІРЅС‹Р№ РїСѓС‚СЊ РґР»СЏ iPhone: РєР°РґСЂ РІ canvas Рё СЂР°Р·Р±РѕСЂ С‡РµСЂРµР· jsQR. */
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

/** Р Р°Р·Р±РѕСЂ РєРѕРґР° СЃ РєР°РјРµСЂС‹: РїРѕРєР°Р·С‹РІР°РµРј РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ, РѕС‚РјРµС‚РєР° вЂ” РїРѕ РєРЅРѕРїРєРµ. */
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
    // Р’ QR РєРѕРґС‹ РґРІСѓР·РЅР°С‡РЅС‹Рµ (В«01В», В«02В», В«57В»), Р° РІ Р±Р°Р·Рµ РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРёСЏ С‡РёСЃР»Р°
    // Р±РµР· РІРµРґСѓС‰РµРіРѕ РЅСѓР»СЏ: В«02В» вЂ” СЌС‚Рѕ С„РёРЅРёС€ 2, В«01В» вЂ” СЃС‚Р°СЂС‚ (3 РёР»Рё 1).
    // Р‘РµР· РїСЂРёРІРµРґРµРЅРёСЏ РІРµСЂРЅС‹Р№ РєРѕРґ С„РёРЅРёС€Р° РёСЃРєР°Р»Рё СЃС‚СЂРѕРєРѕР№ В«02В» Рё РЅРµ РЅР°С…РѕРґРёР»Рё
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

  // Р”Рѕ РѕС‚РјРµС‚РєРё РёР·РІРµСЃС‚РµРЅ С‚РѕР»СЊРєРѕ РЅРѕРјРµСЂ РїСѓРЅРєС‚Р°. Р‘Р°Р»Р»С‹ Рё СЃСѓРјРјСѓ РЅРµ СЃС‡РёС‚Р°РµРј РІРѕРІСЃРµ:
  // СЃСѓРјРјР° РѕР±СЏР·Р°РЅР° РёР·РјРµРЅРёС‚СЊСЃСЏ СЂРѕРІРЅРѕ РїРѕСЃР»Рµ Р·Р°РїРёСЃРё, Р° РЅРµ РїСЂРё РЅР°РІРµРґРµРЅРёРё РєР°РјРµСЂС‹
  const label = code
    ? { code, number: labelOf(code), score: null, duplicate: false, total: null }
    : null;
  state.pendingQr = { raw, code, label, foreign, seenAt: Date.now() };
  state.manualRefused = false;
  state.outcomeHints = '';
  renderQrConfirm();

  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР°: РєРѕРґ РІ РєР°РґСЂРµ вЂ” РѕС‚РјРµС‡Р°РµРјСЃСЏ Р±РµР· РЅР°Р¶Р°С‚РёСЏ, РѕРґРёРЅ СЂР°Р· РЅР° РєРѕРґ.
  // РЎС‚Р°СЂС‚ Рё С„РёРЅРёС€ Р°РІС‚РѕРјР°С‚РёРєР° РЅРµ СЃС‚Р°РІРёС‚.
  if (settings().autoMark && label && !startOrFinishOf(code) && state.autoQrCode !== code) {
    state.autoQrCode = code;
    markByCode(code, { auto: true });
  }
}

/** РџР°РЅРµР»СЊ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ QR: РїРѕРґРїРёСЃСЊ РїСѓРЅРєС‚Р°, РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ Рё РєРЅРѕРїРєРё. */
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
      ? 'РљРѕРґ РґСЂСѓРіРѕР№ РґРёСЃС‚Р°РЅС†РёРё'
      : 'Р­С‚Рѕ РЅРµ РєРѕРґ РєРѕРЅС‚СЂРѕР»СЊРЅРѕРіРѕ РїСѓРЅРєС‚Р° вЂ” РёР»Рё РЅРµ РІР°С€РµР№ РґРёСЃС‚Р°РЅС†РёРё';
  } else if (auto) {
    const kind = startOrFinishOf(label.code);
    if (kind === 'start') text = 'РЎС‚Р°СЂС‚ РѕС‚РјРµС‡Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІСЂСѓС‡РЅСѓСЋ: РЅР°Р¶РјРёС‚Рµ В«РћС‚РјРµС‚РёС‚СЊВ»';
    if (kind === 'finish') text = 'Р¤РёРЅРёС€ РѕС‚РјРµС‡Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІСЂСѓС‡РЅСѓСЋ: РЅР°Р¶РјРёС‚Рµ В«РћС‚РјРµС‚РёС‚СЊВ»';
    if (!kind) text = 'Р’РєР»СЋС‡РµРЅР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР°: РѕС‚РјРµС‡Р°С‚СЊ РІСЂСѓС‡РЅСѓСЋ РЅРµ РЅСѓР¶РЅРѕ';
  }
  warning.textContent = text;
  warning.classList.toggle('hidden', !text);
  $('qrMark').disabled = !label;

  // Р”Рѕ РѕС‚РјРµС‚РєРё РїРѕРєР°Р·С‹РІР°РµРј РўРћР›Р¬РљРћ РЅРѕРјРµСЂ РїСѓРЅРєС‚Р°. РџРѕСЃР»Рµ Р·Р°РїРёСЃРё РїРѕРґ РЅРѕРјРµСЂРѕРј
  // РµС‰С‘ 3 СЃРµРєСѓРЅРґС‹ РІРёСЃСЏС‚ Р±Р°Р»Р»С‹ Рё В«РёС‚РѕРіРѕВ» вЂ” С‚Р°Рє Р¶Рµ, РєР°Рє РїРѕРґРїРёСЃСЊ РѕС‚РјРµС‚РєРё
  // РІ РїСЂРёР»РѕР¶РµРЅРёРё РѕСЃС‚Р°С‘С‚СЃСЏ РЅР° СЌРєСЂР°РЅРµ
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

/** РљРѕРґ СѓС€С‘Р» РёР· РєР°РґСЂР° вЂ” РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ Рё РєРЅРѕРїРєРё СѓР±РёСЂР°РµРј, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё. */
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

/** Р•РґРёРЅРѕРµ РїСЂР°РІРёР»Рѕ РїРµСЂРёРѕРґР° РґР»СЏ Р°РєС‚РёРІР°С†РёРё, СЌРєСЂР°РЅР° РѕС‚РјРµС‚РєРё Рё РєР°СЂС‚С‹. */
function markingPeriodBlock(source) {
  const data = source || {};
  const period = periodState(data);
  if (period === 'BEFORE') return { before: true, time: data.startTime };
  if (period === 'AFTER') return { before: false, time: data.finishTime };
  return null;
}

function showPeriodWarning(before, time) {
  const box = $('periodWarning');
  // РљР°СЂС‚Р° РѕС‚РєСЂС‹С‚Р° РЅР° СЌРєСЂР°РЅРµ СЃРѕР±С‹С‚РёСЏ: РїРµСЂРµРЅРѕСЃРёРј РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ РёР· СЃРєСЂС‹С‚РѕРіРѕ
  // СЌРєСЂР°РЅР° РѕС‚РјРµС‚РєРё РІ body, РёРЅР°С‡Рµ РѕРЅРѕ РЅРµ РїРѕРєР°Р¶РµС‚СЃСЏ.
  if (box && box.parentElement && box.parentElement.id === 'markScreen') {
    document.body.append(box);
  }
  $('periodWarningTitle').textContent = before
    ? 'РЎРѕР±С‹С‚РёРµ РµС‰С‘ РЅРµ РЅР°С‡Р°Р»РѕСЃСЊ'
    : 'РЎРѕР±С‹С‚РёРµ СѓР¶Рµ Р·Р°РєРѕРЅС‡РёР»РѕСЃСЊ';
  $('periodWarningText').textContent = before
    ? `РћС‚РјРµС‚РєР° СЃС‚Р°РЅРµС‚ РґРѕСЃС‚СѓРїРЅР° ${formatDate(time)}.`
    : `РЎРѕР±С‹С‚РёРµ Р·Р°РєРѕРЅС‡РёР»РѕСЃСЊ ${formatDate(time)}.`;
  $('periodWarning').classList.remove('hidden');
}

function locationHintForBrowser() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'РќР°СЃС‚СЂРѕР№РєРё в†’ Safari в†’ Р“РµРѕР»РѕРєР°С†РёСЏ в†’ Р Р°Р·СЂРµС€РёС‚СЊ. РўР°РєР¶Рµ РІРєР»СЋС‡РёС‚Рµ В«РЎР»СѓР¶Р±С‹ РіРµРѕР»РѕРєР°С†РёРёВ» РІ РЅР°СЃС‚СЂРѕР№РєР°С… iPhone.';
  }
  if (/Chrome/i.test(ua) && /Android/i.test(ua)) {
    return 'РќР°СЃС‚СЂРѕР№РєРё С‚РµР»РµС„РѕРЅР° в†’ Р“РµРѕР»РѕРєР°С†РёСЏ в†’ Р’РєР»СЋС‡РёС‚СЊ. Р—Р°С‚РµРј СЂР°Р·СЂРµС€РёС‚Рµ РіРµРѕР»РѕРєР°С†РёСЋ РґР»СЏ СЌС‚РѕРіРѕ СЃР°Р№С‚Р° РІ Chrome.';
  }
  return 'Р’РєР»СЋС‡РёС‚Рµ СЃР»СѓР¶Р±С‹ РіРµРѕР»РѕРєР°С†РёРё РІ РЅР°СЃС‚СЂРѕР№РєР°С… СѓСЃС‚СЂРѕР№СЃС‚РІР° Рё СЂР°Р·СЂРµС€РёС‚Рµ РіРµРѕР»РѕРєР°С†РёСЋ РґР»СЏ СЌС‚РѕРіРѕ СЃР°Р№С‚Р° РІ Р±СЂР°СѓР·РµСЂРµ.';
}

function showLocationWarning(reason) {
  const box = $('locationWarning');
  if (!box) return;
  const denied = reason === 'denied';
  $('locationWarningTitle').textContent = denied
    ? 'Р”РѕСЃС‚СѓРї Рє РіРµРѕР»РѕРєР°С†РёРё Р·Р°РїСЂРµС‰С‘РЅ'
    : 'Р“РµРѕР»РѕРєР°С†РёСЏ РІС‹РєР»СЋС‡РµРЅР°';
  $('locationWarningText').textContent = locationHintForBrowser();
  $('locationEnable').textContent = 'Р’РєР»СЋС‡РёС‚СЊ';
  box.classList.remove('hidden');
}

function hideLocationWarning() {
  const box = $('locationWarning');
  if (box) box.classList.add('hidden');
}

async function checkLocationAccess() {
  if (!navigator.geolocation) {
    showLocationWarning('unavailable');
    return;
  }
  let probe = true;
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') return showLocationWarning('denied');
      // РџСЂРё РІРѕРїСЂРѕСЃРµ Р±СЂР°СѓР·РµСЂ СЃР°Рј РїРѕРєР°Р¶РµС‚ СЂР°Р·СЂРµС€РµРЅРёРµ РїРѕСЃР»Рµ startWatch.
      if (permission.state === 'prompt') probe = false;
    }
  } catch (error) {
    // Safari РјРѕР¶РµС‚ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°С‚СЊ Р·Р°РїСЂРѕСЃ СЂР°Р·СЂРµС€РµРЅРёСЏ вЂ” РїСЂРѕРІРµСЂРёРј Р·Р°РїСЂРѕСЃРѕРј GPS
  }
  if (!probe) return;
  // Р•СЃР»Рё СЂР°Р·СЂРµС€РµРЅРёРµ СѓР¶Рµ РІС‹РґР°РЅРѕ, Р° СЃР»СѓР¶Р±С‹ РіРµРѕР»РѕРєР°С†РёРё РІС‹РєР»СЋС‡РµРЅС‹, РѕС€РёР±РєР°
  // РїСЂРёС…РѕРґРёС‚ Р±С‹СЃС‚СЂРѕ; РЅРµ Р¶РґС‘Рј 20 СЃРµРєСѓРЅРґ РѕСЃРЅРѕРІРЅРѕРіРѕ watch.
  navigator.geolocation.getCurrentPosition(
    hideLocationWarning,
    (error) => {
      if (error && (error.code === 1 || error.code === 2)) {
        showLocationWarning(error.code === 1 ? 'denied' : 'unavailable');
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 4000 }
  );
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
      // Р“СЂСѓР±С‹Рµ Р·Р°РјРµСЂС‹ СЃСЂР°Р·Сѓ РѕС‚Р±СЂР°СЃС‹РІР°РµРј: РїСЂРё РѕС‚РєСЂС‹С‚РёРё СЌРєСЂР°РЅР° РїСЂРёС‘РјРЅРёРє С‡Р°СЃС‚Рѕ
      // РґР°С‘С‚ 40вЂ“80 Рј, Рё С‚Р°РєРёРµ С‚РѕС‡РєРё РЅРµ РґРѕР»Р¶РЅС‹ РїРѕРїР°РґР°С‚СЊ РІ Р±СѓС„РµСЂ
      if (position.coords.accuracy > 0 && position.coords.accuracy <= MAX_ACCURACY_METERS) {
        const now = Date.now();
        state.recentFixes = (state.recentFixes || [])
          .filter((fix) => now - fix.at <= FIX_WINDOW_MILLIS)
          .concat({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            at: now,
          })
          .slice(-MAX_RECENT_FIXES);
      }
      hideLocationWarning();
      renderMark();
    },
    (error) => {
      // РЎРЅРёРјР°РµРј Р·Р°РІРёСЃС€РёР№ watch: РёРЅР°С‡Рµ РєРЅРѕРїРєР° РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р·Р°РїСЂРѕСЃР° РЅРµ СЃСЂР°Р±РѕС‚Р°РµС‚
      stopWatch();
      if (error && (error.code === 1 || error.code === 2)) {
        showLocationWarning(error.code === 1 ? 'denied' : 'unavailable');
      }
      if (error && error.code === 1) {
        $('markAccuracy').textContent =
          'Р“РµРѕР»РѕРєР°С†РёСЏ Р·Р°РїСЂРµС‰РµРЅР°. РќР°СЃС‚СЂРѕР№РєРё в†’ РљРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚СЊ в†’ '
          + 'РЎР»СѓР¶Р±С‹ РіРµРѕР»РѕРєР°С†РёРё в†’ Safari Websites в†’ Р Р°Р·СЂРµС€РёС‚СЊ Рё РІРєР»СЋС‡РёС‚СЊ С‚РѕС‡РЅСѓСЋ РіРµРѕРїРѕР·РёС†РёСЋ.';
      } else {
        $('markAccuracy').textContent = 'GPS РЅРµРґРѕСЃС‚СѓРїРµРЅ: ' + error.message;
      }
      $('gpsRetry').classList.remove('hidden');
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
}

/** Р—РІСѓРє РѕС‚РјРµС‚РєРё: С‚РѕС‚ Р¶Рµ С„Р°Р№Р», С‡С‚Рѕ РІ Android (res/raw/mark_success.ogg). */
const MARK_SOUND_URL = 'sounds/mark_success.wav';
let markAudioContext = null;
let markSoundBuffer = null;
let markSoundLoading = false;

function markAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!markAudioContext) {
    try {
      markAudioContext = new AudioCtx();
    } catch (error) {
      return null;
    }
  }
  return markAudioContext;
}

async function loadMarkSound(context) {
  if (!context || markSoundBuffer || markSoundLoading) return;
  markSoundLoading = true;
  try {
    const response = await fetch(MARK_SOUND_URL);
    if (!response.ok) throw new Error('sound');
    const data = await response.arrayBuffer();
    markSoundBuffer = await context.decodeAudioData(data);
  } catch (error) {
    // РћСЃС‚Р°С‘С‚СЃСЏ Р·Р°РїР°СЃРЅРѕР№ СЃРёРЅС‚РµР·РёСЂРѕРІР°РЅРЅС‹Р№ СЃРёРіРЅР°Р»
  } finally {
    markSoundLoading = false;
  }
}

/** Р Р°Р·Р±Р»РѕРєРёСЂРѕРІРєР° Р·РІСѓРєР° РЅР° iOS: РґРѕ РїРµСЂРІРѕРіРѕ РєР°СЃР°РЅРёСЏ AudioContext СЃРїРёС‚. */
function unlockMarkSound() {
  const context = markAudio();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
  loadMarkSound(context);
}

function playFallbackSound(context) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.15;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
}

/** Р—РІСѓРє Рё РІРёР±СЂР°С†РёСЏ РїСЂРё РѕС‚РјРµС‚РєРµ вЂ” РєР°Рє MarkSoundPlayer Рё MarkVibrationPlayer. */
function playMarkSound() {
  const current = settings();
  if (current.sound) {
    const context = markAudio();
    if (context) {
      const play = () => {
        try {
          if (markSoundBuffer) {
            const source = context.createBufferSource();
            source.buffer = markSoundBuffer;
            source.connect(context.destination);
            source.start();
          } else {
            loadMarkSound(context);
            playFallbackSound(context);
          }
        } catch (error) {
          // Р—РІСѓРє РЅРµ РѕР±СЏР·Р°С‚РµР»РµРЅ: РѕС‚РјРµС‚РєР° РІСЃС‘ СЂР°РІРЅРѕ Р·Р°РїРёСЃР°РЅР°
        }
      };
      if (context.state === 'running') {
        play();
      } else {
        context.resume().then(play).catch(() => {});
      }
    }
  }
  if (current.vibration && navigator.vibrate) navigator.vibrate(60);
}

// Safari СЂР°Р·СЂРµС€Р°РµС‚ Р·РІСѓРє С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РєР°СЃР°РЅРёСЏ. Р Р°Р·Р±Р»РѕРєРёСЂСѓРµРј РїСЂРё РїРµСЂРІРѕРј РґРµР№СЃС‚РІРёРё
['pointerdown', 'touchstart', 'keydown'].forEach((event) => {
  window.addEventListener(event, unlockMarkSound, { once: true, passive: true });
});

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ РїСЂРѕС„РёР»СЊ Рё РѕС‚РїСЂР°РІРєР° в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

function identity() {
  const saved = readJson(STORAGE.identity, { nick: '', code: '' });
  return { nick: String(saved.nick || '').trim(), code: String(saved.code || '').trim().toUpperCase() };
}

/** РЎРѕСЃС‚РѕСЏРЅРёРµ РѕС‚РїСЂР°РІРєРё РЅР° СЌРєСЂР°РЅРµ РґРёСЃС‚Р°РЅС†РёРё; РЅР° РїСЂРѕС„РёР»Рµ РµС‘ Р±РѕР»СЊС€Рµ РЅРµС‚. */
function updateSendState() {
  const button = $('detailSend');
  if (!button) return;
  // РљР°Рє РІ Android: РѕС‚РїСЂР°РІРёС‚СЊ РјРѕР¶РЅРѕ Р»СЋР±С‹Рµ РѕС‚РјРµС‚РєРё, РґР°Р¶Рµ Р±РµР· С„РёРЅРёС€Р°.
  // РЎС‚Р°С‚СѓСЃ СЂРµР·СѓР»СЊС‚Р°С‚Р° СЂРµС€РёС‚ РїСЂРѕС‚РѕРєРѕР» вЂ” DNS, DNF РёР»Рё DSQ
  button.disabled = !state.event || state.marks.length === 0;
}

async function sendResult() {
  if (state.sending) return;
  if (!state.marks.length) {
    setStatus('РћС‚РјРµС‚РѕРє РЅРµС‚: РїРѕ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё РЅРёС‡РµРіРѕ РЅРµ РѕС‚РјРµС‡РµРЅРѕ, РѕС‚РїСЂР°РІР»СЏС‚СЊ РЅРµС‡РµРіРѕ.', 'error');
    return;
  }

  const who = identity();
  if (!who.nick) {
    setStatus('РЈРєР°Р¶РёС‚Рµ РЅРёРє', 'error');
    showTab('profile');
    return;
  }
  if (who.code.length < 6) {
    setStatus('РЈРєР°Р¶РёС‚Рµ РєРѕРґ РїСЂРѕС„РёР»СЏ', 'error');
    showTab('profile');
    return;
  }
  writeJson(STORAGE.identity, who);

  // Р—Р°РїСЂРµС‚: РѕС‚РјРµС‚РєРё РЅРµ РѕС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё вЂ” РѕС‚РїСЂР°РІР»СЏС‚СЊ РЅРµР»СЊР·СЏ
  if (!marksMatchDistance()) {
    setStatus('РћС‚РјРµС‚РєРё РЅРµ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‚ СЌС‚РѕР№ РґРёСЃС‚Р°РЅС†РёРё. РћС‚РїСЂР°РІР»СЏС‚СЊ РёС… РЅРµР»СЊР·СЏ.', 'error');
    return;
  }

  const event = state.event;
  const result = buildResult(event.distance, state.marks, who);
  // РќРѕРјРµСЂ РїРѕРїС‹С‚РєРё РЅР°Р·РЅР°С‡Р°РµС‚ РЎР•Р Р’Р•Р : РєР»РёРµРЅС‚ РѕС‚РїСЂР°РІР»СЏРµС‚ СЂРµР·СѓР»СЊС‚Р°С‚ РєР°Рє РµСЃС‚СЊ

  // РўР°РєРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ РµСЃС‚СЊ: РІС‚РѕСЂРѕР№ СЂР°Р· РЅРµ Р·Р°РїРёСЃС‹РІР°РµРј Рё РЅРµ РѕС‚РїСЂР°РІР»СЏРµРј
  if ((event.distance.results || []).some((row) => sameResult(row, result))) {
    setStatus('Р­С‚РѕС‚ СЂРµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ РµСЃС‚СЊ. РџРѕРІС‚РѕСЂРЅРѕ РѕРЅ РЅРµ Р·Р°РїРёСЃР°РЅ.', 'warn');
    return;
  }

  // РџРѕРєР° Р·Р°РїСЂРѕСЃ РёРґС‘С‚, СЂРµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ СЃС‡РёС‚Р°РµС‚СЃСЏ РЅРµРѕС‚РїСЂР°РІР»РµРЅРЅС‹Рј: СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ
  // РЅРµ РґРѕР»Р¶РЅР° РІС‹Р±СЂРѕСЃРёС‚СЊ РµРіРѕ, РїРѕРєР° РѕР±Р»Р°РєРѕ РЅРµ РїРѕРґС‚РІРµСЂРґРёР»Рѕ РїСЂРёС‘Рј.
  // requestId РїРѕРІС‚РѕСЂСЏРµС‚СЃСЏ РїСЂРё РїРѕРІС‚РѕСЂРµ РёР· РѕС‡РµСЂРµРґРё, С‡С‚РѕР±С‹ СЃРµСЂРІРµСЂ РЅРµ РґРѕР±Р°РІРёР»
  // С‚РѕС‚ Р¶Рµ СЂРµР·СѓР»СЊС‚Р°С‚ РІС‚РѕСЂРѕР№ СЂР°Р· РїРѕСЃР»Рµ РїРѕС‚РµСЂСЏРЅРЅРѕРіРѕ РѕС‚РІРµС‚Р°
  const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = Object.assign({}, event.distance, { results: [result], requestId });
  queueResult(event.key, result, payload);
  state.sending = true;

  // РљР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё: СЂРµР·СѓР»СЊС‚Р°С‚ СЃРЅР°С‡Р°Р»Р° Р»РѕР¶РёС‚СЃСЏ РІ РґРёСЃС‚Р°РЅС†РёСЋ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ,
  // СЌРєСЂР°РЅС‹ РѕР±РЅРѕРІР»СЏСЋС‚СЃСЏ СЃСЂР°Р·Сѓ, Р° РѕС‚РїСЂР°РІРєР° РІ РѕР±Р»Р°РєРѕ РёРґС‘С‚ РїРѕСЃР»Рµ
  // РџСЂРµР¶РЅРёРµ СЂР°Р·РЅС‹Рµ СЂРµР·СѓР»СЊС‚Р°С‚С‹ РЅРµ СѓРґР°Р»СЏРµРј: РЅРѕРІС‹Р№ РґРѕР±Р°РІР»СЏРµС‚СЃСЏ Рє РЅРёРј,
  // Р° РїСЂР°РІРёР»Рѕ СЃРѕР±С‹С‚РёСЏ РІС‹Р±РµСЂРµС‚ РЅСѓР¶РЅРѕРµ РїСЂРё РїРѕРєР°Р·Рµ РїСЂРѕС‚РѕРєРѕР»Р°
  const results = (event.distance.results || []).slice();
  results.push(result);
  event.distance = Object.assign({}, event.distance, { results });
  writeJson(STORAGE.event, event);
  writeJson(STORAGE.event + '.' + event.id, event);
  rememberEvent(event);
  renderHome();
  renderDetail();

  setStatus('Р РµР·СѓР»СЊС‚Р°С‚ СЃРѕС…СЂР°РЅС‘РЅ, РѕС‚РїСЂР°РІР»СЏСЋвЂ¦');
  try {
    await callFunction('action=result&key=' + encodeURIComponent(event.key), payload);
    dropPendingResult(event.key, result.userId);
    setStatus('Р РµР·СѓР»СЊС‚Р°С‚ РѕС‚РїСЂР°РІР»РµРЅ', 'good');
    renderHome();
    renderDetail();
  } catch (error) {
    setStatus('Р РµР·СѓР»СЊС‚Р°С‚ СЃРѕС…СЂР°РЅС‘РЅ, РѕС‚РїСЂР°РІРёС‚СЃСЏ РїРѕР·Р¶Рµ: ' + error.message, 'error');
  } finally {
    state.sending = false;
  }
}

/** РћС‚Р»РѕР¶РµРЅРЅС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚: С…СЂР°РЅРёРј, РїРѕРєР° РѕР±Р»Р°РєРѕ РЅРµ РѕС‚РІРµС‚РёС‚. */
function queueResult(key, result, payload) {
  const list = readJson(STORAGE.pendingResults, []);
  const filtered = list.filter(
    (item) => !(item.key === key && String(item.result.userId) === String(result.userId))
  );
  filtered.push({ key, result, payload });
  writeJson(STORAGE.pendingResults, filtered);
}

/** РЈР±РёСЂР°РµС‚ СЂРµР·СѓР»СЊС‚Р°С‚ РёР· РѕС‡РµСЂРµРґРё РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕР№ РѕС‚РїСЂР°РІРєРё. */
function dropPendingResult(key, userId) {
  const list = readJson(STORAGE.pendingResults, []);
  writeJson(
    STORAGE.pendingResults,
    list.filter((item) => !(item.key === key && String(item.result.userId) === String(userId)))
  );
}

/** РџСЂРѕР±СѓРµРј РѕС‚РїСЂР°РІРёС‚СЊ РѕС‚Р»РѕР¶РµРЅРЅС‹Рµ СЂРµР·СѓР»СЊС‚Р°С‚С‹ вЂ” РїСЂРё Р·Р°РїСѓСЃРєРµ Рё РїРѕСЃР»Рµ СѓРґР°С‡РЅРѕР№ РѕС‚РїСЂР°РІРєРё. */
async function flushPendingResults() {
  if (state.sending || state.flushing) return;
  const list = readJson(STORAGE.pendingResults, []);
  if (!list.length) return;
  state.flushing = true;
  const left = [];
  for (const item of list) {
    // РЎС‚Р°СЂС‹Рµ Р·Р°РїРёСЃРё РѕС‡РµСЂРµРґРё Р±РµР· РїРѕР»РЅРѕРіРѕ С‚РµР»Р° РѕС‚РїСЂР°РІРёС‚СЊ РЅРµР»СЊР·СЏ: С„СѓРЅРєС†РёСЏ С‚СЂРµР±СѓРµС‚
    // id Рё РїРѕСЂСЏРґРѕРє РїСѓРЅРєС‚РѕРІ. Р РµР·СѓР»СЊС‚Р°С‚ СѓР¶Рµ Р»РµР¶РёС‚ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ, Рё РµРіРѕ РјРѕР¶РЅРѕ
    // РѕС‚РїСЂР°РІРёС‚СЊ РєРЅРѕРїРєРѕР№ Р·Р°РЅРѕРІРѕ вЂ” С‚Р°РєСѓСЋ Р·Р°РїРёСЃСЊ РїСЂРѕСЃС‚Рѕ СѓР±РёСЂР°РµРј РёР· РѕС‡РµСЂРµРґРё
    if (!item.payload) continue;
    try {
      await callFunction('action=result&key=' + encodeURIComponent(item.key), item.payload);
    } catch (error) {
      left.push(item);
    }
  }
  writeJson(STORAGE.pendingResults, left);
  state.flushing = false;
}

/**
 * РћР±РЅРѕРІР»СЏРµС‚ РѕС‚РєСЂС‹С‚РѕРµ СЃРѕР±С‹С‚РёРµ РёР· РѕР±Р»Р°РєР°: СЂРµР·СѓР»СЊС‚Р°С‚С‹, РїРѕР»СЏ, РїСЂРѕС‚РѕРєРѕР».
 *
 * РџСЂРѕС‚СЏР¶РєР° РЅР° СЃС‚СЂР°РЅРёС†Рµ СЃРѕР±С‹С‚РёСЏ РѕР±РЅРѕРІР»СЏРµС‚ С‚РѕР»СЊРєРѕ РµС‘, Р° РЅРµ РІРµСЃСЊ СЃРїРёСЃРѕРє.
 * Р›РѕРєР°Р»СЊРЅС‹Рµ РЅРµРѕС‚РїСЂР°РІР»РµРЅРЅС‹Рµ СЂРµР·СѓР»СЊС‚Р°С‚С‹ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ вЂ” СЌС‚Рѕ РґРµР»Р°РµС‚ mergeResults.
 */
async function refreshCurrentEvent() {
  const current = state.event;
  if (!current || state.syncing) return;
  state.syncing = true;
  setStatus('РћР±РЅРѕРІР»СЏСЋ СЃРѕР±С‹С‚РёРµвЂ¦');
  try {
    const full = await callFunction('action=get&id=' + encodeURIComponent(current.id));
    if (!full.distance) throw new Error('СЃРѕР±С‹С‚РёРµ РЅРµ РЅР°Р№РґРµРЅРѕ РІ РѕР±Р»Р°РєРµ');
    const previous = readJson(STORAGE.event + '.' + current.id, current);
    const localResults = (previous && previous.distance && previous.distance.results) || [];
    const distance = Object.assign({}, full.distance, {
      results: mergeResults(full.distance.results, localResults),
    });
    const kind = full.kind || current.kind;
    const item = {
      id: current.id,
      kind,
      key: current.key,
      distance,
      entry: entryFromCloud(current.entry || {}, full.distance, current.id, kind),
    };
    writeJson(STORAGE.event + '.' + item.id, item);
    writeJson(STORAGE.event, item);
    state.event = item;
    rememberEvent(item);
    renderDetail();
    renderHome();
    setStatus('РЎРѕР±С‹С‚РёРµ РѕР±РЅРѕРІР»РµРЅРѕ', 'good');
  } catch (error) {
    setStatus('РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СЃРѕР±С‹С‚РёРµ: ' + error.message, 'error');
  } finally {
    state.syncing = false;
  }
}

/* в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Р·Р°РїСѓСЃРє в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */

/**
 * РџСЂРѕС‚СЏРіРёРІР°РЅРёРµ РІРЅРёР· РЅР° РіР»Р°РІРЅРѕРј, РІ РѕР±Р»Р°РєРµ Рё РЅР° СЃС‚СЂР°РЅРёС†Рµ СЃРѕР±С‹С‚РёСЏ РѕР±РЅРѕРІР»СЏРµС‚ РґР°РЅРЅС‹Рµ.
 *
 * РќР° РіР»Р°РІРЅРѕРј СЌС‚Рѕ РїРѕР»РЅРѕРµ РѕР±РЅРѕРІР»РµРЅРёРµ СЃРєР°С‡Р°РЅРЅРѕРіРѕ (РєР°СЂС‚РѕС‡РєРё, СЂРµР·СѓР»СЊС‚Р°С‚С‹,
 * РїСЂРѕС‚РѕРєРѕР»С‹), РІ РѕР±Р»Р°РєРµ вЂ” РїРµСЂРµС‡РёС‚С‹РІР°РЅРёРµ РєР°С‚Р°Р»РѕРіР°. Р–РµСЃС‚ СЂР°Р±РѕС‚Р°РµС‚ С‚РѕР»СЊРєРѕ РєРѕРіРґР°
 * СЃС‚СЂР°РЅРёС†Р° РїСЂРѕРєСЂСѓС‡РµРЅР° Рє СЃР°РјРѕРјСѓ РІРµСЂС…Сѓ, С‡С‚РѕР±С‹ РЅРµ РјРµС€Р°С‚СЊ РѕР±С‹С‡РЅРѕР№ РїСЂРѕРєСЂСѓС‚РєРµ.
 */
function bindPullToRefresh() {
  const indicator = $('pullIndicator');
  const THRESHOLD = 70;

  // Р–РµСЃС‚ РІРµС€Р°РµРј РЅР° СЃР°Рј СЌРєСЂР°РЅ, Р° РЅРµ РЅР° РґРѕРєСѓРјРµРЅС‚: С‚Р°Рє РµРіРѕ РЅРµ РїРµСЂРµС…РІР°С‚С‹РІР°СЋС‚
  // РєР°СЂС‚Р° Рё РєРЅРѕРїРєРё, Рё РѕРЅ РЅРµ РєРѕРЅС„Р»РёРєС‚СѓРµС‚ СЃ РїСЂРѕРєСЂСѓС‚РєРѕР№ СЃРїРёСЃРєРѕРІ
  const screens = [$('homeScreen'), $('cloudScreen'), $('detailScreen')];

  const atTop = () => {
    const scrolled = window.scrollY
      || (document.scrollingElement && document.scrollingElement.scrollTop)
      || 0;
    return scrolled <= 0;
  };

  const refresh = (screen) => {
    // РџСЂРѕС‚СЏР¶РєР° РІРЅРёР·: РЅР° РіР»Р°РІРЅРѕРј вЂ” РїСЂРѕРІРµСЂРєР° С…СЂР°РЅРёР»РёС‰Р°, РЅР° СЌРєСЂР°РЅРµ РѕР±Р»Р°РєР° вЂ”
    // РїРµСЂРµС‡РёС‚С‹РІР°РЅРёРµ РєР°С‚Р°Р»РѕРіР°. РџСЂРѕСЃС‚Рѕ Р·Р°С…РѕРґ РЅР° РіР»Р°РІРЅС‹Р№ РЅРёС‡РµРіРѕ РЅРµ Р·Р°РїСЂР°С€РёРІР°РµС‚
    if (screen === $('homeScreen')) syncFromCloud().catch(() => {});
    else if (screen === $('detailScreen')) refreshCurrentEvent().catch(() => {});
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
      if (event.target && event.target.closest && event.target.closest('#cloudMap, #cloudMapCard')) return;
      if (event.touches.length !== 1 || !atTop()) return;
      startY = event.touches[0].clientY;
      pulled = 0;
    }, { passive: true });

    screen.addEventListener('touchmove', (event) => {
      if (event.target && event.target.closest && event.target.closest('#cloudMap, #cloudMapCard')) return;
      if (startY === null) return;
      pulled = Math.max(0, event.touches[0].clientY - startY);
      if (pulled <= 4) return;
      // РЎРІРѕР№ Р¶РµСЃС‚: РёРЅР°С‡Рµ Р±СЂР°СѓР·РµСЂ РґРµР»Р°РµС‚ В«РїРѕС‚СЏРЅСѓС‚СЊ РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏВ» СЃС‚СЂР°РЅРёС†С‹
      if (event.cancelable) event.preventDefault();
      show(pulled >= THRESHOLD ? 'РћС‚РїСѓСЃС‚РёС‚Рµ, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ' : 'РџРѕС‚СЏРЅРёС‚Рµ, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ', pulled);
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
  const arrowTurn = (bearing, heading) => {
    const screenAngle = Number(
      (window.screen && window.screen.orientation && window.screen.orientation.angle) || 0
    );
    return ((bearing - heading - screenAngle + 540) % 360) - 180;
  };
  const updateHeading = (event, absolute) => {
    // РђР±СЃРѕР»СЋС‚РЅС‹Р№ РґР°С‚С‡РёРє РїСЂРµРґРїРѕС‡С‚РёС‚РµР»СЊРЅРµРµ: РѕР±С‹С‡РЅС‹Р№ deviceorientation РЅР°
    // Android РјРѕР¶РµС‚ РѕС‚РґР°РІР°С‚СЊ РЅРµ РєРѕРјРїР°СЃ, Р° РїСЂРѕРёР·РІРѕР»СЊРЅС‹Р№ РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Р№ СѓРіРѕР».
    if (absolute) state.headingAbsolute = true;
    else if (state.headingAbsolute) return;
    const compass = Number(event.webkitCompassHeading);
    const alpha = Number(event.alpha);
    const raw = Number.isFinite(compass)
      ? compass
      : (Number.isFinite(alpha) ? (360 - alpha + 360) % 360 : null);
    if (raw === null) return;
    if (!state.headingSeen) {
      state.heading = raw;
      state.headingSeen = true;
    } else {
      // РљРѕСЂРѕС‚РєРёР№ РїСѓС‚СЊ Рё РјСЏРіРєРѕРµ СЃРіР»Р°Р¶РёРІР°РЅРёРµ: РјР°РіРЅРёС‚РЅС‹Р№ РґР°С‚С‡РёРє С€СѓРјРёС‚
      const delta = ((raw - state.heading + 540) % 360) - 180;
      state.heading = (state.heading + delta * 0.18 + 360) % 360;
    }
    const now = Date.now();
    if (state.hintBearing !== null && now - state.lastHeadingAt >= 50) {
      state.lastHeadingAt = now;
      const turn = arrowTurn(state.hintBearing, state.heading);
      $('hintArrowPointer').style.transform = `rotate(${turn}deg)`;
    }
  };
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientationabsolute', (event) => updateHeading(event, true), true);
    window.addEventListener('deviceorientation', (event) => updateHeading(event, false), true);
  }
  $('hintTarget').addEventListener('change', (event) => {
    const eventId = state.event && state.event.id;
    const value = event.target.value;
    if (eventId) {
      try {
        if (value) localStorage.setItem(hintTargetKey(eventId), value);
        else localStorage.removeItem(hintTargetKey(eventId));
      } catch (error) {
        // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
      }
    }
    renderMark();
  });
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
  $('setHints').addEventListener('change', (event) => {
    updateSetting('hints', event.target.checked);
    renderMark();
  });
  $('setAutoSend').addEventListener('change', (event) => updateSetting('autoSend', event.target.checked));
  $('setSound').addEventListener('change', (event) => updateSetting('sound', event.target.checked));
  $('setVibration').addEventListener('change', (event) => updateSetting('vibration', event.target.checked));
  $('settingsReset').addEventListener('click', () => {
    if (!window.confirm('Р’РµСЂРЅСѓС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё Рє Р·РЅР°С‡РµРЅРёСЏРј РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ?')) return;
    saveSettings(Object.assign({}, DEFAULT_SETTINGS));
    renderSettings();
    setStatus('РќР°СЃС‚СЂРѕР№РєРё СЃР±СЂРѕС€РµРЅС‹', 'good');
  });

  bindPullToRefresh();
  $('homeRefresh').addEventListener('click', () => {
    syncFromCloud().catch(() => {});
  });
  $('openCloud').addEventListener('click', openCloud);
  $('cloudRefresh').addEventListener('click', openCloud);
  const cloudMapToggle = $('cloudMapToggle');
  if (cloudMapToggle) cloudMapToggle.addEventListener('click', async () => {
    cloudMapMode = !cloudMapMode;
    cloudMapToggle.innerHTML = cloudMapMode
      ? '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="icons.svg#list"></use></svg>'
      : '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href="icons.svg#map"></use></svg>';
    cloudMapToggle.title = cloudMapMode ? 'РџРѕРєР°Р·Р°С‚СЊ СЃРїРёСЃРєРѕРј' : 'РџРѕРєР°Р·Р°С‚СЊ РєР°СЂС‚Сѓ';
    renderCloud();
  });
  $('cloudBack').addEventListener('click', () => showTab('events'));
  $('cloudSearch')?.addEventListener('input', renderCloud);
  $('cloudOnlyMine')?.addEventListener('change', renderCloud);
  $('cloudKind')?.addEventListener('change', renderCloud);
  $('cloudMark')?.addEventListener('change', renderCloud);

  $('groupBack').addEventListener('click', () => showTab('events'));
  $('participantBack').addEventListener('click', () => openDetail());
  $('participantAnalysis').addEventListener('click', openAnalysis);
  $('analysisBack').addEventListener('click', () => showTab('participant', { push: false }));
  $('protoMore').addEventListener('click', () => {
    protocolExpanded = !protocolExpanded;
    renderProtocol(state.event.distance || {});
  });
  // РќР°Р·Р°Рґ СЃ РґРёСЃС‚Р°РЅС†РёРё: РѕС‚РєСѓРґР° РїСЂРёС€Р»Рё вЂ” С‚СѓРґР° Рё РІРѕР·РІСЂР°С‰Р°РµРјСЃСЏ.
  // Р­РєСЂР°РЅ РіСЂСѓРїРїС‹ РїСЂРё РѕС‚РєСЂС‹С‚РёРё РґРёСЃС‚Р°РЅС†РёРё РїСЂСЏС‡РµС‚СЃСЏ, РїРѕСЌС‚РѕРјСѓ СЃРјРѕС‚СЂРёРј РёСЃС‚РѕСЂРёСЋ,
  // Р° РЅРµ РІРёРґРёРјРѕСЃС‚СЊ СЌРєСЂР°РЅР°
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
  // В«РћС‚РїСЂР°РІРёС‚СЊ РѕС‚РјРµС‚РєРёВ»: РµСЃР»Рё РЅРёРє Рё РєРѕРґ СѓР¶Рµ Р·Р°РґР°РЅС‹ вЂ” РѕС‚РїСЂР°РІР»СЏРµРј СЃСЂР°Р·Сѓ,
  // РёРЅР°С‡Рµ РІРµРґС‘Рј РІ РїСЂРѕС„РёР»СЊ, РіРґРµ РёС… РІРІРѕРґСЏС‚
  $('detailSend').addEventListener('click', () => {
    const who = identity();
    if (!who.nick || who.code.length < 6) {
      setStatus('РЈРєР°Р¶РёС‚Рµ РЅРёРє Рё РєРѕРґ РїСЂРѕС„РёР»СЏ', 'error');
      showTab('profile');
      return;
    }
    sendResult();
  });
  $('gpsRetry').addEventListener('click', () => {
    stopWatch();
    $('gpsRetry').classList.add('hidden');
    startWatch();
  });
  $('locationEnable').addEventListener('click', () => {
    hideLocationWarning();
    stopWatch();
    startWatch();
  });
  $('locationLater').addEventListener('click', hideLocationWarning);
  $('periodWarningOk').addEventListener('click', () => {
    $('periodWarning').classList.add('hidden');
  });

  $('bigMark').addEventListener('click', markCandidate);

  // РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РєРѕРґР° СЃ РєР°РјРµСЂС‹: В«РћС‚РјРµС‚РёС‚СЊВ» Рё В«РћС‚РјРµРЅРёС‚СЊВ», РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  $('qrMark').addEventListener('click', () => {
    const pending = state.pendingQr;
    if (!pending || !pending.code) return;
    const kind = startOrFinishOf(pending.code);
    if (settings().autoMark && !kind) {
      state.manualRefused = true;
      $('markHint').textContent = 'Р’РєР»СЋС‡РµРЅР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РѕС‚РјРµС‚РєР°: РЅР°Р¶РёРјР°С‚СЊ РЅРµ РЅСѓР¶РЅРѕ. '
        + 'Р§С‚РѕР±С‹ РѕС‚РјРµС‡Р°С‚СЊСЃСЏ РІСЂСѓС‡РЅСѓСЋ, РІС‹РєР»СЋС‡РёС‚Рµ В«РђРІС‚РѕРјР°С‚РёС‡РµСЃРєСѓСЋ РѕС‚РјРµС‚РєСѓВ» РІ РЅР°СЃС‚СЂРѕР№РєР°С….';
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

  // РђРІР°СЂРёР№РЅР°СЏ РѕС‚РјРµС‚РєР°: РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РёР»Рё РѕС‚РєР°Р·
  $('emergencyConfirm').addEventListener('click', () => {
    $('emergencyDialog').classList.add('hidden');
    state.emergencyDismissed = true;
    if (state.emergencyPoint) markByCode(String(state.emergencyPoint));
  });
  $('emergencyWait').addEventListener('click', () => {
    $('emergencyDialog').classList.add('hidden');
    state.emergencyDismissed = true;
  });

  // РџСЂРѕС„РёР»СЊ: СЂРёСЃСѓРµРј СЃРѕСЃС‚РѕСЏРЅРёРµ Рё, РµСЃР»Рё РіРѕСЃС‚СЊ, РєРЅРѕРїРєСѓ РІС…РѕРґР° Р’Рљ
  renderProfileState();
  renderVkOneTap();

  // РљРѕРґ РїРѕРґРґРµСЂР¶РєРё РЅР°Р¶РёРјР°РµС‚СЃСЏ Рё РѕС‚РєСЂС‹РІР°РµС‚ С‚Сѓ Р¶Рµ СЃС‚СЂР°РЅРёС†Сѓ, С‡С‚Рѕ Р·Р°С€РёС‚Р° РІ РєРѕРґРµ
  $('supportQr').addEventListener('click', () => {
    window.open('https://spasibomir.ru/pay/35620', '_blank', 'noopener');
  });
  $('profileChangeNick').addEventListener('click', openNickDialog);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// РЈС…РѕРґ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ (СЃРІРѕСЂР°С‡РёРІР°РЅРёРµ, РІС‹РіСЂСѓР·РєР° РІРєР»Р°РґРєРё): СЃРѕС…СЂР°РЅСЏРµРј РІСЃС‘ СЃСЂР°Р·Сѓ
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

// РЎРёСЃС‚РµРјРЅР°СЏ РєРЅРѕРїРєР° В«РЅР°Р·Р°РґВ»: РЅР° РїСЂРµРґС‹РґСѓС‰РёР№ СЌРєСЂР°РЅ
window.addEventListener('popstate', () => {
  // Р’С‹С…РѕРґ РєРЅРѕРїРєРѕР№ РёР· РїРѕР»РЅРѕРіРѕ СЌРєСЂР°РЅР°: СЌРєСЂР°РЅ РЅРµ РјРµРЅСЏРµС‚СЃСЏ
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }

  // В«РќР°Р·Р°РґВ» РІ РїРѕР»РЅРѕРј СЌРєСЂР°РЅРµ СЃРІРѕСЂР°С‡РёРІР°РµС‚ РєР°СЂС‚Сѓ Рё РѕСЃС‚Р°РІР»СЏРµС‚ С‚РѕС‚ Р¶Рµ СЌРєСЂР°РЅ
  if (mapState.fullscreen) {
    mapState.fullscreen = false;
    stopCompass();
    redrawMap();
    history.pushState({ depth: navStack.length }, '');
    return;
  }

  if (navStack.length > 1) navStack.pop();
  const previous = navStack[navStack.length - 1] || 'events';
  showTab(previous, { push: false });
});

document.addEventListener('DOMContentLoaded', async () => {
  // РЎС‚Р°СЂС‹Р№ HTML РјРѕРі РѕСЃС‚Р°С‚СЊСЃСЏ РІ РєСЌС€Рµ: РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅС‹Р№ Р·Р°РіРѕР»РѕРІРѕРє СЃРїР»РёС‚Р° СѓР±РёСЂР°РµРј
  document.querySelectorAll('.split-head').forEach((node) => node.remove());
  // РћС‚Р»РѕР¶РµРЅРЅС‹Рµ СЂРµР·СѓР»СЊС‚Р°С‚С‹: РїСЂРѕР±СѓРµРј РїСЂРё Р·Р°РїСѓСЃРєРµ, Р·Р°С‚РµРј РїРѕ С‚Р°Р№РјРµСЂСѓ Рё РїСЂРё
  // РїРѕСЏРІР»РµРЅРёРё СЃРµС‚Рё вЂ” РѕС‡РµСЂРµРґСЊ РґРѕР»Р¶РЅР° СЂР°Р·Р±РёСЂР°С‚СЊСЃСЏ СЃР°РјР°, Р±РµР· РґРµР№СЃС‚РІРёР№ С‡РµР»РѕРІРµРєР°
  flushPendingResults().catch(() => {});
  setInterval(() => flushPendingResults().catch(() => {}), 20000);
  window.addEventListener('online', () => flushPendingResults().catch(() => {}));

  // Р’РѕР·РІСЂР°С‚ РёР· Р’Рљ: РїР°СЂР°РјРµС‚СЂС‹ Р°РґСЂРµСЃР° РёР»Рё СѓР¶Рµ СЃРѕС…СЂР°РЅС‘РЅРЅС‹Р№ РїСЂРѕС„РёР»СЊ
  handleVkRedirectReturn().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshIdentityFromStorage();
  });
  bind();
  updateProfileButtons();
  registerServiceWorker();
  // Р’С‹Р±РѕСЂ РєР°СЂС‚С‹ Р·Р°РїРѕРјРёРЅР°РµС‚СЃСЏ, РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  loadMapKind();
  applySettings();

  state.history = loadHistory();
  // РђРєС‚РёРІР°С†РёСЏ Рё РѕС‚РјРµС‚РєРё РїРµСЂРµР¶РёРІР°СЋС‚ РїРµСЂРµР·Р°РїСѓСЃРє Рё РїРµСЂРµР·Р°РіСЂСѓР·РєСѓ С‚РµР»РµС„РѕРЅР°:
  // Р°РєС‚РёРІРЅРѕР№ СЃС‡РёС‚Р°РµС‚СЃСЏ РґРёСЃС‚Р°РЅС†РёСЏ РёР· STORAGE.active, РґР°Р¶Рµ РµСЃР»Рё РїРѕСЃР»РµРґРЅРµР№
  // РѕС‚РєСЂС‹РІР°Р»Рё РґСЂСѓРіСѓСЋ
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

  // РЎРѕС…СЂР°РЅС‘РЅРЅСѓСЋ РєРѕРїРёСЋ РїРѕРґРЅРёРјР°РµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё СЃРѕР±С‹С‚РёРµ РµСЃС‚СЊ РІ СЃРїРёСЃРєРµ СЃРєР°С‡Р°РЅРЅС‹С…
  const downloaded = (state.history || []).some((item) => saved && item.id === saved.id);
  if (saved && saved.distance && downloaded) {
    state.event = saved;
    state.marks = loadMarks(saved.id);
    updateSendState();
  } else if (saved && saved.distance) {
    // Р—Р°РїРёСЃСЊ РѕСЃС‚Р°Р»Р°СЃСЊ РѕС‚ СѓРґР°Р»С‘РЅРЅРѕР№ РіСЂСѓРїРїС‹: СѓР±РёСЂР°РµРј, С‡С‚РѕР±С‹ РЅРµ РІСЃРїР»С‹РІР°Р»Р° РЅР° РіР»Р°РІРЅРѕРј
    try {
      localStorage.removeItem(STORAGE.event);
    } catch (error) {
      // РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј
    }
  }
  // В«РћС‚РєСЂС‹РІР°С‚СЊ СЌРєСЂР°РЅ РѕС‚РјРµС‚РєРё РїСЂРё Р·Р°РїСѓСЃРєРµВ» вЂ” РєР°Рє РІ РїСЂРёР»РѕР¶РµРЅРёРё
  const activeRestored = saved && saved.distance && state.activeId === saved.id;

  // РџСЂРё РѕС‚РєСЂС‹С‚РёРё РІСЃРµРіРґР° РіР»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ. РСЃРєР»СЋС‡РµРЅРёРµ вЂ” РЅР°СЃС‚СЂРѕР№РєР° В«РѕС‚РєСЂС‹РІР°С‚СЊ
  // СЌРєСЂР°РЅ РѕС‚РјРµС‚РєРё РїСЂРё Р·Р°РїСѓСЃРєРµВ», Рё С‚РѕР»СЊРєРѕ РµСЃР»Рё РґРёСЃС‚Р°РЅС†РёСЏ Р°РєС‚РёРІРЅР°
  const first = activeRestored && settings().showOnStart ? 'mark' : 'events';

  // РџРѕРґ С‚РµРєСѓС‰РёРј СЌРєСЂР°РЅРѕРј РІСЃРµРіРґР° Р»РµР¶РёС‚ РіР»Р°РІРЅС‹Р№: В«РЅР°Р·Р°РґВ» РёР· СЃРѕР±С‹С‚РёСЏ РІРµРґС‘С‚
  // РЅР° СЃРїРёСЃРѕРє СЃРѕР±С‹С‚РёР№, Р° РЅРµ Р·Р°РєСЂС‹РІР°РµС‚ РїСЂРёР»РѕР¶РµРЅРёРµ
  navStack = ['events'];
  history.replaceState({ depth: 1 }, '');

  showTab(first, { push: first !== 'events' });

  // РџСЂРѕРІРµСЂРєР° С…СЂР°РЅРёР»РёС‰Р° РїСЂРё СЃС‚Р°СЂС‚Рµ РїСЂРёР»РѕР¶РµРЅРёСЏ: РѕРґРёРЅ СЂР°Р· Р·Р° Р·Р°РїСѓСЃРє.
  // РџСЂРё РєР°Р¶РґРѕРј РІРѕР·РІСЂР°С‚Рµ РЅР° РіР»Р°РІРЅС‹Р№ РµС‘ РЅРµС‚ вЂ” С‚РѕР»СЊРєРѕ РєРЅРѕРїРєР° Рё РїСЂРѕС‚СЏР¶РєР°
  syncFromCloud().catch(() => {});
});

