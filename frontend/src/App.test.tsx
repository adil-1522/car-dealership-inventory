import { screen } from '@testing-library/react';
import { App } from './App';
import { buyer, loginAs, mockApi, renderWithProviders } from './test/utils';

describe('App routing', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('redirects guests from the dashboard to login', () => {
    renderWithProviders(<App />, { route: '/' });

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('redirects signed-in users away from the login page', async () => {
    loginAs(buyer);
    mockApi({ 'GET /vehicles': () => [200, []] });
    renderWithProviders(<App />, { route: '/login' });

    expect(await screen.findByRole('heading', { name: /vehicle inventory/i })).toBeInTheDocument();
  });

  it('sends unknown routes home', () => {
    renderWithProviders(<App />, { route: '/nowhere' });

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
