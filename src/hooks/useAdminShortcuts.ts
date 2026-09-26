import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Keys shown in the shortcuts dialog. Keep in sync with the handler below. */
export const ADMIN_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['N'], label: 'New booking' },
  { keys: ['W'], label: 'Walk-in' },
  { keys: ['/'], label: 'Search this page' },
  { keys: ['G', 'S'], label: 'Go to schedule' },
  { keys: ['G', 'B'], label: 'Go to bookings' },
  { keys: ['G', 'P'], label: 'Go to point of sale' },
  { keys: ['G', 'I'], label: 'Go to invoices' },
  { keys: ['?'], label: 'Show these shortcuts' },
];

const GO_TO: Record<string, string> = {
  s: '/admin/schedule',
  b: '/admin/bookings',
  p: '/admin/pos',
  i: '/admin/invoices',
};

const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // Radix comboboxes, listboxes and menus handle their own keys.
  return !!target.closest('[role="combobox"], [role="listbox"], [role="menu"], [role="dialog"] [cmdk-input]');
};

const focusSearch = () => {
  const el = document.querySelector<HTMLInputElement>('[data-shortcut="search"]');
  if (!el) return false;
  el.focus();
  el.select();
  return true;
};

/**
 * Front-desk keyboard shortcuts for every admin page.
 * Letters are ignored while typing or when a modifier is held; ⌘/Ctrl+K focuses search.
 */
export const useAdminShortcuts = () => {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (focusSearch()) e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      // Leave keys alone while any modal dialog is open (except our own help dialog).
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') && e.key !== 'Escape') return;

      const key = e.key.toLowerCase();

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const path = GO_TO[key];
        if (path) { e.preventDefault(); navigate(path); }
        return;
      }

      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key === '/') { if (focusSearch()) e.preventDefault(); return; }
      if (key === 'n') { e.preventDefault(); navigate('/admin/bookings?new=1'); return; }
      if (key === 'w') { e.preventDefault(); navigate('/admin/bookings?new=walkin'); return; }
      if (key === 'g') {
        e.preventDefault();
        pendingG.current = window.setTimeout(() => { pendingG.current = null; }, 1200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (pendingG.current !== null) window.clearTimeout(pendingG.current);
    };
  }, [navigate]);

  return { helpOpen, setHelpOpen };
};
