import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PromoPopup from '@/components/PromoPopup';
import Reveal from '@/components/Reveal';
import { PROMO } from '@/config/promo';

const auth = { isStaff: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const at = (path = '/') => render(<MemoryRouter initialEntries={[path]}><PromoPopup /></MemoryRouter>);

describe('PromoPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    auth.isStaff = false;
  });
  afterEach(() => vi.useRealTimers());

  it('opens after the delay and stays closed once dismissed', () => {
    const { unmount } = at();
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => { vi.advanceTimersByTime(PROMO.delayMs); });
    expect(screen.getByRole('dialog', { name: PROMO.title })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /maybe later/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    at();
    act(() => { vi.advanceTimersByTime(PROMO.delayMs * 2); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('never shows to staff or on excluded pages', () => {
    auth.isStaff = true;
    const { unmount } = at();
    act(() => { vi.advanceTimersByTime(PROMO.delayMs); });
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    auth.isStaff = false;
    at('/privacy');
    act(() => { vi.advanceTimersByTime(PROMO.delayMs); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Reveal', () => {
  it('renders content visibly when IntersectionObserver is unavailable', () => {
    render(<Reveal><p>Hello</p></Reveal>);
    expect(screen.getByText('Hello').parentElement).toHaveClass('opacity-100');
  });
});
