// utils.js — small shared helpers
export const uid = () => 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateStr(d);
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(s, opts) {
  if (!s) return '';
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' });
}

export function daysBetween(a, b) {
  const da = parseDate(a), db = parseDate(b);
  return Math.round((db - da) / 86400000);
}

export function daysUntil(dateStr) {
  return daysBetween(todayStr(), dateStr);
}

export function dowIndex(dateStr) {
  return parseDate(dateStr).getDay(); // 0 Sun .. 6 Sat
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function pct(current, target) {
  if (!target || target <= 0) return 0;
  return clamp(Math.round((current / target) * 100), 0, 100);
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-US');
}

export function startOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return toDateStr(d);
}

export function isoWeekRange(dateStr) {
  const start = startOfWeek(dateStr);
  const s = parseDate(start);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    dates.push(toDateStr(d));
  }
  return dates;
}

export function monthRange(year, month) {
  // month 0-indexed; returns array of date strings for that month
  const dates = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function simpleHash(str) {
  // NOT cryptographically secure — fine only because this app has no real backend.
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36) + str.length;
}

export function priorityLabel(p) {
  return { low: 'Low', medium: 'Medium', high: 'High' }[p] || 'Medium';
}

export function priorityRank(p) {
  return { high: 0, medium: 1, low: 2 }[p] ?? 1;
}
