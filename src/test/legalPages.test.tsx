import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsPage from '@/pages/TermsPage';
import RefundPolicy from '@/pages/RefundPolicy';
import { POLICY, SITE } from '@/config/site';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isStaff: false, rolesLoaded: true }),
}));
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggle: async () => ({ requiresAuth: true }) }),
}));

const pages: [string, ComponentType, string][] = [
  ['Privacy Policy', PrivacyPolicy, 'What we collect'],
  ['Terms & Conditions', TermsPage, 'Appointments & bookings'],
  ['Refund & Cancellation', RefundPolicy, 'Cancelling or rescheduling'],
];

describe('legal pages', () => {
  it.each(pages)('%s renders its heading, contents and contact details', (title, Page, firstSection) => {
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(firstSection) })).toHaveAttribute('href', expect.stringMatching(/^#/));
    expect(screen.getAllByRole('link', { name: SITE.email }).length).toBeGreaterThan(0);
    expect(document.title).toContain(title);
  }, 20000); // first render pulls in the whole public layout

  it('quotes the notice period from config', () => {
    render(<MemoryRouter><RefundPolicy /></MemoryRouter>);
    expect(screen.getAllByText(new RegExp(`${POLICY.cancelNoticeHours} hours`)).length).toBeGreaterThan(0);
  });

  it('links all three policies from the footer', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>);
    const footerNav = screen.getByRole('navigation', { name: 'Legal' });
    for (const href of ['/privacy', '/terms', '/refund-policy']) {
      expect(footerNav.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });
});
