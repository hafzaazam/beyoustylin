import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ServicesPublic from '@/pages/ServicesPublic';
import PackagesPublic from '@/pages/PackagesPublic';
import ServiceDetail from '@/pages/ServiceDetail';
import StudioHeader from '@/components/layout/StudioHeader';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isStaff: false, rolesLoaded: true }) }));
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ isFavorite: () => false, toggle: async () => ({ requiresAuth: true }) }) }));
vi.mock('@/components/PromoPopup', () => ({ default: () => null }));
vi.mock('@/context/SalonContext', () => ({ useSalon: () => ({
  loading: false,
  services: [
    { id: 'cut', name: 'Signature haircut', category: 'Hair', price: 2000, duration: 30, status: 'active' },
    { id: 'facial', name: 'Hydra facial', category: 'Skin', price: 6000, duration: 60, status: 'active' },
    { id: 'hidden', name: 'Retired service', category: 'Hair', price: 1000, duration: 30, status: 'disabled' },
  ],
  deals: [{ id: 'glow', name: 'Glow package', serviceIds: ['cut', 'facial'], discountedPrice: 7000, totalDuration: 90, status: 'active' }],
}) }));
beforeEach(() => { window.scrollTo = vi.fn(); });

describe('public studio journeys', () => {
  it('filters the live menu and preserves booking selection links', () => {
    render(<MemoryRouter><ServicesPublic /></MemoryRouter>);
    expect(screen.queryByText('Retired service')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search services' }), { target: { value: 'haircut' } });
    expect(screen.getByRole('link', { name: 'Signature haircut' })).toHaveAttribute('href', '/services/cut');
    expect(screen.queryByText('Hydra facial')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/?service=cut#book"]')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search services' }), { target: { value: 'unmatched' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('link', { name: 'Hydra facial' })).toBeInTheDocument();
  });
  it('shows package inclusions, savings, and the correct booking destination', () => {
    render(<MemoryRouter><PackagesPublic /></MemoryRouter>);
    expect(screen.getByText('Signature haircut')).toBeInTheDocument();
    expect(screen.getByText(/Save Rs\. 1,000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book this package' })).toHaveAttribute('href', '/?deal=glow#book');
  });
  it('renders a populated service detail and its booking action', () => {
    render(<MemoryRouter initialEntries={['/services/cut']}><Routes><Route path="/services/:id" element={<ServiceDetail />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Signature haircut' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book this service' })).toHaveAttribute('href', '/?service=cut#book');
  });
  it('resets scroll on page navigation, while leaving section navigation intact', () => {
    render(<MemoryRouter initialEntries={['/#book']}><StudioHeader /></MemoryRouter>);
    expect(window.scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Services' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });
});
