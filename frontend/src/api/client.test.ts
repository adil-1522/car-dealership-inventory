import { ApiError, apiRequest, TOKEN_KEY } from './client';

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('apiRequest', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends JSON and returns the parsed response', async () => {
    const fetchMock = mockFetch(200, { ok: true });

    const result = await apiRequest('/vehicles', { method: 'POST', body: { a: 1 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/vehicles');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('attaches the stored token as a Bearer header', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    const fetchMock = mockFetch(200, []);

    await apiRequest('/vehicles');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('omits the Authorization header when logged out', async () => {
    const fetchMock = mockFetch(200, []);

    await apiRequest('/vehicles');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetch(204);

    await expect(apiRequest('/vehicles/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws an ApiError carrying the server message and status', async () => {
    mockFetch(409, { error: 'Camry is out of stock' });

    const error: unknown = await apiRequest('/vehicles/1/purchase', { method: 'POST' }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).message).toBe('Camry is out of stock');
  });

  it('notifies listeners on 401 so the app can log out', async () => {
    mockFetch(401, { error: 'Invalid or expired token' });
    const onUnauthorized = vi.fn();
    window.addEventListener('auth:unauthorized', onUnauthorized);

    await apiRequest('/vehicles').catch(() => undefined);

    expect(onUnauthorized).toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', onUnauthorized);
  });
});
