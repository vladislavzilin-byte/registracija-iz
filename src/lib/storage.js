const LS_USERS = 'iz.users.v7';
const LS_BOOKINGS = 'iz.bookings.v7';
const LS_CURRENT = 'iz.current.v7';
const LS_SETTINGS = 'iz.settings.v7';
const LS_LANG = 'iz.lang.v7';

const DEFAULT_USERS = [
  {
    name: 'Vladislav Zilin',
    phone: '+37060000000',
    email: 'vladislavzilin@gmail.com',
    password: 'vladiokas',
    instagram: 'vladislav.zilin',
  },
];

export function getUsers() {
  const u = JSON.parse(localStorage.getItem(LS_USERS) || 'null');
  if (!u) {
    localStorage.setItem(LS_USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return u;
}

export function saveUsers(u) {
  localStorage.setItem(LS_USERS, JSON.stringify(u));
}

export function getCurrentUser() {
  return JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
}

export function setCurrentUser(u) {
  if (u) localStorage.setItem(LS_CURRENT, JSON.stringify(u));
  else localStorage.removeItem(LS_CURRENT);
}

export function getBookings() {
  return JSON.parse(localStorage.getItem(LS_BOOKINGS) || '[]');
}

export function saveBookings(b) {
  localStorage.setItem(LS_BOOKINGS, JSON.stringify(b));
}

export function getSettings() {
  const def = {
    masterName: 'IZ HAIR TREND',
    slotMinutes: 60,
    workDays: [0, 1, 2, 3, 4, 5, 6],
    workStart: '04:00',
    workEnd: '20:00',
    blockedDates: [],
    adminPhone: '+37060000000',
  };
  return JSON.parse(localStorage.getItem(LS_SETTINGS) || 'null') || def;
}

export function saveSettings(s) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

export function id() {
  return crypto.randomUUID();
}

export function isSameMinute(a, b) {
  return (
    new Date(a).toISOString().slice(0, 16) ===
    new Date(b).toISOString().slice(0, 16)
  );
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/* ==========
   FIXED: 24-HOUR FORMAT
   ========== */
export function fmtTime(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/* === language === */
export function getLang() {
  return localStorage.getItem(LS_LANG) || 'ru';
}

export function setLang(l) {
  localStorage.setItem(LS_LANG, l);
}
