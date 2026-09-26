import { useEffect } from 'react';
import { SITE } from '@/config/site';

/** Sets the browser tab title, e.g. "Bookings · BeYou Stylin". */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  }, [title]);
};
