import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleCard } from './VehicleCard';
import type { Vehicle } from '../types';

const vehicle: Vehicle = {
  id: 7,
  make: 'Toyota',
  model: 'Camry',
  category: 'Sedan',
  price: 27500,
  quantity: 4,
  year: 2024,
  imageUrl: null,
  description: 'Reliable family sedan',
};

function renderCard(overrides: Partial<Vehicle> = {}, props: Partial<Parameters<typeof VehicleCard>[0]> = {}) {
  const handlers = { onPurchase: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onRestock: vi.fn() };
  render(<VehicleCard vehicle={{ ...vehicle, ...overrides }} isAdmin={false} {...handlers} {...props} />);
  return handlers;
}

describe('VehicleCard', () => {
  it('shows the vehicle details', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: /toyota camry/i })).toBeInTheDocument();
    expect(screen.getByText('$27,500')).toBeInTheDocument();
    expect(screen.getByText('Sedan')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('4 in stock')).toBeInTheDocument();
  });

  it('calls onPurchase with the vehicle when Purchase is clicked', async () => {
    const { onPurchase } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: /purchase/i }));

    expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('disables the Purchase button when the quantity is zero', () => {
    renderCard({ quantity: 0 });

    expect(screen.getByRole('button', { name: /sold out/i })).toBeDisabled();
  });

  it('disables the Purchase button while a purchase is in progress', () => {
    renderCard({}, { busy: true });

    expect(screen.getByRole('button', { name: /purchas/i })).toBeDisabled();
  });

  it('hides admin controls from regular users', () => {
    renderCard();

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restock/i })).not.toBeInTheDocument();
  });

  it('shows working admin controls to admins', async () => {
    const { onEdit, onDelete, onRestock } = renderCard({}, { isAdmin: true });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /restock/i }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(onRestock).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });
});
