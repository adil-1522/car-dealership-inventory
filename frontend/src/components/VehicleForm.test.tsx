import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleForm } from './VehicleForm';

describe('VehicleForm', () => {
  it('submits a new vehicle with numeric fields converted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<VehicleForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^make/i), 'Honda');
    await userEvent.type(screen.getByLabelText(/^model/i), 'Civic');
    await userEvent.type(screen.getByLabelText(/^category/i), 'Sedan');
    await userEvent.type(screen.getByLabelText(/^price/i), '24000');
    await userEvent.type(screen.getByLabelText(/^quantity/i), '3');
    await userEvent.type(screen.getByLabelText(/^year/i), '2024');
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      make: 'Honda',
      model: 'Civic',
      category: 'Sedan',
      price: 24000,
      quantity: 3,
      year: 2024,
      imageUrl: null,
      description: null,
    });
  });

  it('pre-fills fields when editing and labels the button accordingly', () => {
    render(
      <VehicleForm
        initial={{
          id: 1,
          make: 'Ford',
          model: 'F-150',
          category: 'Truck',
          price: 45000,
          quantity: 2,
          year: null,
          imageUrl: null,
          description: null,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^make/i)).toHaveValue('Ford');
    expect(screen.getByLabelText(/^price/i)).toHaveValue(45000);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    const onSubmit = vi.fn();
    render(<VehicleForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/make is required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server error when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Price cannot be negative'));
    render(<VehicleForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^make/i), 'A');
    await userEvent.type(screen.getByLabelText(/^model/i), 'B');
    await userEvent.type(screen.getByLabelText(/^category/i), 'C');
    await userEvent.type(screen.getByLabelText(/^price/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Price cannot be negative');
  });
});
