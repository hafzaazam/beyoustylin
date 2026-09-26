export const formatPKR = (amount: number) =>
  `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

export const formatDateTime = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/** Value for an <input type="datetime-local"> in the browser's local time. */
export const toLocalInputValue = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** YYYY-MM-DD for a Date in local time. */
export const toLocalDateKey = (date: Date) => toLocalInputValue(date).slice(0, 10);

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
