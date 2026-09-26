import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouteMeta from '@/components/RouteMeta';
import { PUBLIC_ROUTES, SITE_URL } from '@/config/seo';

const head = (selector: string, attr = 'content') => document.head.querySelector(selector)?.getAttribute(attr);

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><RouteMeta /></MemoryRouter>);

describe('RouteMeta', () => {
  it('sets description, canonical and share tags for a public page', () => {
    at('/packages');
    expect(head('meta[name="description"]')).toBe(PUBLIC_ROUTES['/packages'].description);
    expect(head('meta[property="og:title"]')).toBe(PUBLIC_ROUTES['/packages'].title);
    expect(head('link[rel="canonical"]', 'href')).toBe(`${SITE_URL}/packages`);
    expect(head('meta[name="robots"]')).toBe('index, follow');
  });

  it('keeps signed-in areas out of search results', () => {
    at('/admin/bookings');
    expect(head('meta[name="robots"]')).toBe('noindex, nofollow');
    at('/account');
    expect(head('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('falls back to the site defaults for detail pages', () => {
    at('/services/abc/');
    expect(head('link[rel="canonical"]', 'href')).toBe(`${SITE_URL}/services/abc`);
    expect(head('meta[name="description"]')).toBe(PUBLIC_ROUTES['/'].description);
  });
});
