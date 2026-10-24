import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  if (!user) return null;
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <span className="text-xl font-extrabold tracking-tight">
          Auto<span className="text-accent-400">Vault</span>
        </span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="rounded-full bg-accent-400/15 px-2.5 py-1 text-xs font-semibold text-accent-400">Admin</span>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-white">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-bold">{initials}</span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
