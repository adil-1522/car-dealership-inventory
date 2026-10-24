import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { buyer, mockApi, renderWithProviders, USER_KEY } from '../test/utils';
import { TOKEN_KEY } from '../api/client';

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<h1>Showroom</h1>} />
    </Routes>,
    { route },
  );
}

describe('LoginPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('logs in, stores the session and goes to the showroom', async () => {
    const fetchMock = mockApi({ 'POST /auth/login': () => [200, { token: 'jwt-123', user: buyer }] });
    renderAt('/login');

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Showroom' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(buyer);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      email: 'jane@example.com',
      password: 'Secret123',
    });
  });

  it('shows the error returned by the server', async () => {
    mockApi({ 'POST /auth/login': () => [401, { error: 'Invalid email or password' }] });
    renderAt('/login');

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('links to registration', () => {
    renderAt('/login');

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register');
  });
});

describe('RegisterPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('registers and signs the user in', async () => {
    const fetchMock = mockApi({ 'POST /auth/register': () => [201, { token: 'jwt-new', user: buyer }] });
    renderAt('/register');

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Buyer');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Secret123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('heading', { name: 'Showroom' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-new');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      name: 'Jane Buyer',
      email: 'jane@example.com',
      password: 'Secret123',
    });
  });

  it('blocks submission when passwords do not match', async () => {
    const fetchMock = mockApi({});
    renderAt('/register');

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Secret123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
