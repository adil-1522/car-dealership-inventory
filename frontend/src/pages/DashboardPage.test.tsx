import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from './DashboardPage';
import { admin, buyer, loginAs, mockApi, renderWithProviders } from '../test/utils';
import type { Vehicle } from '../types';

const camry: Vehicle = {
  id: 1, make: 'Toyota', model: 'Camry', category: 'Sedan', price: 27500, quantity: 2,
  year: 2024, imageUrl: null, description: null,
};
const wrangler: Vehicle = {
  id: 2, make: 'Jeep', model: 'Wrangler', category: 'SUV', price: 38900, quantity: 0,
  year: 2023, imageUrl: null, description: null,
};

const card = (name: RegExp) => screen.getByRole('heading', { name }).closest('article') as HTMLElement;

describe('DashboardPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists all vehicles with inventory stats', async () => {
    loginAs(buyer);
    mockApi({ 'GET /vehicles': () => [200, [camry, wrangler]] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: /toyota camry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /jeep wrangler/i })).toBeInTheDocument();
    expect(screen.getByText('2 models')).toBeInTheDocument();
    expect(screen.getByText('1 sold out')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    loginAs(buyer);
    mockApi({ 'GET /vehicles': () => [200, []] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/no vehicles found/i)).toBeInTheDocument();
  });

  it('shows an error when vehicles cannot be loaded', async () => {
    loginAs(buyer);
    mockApi({ 'GET /vehicles': () => [500, { error: 'Internal server error' }] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/internal server error/i);
  });

  it('searches with the chosen filters', async () => {
    loginAs(buyer);
    const fetchMock = mockApi({
      'GET /vehicles': () => [200, [camry, wrangler]],
      'GET /vehicles/search': () => [200, [wrangler]],
    });
    renderWithProviders(<DashboardPage />);
    await screen.findByRole('heading', { name: /toyota camry/i });

    await userEvent.type(screen.getByLabelText(/make/i), 'jeep');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: /toyota camry/i })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('/api/vehicles/search?make=jeep');
  });

  it('purchases a vehicle and updates its stock in place', async () => {
    loginAs(buyer);
    mockApi({
      'GET /vehicles': () => [200, [camry]],
      'POST /vehicles/1/purchase': () => [200, { ...camry, quantity: 1 }],
    });
    renderWithProviders(<DashboardPage />);
    await screen.findByRole('heading', { name: /toyota camry/i });

    await userEvent.click(within(card(/toyota camry/i)).getByRole('button', { name: /purchase/i }));

    expect(await within(card(/toyota camry/i)).findByText('Only 1 left')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/purchased toyota camry/i);
  });

  it('surfaces a purchase failure', async () => {
    loginAs(buyer);
    mockApi({
      'GET /vehicles': () => [200, [camry]],
      'POST /vehicles/1/purchase': () => [409, { error: 'Toyota Camry is out of stock' }],
    });
    renderWithProviders(<DashboardPage />);
    await screen.findByRole('heading', { name: /toyota camry/i });

    await userEvent.click(within(card(/toyota camry/i)).getByRole('button', { name: /purchase/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/out of stock/i);
  });

  it('hides the Add vehicle button from regular users', async () => {
    loginAs(buyer);
    mockApi({ 'GET /vehicles': () => [200, [camry]] });
    renderWithProviders(<DashboardPage />);
    await screen.findByRole('heading', { name: /toyota camry/i });

    expect(screen.queryByRole('button', { name: /add vehicle/i })).not.toBeInTheDocument();
  });

  describe('as an admin', () => {
    it('adds a new vehicle through the form', async () => {
      loginAs(admin);
      const civic = { ...camry, id: 3, make: 'Honda', model: 'Civic' };
      mockApi({
        'GET /vehicles': () => [200, [camry]],
        'POST /vehicles': () => [201, civic],
      });
      renderWithProviders(<DashboardPage />);
      await screen.findByRole('heading', { name: /toyota camry/i });

      await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));
      const dialog = screen.getByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^make/i), 'Honda');
      await userEvent.type(within(dialog).getByLabelText(/^model/i), 'Civic');
      await userEvent.type(within(dialog).getByLabelText(/^category/i), 'Sedan');
      await userEvent.type(within(dialog).getByLabelText(/^price/i), '24000');
      await userEvent.click(within(dialog).getByRole('button', { name: /add vehicle/i }));

      expect(await screen.findByRole('heading', { name: /honda civic/i })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('edits a vehicle', async () => {
      loginAs(admin);
      mockApi({
        'GET /vehicles': () => [200, [camry]],
        'PUT /vehicles/1': (body) => [200, { ...camry, ...(body as object) }],
      });
      renderWithProviders(<DashboardPage />);
      await screen.findByRole('heading', { name: /toyota camry/i });

      await userEvent.click(within(card(/toyota camry/i)).getByRole('button', { name: /edit/i }));
      const modelInput = within(screen.getByRole('dialog')).getByLabelText(/^model/i);
      await userEvent.clear(modelInput);
      await userEvent.type(modelInput, 'Camry XSE');
      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByRole('heading', { name: /toyota camry xse/i })).toBeInTheDocument();
    });

    it('deletes a vehicle after confirmation', async () => {
      loginAs(admin);
      mockApi({
        'GET /vehicles': () => [200, [camry, wrangler]],
        'DELETE /vehicles/1': () => [204],
      });
      renderWithProviders(<DashboardPage />);
      await screen.findByRole('heading', { name: /toyota camry/i });

      await userEvent.click(within(card(/toyota camry/i)).getByRole('button', { name: /delete/i }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }));

      await waitFor(() => expect(screen.queryByRole('heading', { name: /toyota camry/i })).not.toBeInTheDocument());
      expect(screen.getByRole('heading', { name: /jeep wrangler/i })).toBeInTheDocument();
    });

    it('restocks a sold-out vehicle so it can be purchased again', async () => {
      loginAs(admin);
      mockApi({
        'GET /vehicles': () => [200, [wrangler]],
        'POST /vehicles/2/restock': (body) => [200, { ...wrangler, quantity: (body as { quantity: number }).quantity }],
      });
      renderWithProviders(<DashboardPage />);
      await screen.findByRole('heading', { name: /jeep wrangler/i });

      await userEvent.click(within(card(/jeep wrangler/i)).getByRole('button', { name: /restock/i }));
      const dialog = screen.getByRole('dialog');
      await userEvent.clear(within(dialog).getByLabelText(/units to add/i));
      await userEvent.type(within(dialog).getByLabelText(/units to add/i), '4');
      await userEvent.click(within(dialog).getByRole('button', { name: /^restock$/i }));

      expect(await within(card(/jeep wrangler/i)).findByText('4 in stock')).toBeInTheDocument();
      expect(within(card(/jeep wrangler/i)).getByRole('button', { name: /purchase/i })).toBeEnabled();
    });
  });
});
