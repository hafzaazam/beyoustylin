import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_OG_IMAGE, DEFAULT_SEO, NOINDEX_PREFIXES, PUBLIC_ROUTES, SITE_URL } from '@/config/seo';

/** Finds or creates a <meta>/<link> tag in <head> and sets one attribute on it. */
const setTag = (selector: string, create: () => HTMLElement, attr: string, value: string) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const meta = (key: 'name' | 'property', id: string, content: string) =>
  setTag(`meta[${key}="${id}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(key, id);
    return m;
  }, 'content', content);

/**
 * Keeps description, canonical, robots and share tags in step with the route.
 * The tab title itself is still owned by usePageTitle on each page.
 */
const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
    const seo = PUBLIC_ROUTES[path] ?? DEFAULT_SEO;
    const url = `${SITE_URL}${path === '/' ? '/' : path}`;
    const noindex = NOINDEX_PREFIXES.some(p => path === p || path.startsWith(`${p}/`));

    meta('name', 'description', seo.description);
    meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    meta('property', 'og:title', seo.title);
    meta('property', 'og:description', seo.description);
    meta('property', 'og:url', url);
    meta('property', 'og:image', `${SITE_URL}${DEFAULT_OG_IMAGE}`);
    meta('name', 'twitter:title', seo.title);
    meta('name', 'twitter:description', seo.description);
    meta('name', 'twitter:image', `${SITE_URL}${DEFAULT_OG_IMAGE}`);
    setTag('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }, 'href', url);
  }, [pathname]);

  return null;
};

export default RouteMeta;
