# End-to-end walkthrough

How the system fits together, written so you can explain any part of it out loud. Read it top to
bottom once; after that the [Interview prep](#interview-prep) section at the end is the cheat sheet.

---

## 1. The big picture

Two applications talk over HTTP:

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  frontend/  React SPA       │        │  backend/  Express REST API      │
│  Vite · Tailwind · Router   │ ─────► │  TypeScript · SQLite · JWT       │
│  localhost:5173             │  /api  │  localhost:4000                  │
└─────────────────────────────┘        └──────────────────────────────────┘
```

In development, Vite's dev server proxies anything starting with `/api` to port 4000
(`frontend/vite.config.ts`). The browser therefore only ever talks to its own origin, so there are
no CORS problems and no hardcoded backend URL in the frontend code.

The backend is layered. Each layer only knows about the one below it:

| Layer          | Folder                   | Responsibility                      | Knows about        |
| -------------- | ------------------------ | ----------------------------------- | ------------------ |
| **Routes**     | `src/routes/`            | HTTP: read request, send response   | Express, services  |
| **Middleware** | `src/middleware/`        | Auth, validation, error translation | Express            |
| **Services**   | `src/services/`          | Business rules                      | Repositories       |
| **Repositories** | `src/repositories/`    | SQL                                 | The database       |
| **Validation** | `src/validation/`        | Shape of incoming data (zod)        | Nothing            |

Why it matters: the service layer can be tested without HTTP, the repository is the only file that
would change if you swapped SQLite for Postgres, and routes stay four lines long.

---

## 2. Starting up

`backend/src/server.ts` runs in this order:

1. `process.loadEnvFile()` — loads `.env` if present (Node 22 built-in, no dotenv dependency).
2. `loadConfig()` (`src/config.ts`) — turns environment variables into a typed `Config` object.
   In production it **throws** if `JWT_SECRET` is missing, so you can never ship with the dev key.
3. `createDatabase(path)` (`src/db/database.ts`) — opens the SQLite file and runs
   `CREATE TABLE IF NOT EXISTS` for `users` and `vehicles`. Idempotent, so it is safe on every boot.
4. `authService.ensureAdmin(...)` — creates the admin account if it does not already exist.
5. `createApp({ db, jwtSecret, … })` — the **composition root**: the one place where repositories,
   services and routes are constructed and wired together.
6. `app.listen(port)`.

Dependency injection matters here. `createApp` takes the database as an *argument*. Tests call
`createApp({ db: createDatabase(':memory:'), … })` and get a completely isolated application —
that's why tests can run without mocks and without clearing tables between runs.

---

## 3. Request 1 — registering

**User action:** fills the registration form and clicks *Create account*.

### Frontend path

1. `pages/RegisterPage.tsx` — checks the two passwords match locally (a server round-trip for a
   typo would be wasteful) and calls `register()` from the auth context.
2. `context/AuthContext.tsx` — calls `authApi.register(...)`.
3. `api/endpoints.ts` → `api/client.ts` — `POST /api/auth/register` with a JSON body.

### Backend path

1. `express.json()` parses the body.
2. `routes/authRoutes.ts` calls `parseOrThrow(registerSchema, req.body)`.
   `validation/schemas.ts` requires a name, a valid email and a password of at least 6 characters.
   Invalid input throws a `ValidationError` (HTTP 400) before any business code runs.
   **Note:** the schema has no `role` field, so a request containing `"role": "admin"` is simply
   ignored — privilege escalation is impossible by construction.
3. `services/authService.ts`:
   - lowercases the email and asks the repository whether it already exists → `ConflictError` (409);
   - hashes the password with **bcrypt** (10 rounds) — the plain password is never stored;
   - inserts the user with the role hardcoded to `'user'`;
   - signs a JWT: `sub` = user id, `role` = role, expiry from config.
4. Responds `201 { token, user }`. The `user` object has no password field — the service strips it.

### Back in the browser

`AuthContext` writes the token and user to `localStorage` and sets React state. The state change
re-renders `App.tsx`, the `GuestOnly` guard sees a user and redirects to the dashboard.

> **Why localStorage?** It survives a page refresh and keeps the kata simple. For production I'd
> move the token to an httpOnly cookie so JavaScript (and therefore an XSS payload) cannot read it.
> Worth saying out loud in an interview — it shows you know the trade-off you made.

---

## 4. Request 2 — logging in

Same path, with two deliberate details in `AuthService.login`:

```ts
const user = this.users.findByEmail(email.toLowerCase());
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  throw new UnauthorizedError('Invalid email or password');
}
```

- **One message for both failures.** If an unknown email said "no such user" and a wrong password
  said "wrong password", anyone could enumerate which emails have accounts.
- **`bcrypt.compare`, never `===`.** The stored value is a hash; the only way to check is to hash
  the attempt with the same salt, which `compare` does.

---

## 5. Request 3 — loading the dashboard

`pages/DashboardPage.tsx` runs `load()` in a `useEffect` on mount. `vehicleApi.list()` issues
`GET /api/vehicles`.

On the server the route is mounted as:

```ts
app.use('/api/vehicles', authenticate(authService), vehicleRoutes(vehicleService));
```

`middleware/auth.ts` → `authenticate`:

1. Reads `Authorization`, expects exactly `Bearer <token>` → otherwise `401`.
2. `authService.verifyToken(token)` runs `jwt.verify`, which checks both the **signature**
   (so a token forged with another secret fails) and the **expiry**.
3. Attaches `req.user = { id, role }` and calls `next()`.

Because the middleware is mounted on the whole router, **no vehicle route can accidentally be
left public** — security is opt-out, not opt-in.

The handler is then trivial: `res.json(vehicleService.list())` → `VehicleRepository.findAll()` →
`SELECT * FROM vehicles ORDER BY id`. The repository maps snake_case columns (`image_url`) to
camelCase API fields (`imageUrl`) so SQL naming never leaks into the frontend.

The dashboard renders a `VehicleCard` per vehicle and computes the stat pills
(`8 models`, `22 units`, `1 sold out`) with `useMemo`.

---

## 6. Request 4 — searching

Typing filters and clicking *Search* calls `SearchFilters`' `onSearch`, which is the same `load()`
function. If any filter is non-empty it calls `/api/vehicles/search?...` instead of `/api/vehicles`.

Two subtleties worth knowing:

**Route order.** In `routes/vehicleRoutes.ts`, `/search` is registered **before** `/:id`. Express
matches in order, so with the opposite order `/vehicles/search` would match `/:id` with
`id = "search"` and return a 400.

**Query strings are always text.** `?minPrice=20000` arrives as the string `"20000"`. The zod
schema uses `z.preprocess` to coerce it to a number and to drop empty values, so `?make=` is the
same as not sending `make` at all.

Then `VehicleRepository.search` builds the SQL dynamically but safely:

```ts
clauses.push(`${field} LIKE ? ESCAPE '\\'`);
params.push(`%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
```

- The **values** are always bound parameters (`?`), never string-concatenated → no SQL injection.
- The only interpolated part is the column name, which comes from a fixed list in the code.
- `%` and `_` in user input are escaped, so searching for `%` finds nothing rather than everything.

The cross-field rule (`minPrice > maxPrice` → 400) lives in `VehicleService`, not the repository,
because it is a *business* rule, not a storage concern.

---

## 7. Request 5 — purchasing (the interesting one)

Clicking *Purchase* sends `POST /api/vehicles/3/purchase` with `{ quantity: 1 }`.

The naive implementation is a read followed by a write:

```ts
const vehicle = repo.findById(id);          // quantity = 1
if (vehicle.quantity < amount) throw ...;   // passes for both requests
repo.update(id, { quantity: vehicle.quantity - amount });   // both write 0
```

With two simultaneous buyers and one car left, **both** requests read `1`, both pass the check, and
you have sold the same car twice. This is a classic check-then-act race.

The implementation instead makes the database do the checking, in a single statement:

```sql
UPDATE vehicles
   SET quantity = quantity - ?, updated_at = datetime('now')
 WHERE id = ? AND quantity >= ?
```

`run()` reports how many rows changed. One row changed → the purchase succeeded. Zero rows →
either there isn't enough stock or the vehicle doesn't exist, and `VehicleService.purchase`
distinguishes the two by re-fetching (404 if missing, 409 with a readable message if out of stock).
`tests/inventory.test.ts` fires six concurrent purchases at three units and asserts exactly three
succeed and the final quantity is zero.

Restock is the mirror image (`quantity + ?`) and is admin-only.

The UI updates the single card in place from the response, rather than refetching the whole list,
and shows a toast (`role="status"`, so screen readers announce it).

---

## 8. Admin actions and the two layers of authorisation

In `routes/vehicleRoutes.ts` the write routes carry a second middleware:

```ts
router.post('/', adminOnly, …);            // requireRole('admin')
router.put('/:id', adminOnly, …);
router.delete('/:id', adminOnly, …);
router.post('/:id/restock', adminOnly, …);
```

`requireRole` reads the role off `req.user` — which came from the **signed** token, not from
anything the client can edit — and throws `ForbiddenError` (403) otherwise.

The frontend *also* hides those buttons (`isAdmin` from the auth context). That is convenience, not
security: hiding a button only changes what's easy to click. The server check is what actually
protects the data, and `tests/vehicles.test.ts` asserts a regular user's token gets 403 on each
write route.

`PUT` is a **partial** update: the schema is `.partial()` with a refinement rejecting an empty body,
and the repository only writes the keys it was given, so updating just the price leaves everything
else untouched.

---

## 9. How errors travel

Every layer throws typed errors from `src/errors.ts`, each carrying an HTTP status:

```
ValidationError 400 · UnauthorizedError 401 · ForbiddenError 403
NotFoundError   404 · ConflictError     409
```

Services never import Express and never call `res.status(...)`. They throw; the single
`errorHandler` at the bottom of `app.ts` translates:

```ts
if (err instanceof AppError) res.status(err.status).json({ error: err.message });
```

Anything else — a genuine bug — is logged server-side and returned as a bare
`500 { error: 'Internal server error' }`, so stack traces and SQL never reach the client. There's a
test for that: it drops the `users` table mid-flight and asserts the response leaks nothing.

In the browser, `api/client.ts` reverses the mapping: a non-2xx response becomes an `ApiError`
carrying the server's message, which components display directly. A `401` additionally dispatches
an `auth:unauthorized` window event; `AuthContext` listens for it and logs the user out, so an
expired token anywhere in the app cleanly returns them to the login screen.

---

## 10. The TDD cycle used throughout

Each feature went through the same loop, and the commit history shows it:

1. **Red** — write the test file, run it, watch it fail. Commit as `test(...)`.
2. **Green** — write the simplest implementation that passes. Commit as `feat(...)`.
3. **Refactor** — clean up with the tests as a safety net. Commit as `refactor(...)`.

```
test(auth)      → feat(auth)
test(vehicles)  → feat(vehicles)
test(inventory) → feat(inventory)
test(app)       → feat(server)        → refactor(shared test helper)
test(web)       → feat(web)           → fix(web: Tailwind utility)
```

Tests are behaviour-focused: they go through the HTTP API with Supertest and through the rendered
DOM with Testing Library, rather than asserting on internals. That means a refactor (like extracting
`VehicleService`) does not break a single test — which is the whole point.

---

## Interview prep

Likely questions, and the short answers.

**"Walk me through what happens when a user buys a car."**
Click → `POST /api/vehicles/:id/purchase` → `authenticate` verifies the JWT and sets `req.user` →
zod validates the quantity → `VehicleService.purchase` calls a single conditional `UPDATE` that
decrements only if stock allows → 0 rows changed means 409, 1 row means success → the updated
vehicle comes back and the card updates in place with a toast.

**"How do you prevent overselling?"**
The stock check is in the SQL `WHERE` clause, so the check and the write are one atomic statement.
A read-then-write would let two concurrent buyers both pass the check. There's a test with six
concurrent purchases against three units asserting exactly three succeed.

**"How does authentication work?"**
bcrypt-hashed passwords (10 rounds), a JWT signed with a server secret carrying `sub` and `role`,
sent as `Authorization: Bearer`. The `authenticate` middleware verifies signature and expiry on
every vehicle route; `requireRole('admin')` gates the writes.

**"Could someone make themselves an admin?"**
No. The registration schema has no `role` field and the service hardcodes `'user'`. Admins are
seeded from environment variables. And since the role is read from the signed token, editing
localStorage doesn't help — the signature wouldn't match.

**"How do you avoid SQL injection?"**
All values are bound parameters; only column names are interpolated and they come from a fixed
list in the code. LIKE wildcards in user input are escaped too.

**"Why SQLite?"**
The brief rules out in-memory; SQLite is a real file-backed database with no setup for a reviewer.
Because SQL is confined to the repository layer, moving to Postgres means changing those two files.

**"What would you do differently with more time?"**
httpOnly cookies instead of localStorage for the token; refresh tokens; rate limiting on the auth
routes; pagination on the vehicle list; an orders table so purchases are recorded as transactions
rather than just a stock decrement; and Playwright end-to-end tests in CI.

**"Where did the AI actually help, and where did you override it?"**
It was fast at scaffolding and boilerplate. I overrode it on the purchase implementation (it first
wrote read-then-write; I required a single atomic `UPDATE` and added the concurrency test), and on
error messages that leaked whether an email was registered. Two real bugs were caught by running
the app, not by reading code — see the `fix(web)` commit.
