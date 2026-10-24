import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { TOKEN_KEY } from '../api/client';
import type { User } from '../types';

export const USER_KEY = 'dealership.user';

/** Simulates a logged-in session by seeding localStorage before render. */
export function loginAs(user: User) {
  localStorage.setItem(TOKEN_KEY, 'test-token');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const buyer: User = { id: 2, name: 'Jane Buyer', email: 'jane@example.com', role: 'user' };
export const admin: User = { id: 1, name: 'Ada Admin', email: 'admin@example.com', role: 'admin' };

export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

/** Routes fetch calls to handlers keyed by "METHOD /path" (query string ignored). */
export function mockApi(handlers: Record<string, (body: unknown, url: string) => [number, unknown?]>) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^\/api/, '').split('?')[0];
    const handler = handlers[`${method} ${path}`];
    if (!handler) throw new Error(`Unhandled request: ${method} ${url}`);
    const [status, body] = handler(init.body ? JSON.parse(init.body as string) : undefined, url);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
