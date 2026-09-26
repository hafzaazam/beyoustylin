export type CsvCell = string | number | null | undefined;

const escapeCell = (value: CsvCell) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (header: string[], rows: CsvCell[][]) =>
  [header, ...rows].map(r => r.map(escapeCell).join(',')).join('\n');

export const downloadCsv = (filename: string, csv: string) => {
  // BOM so Excel opens UTF-8 (e.g. names in Urdu) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
