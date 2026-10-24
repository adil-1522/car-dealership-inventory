import type { ReactNode } from 'react';
import { CarIllustration } from './CarIllustration';

/** Split-screen shell shared by the login and registration pages. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <span className="text-xl font-extrabold tracking-tight">
          Auto<span className="text-accent-400">Vault</span>
        </span>
        <div>
          <CarIllustration className="mb-10 w-4/5 text-accent-400 drop-shadow-[0_20px_40px_rgba(251,191,36,0.25)]" />
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            Your entire lot,
            <br />
            one dashboard.
          </h2>
          <p className="mt-4 max-w-md text-slate-400">
            Track stock levels, find the right car in seconds and close sales without the spreadsheet chaos.
          </p>
        </div>
        <p className="text-xs text-slate-500">Car Dealership Inventory System</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <span className="mb-8 block text-xl font-extrabold tracking-tight lg:hidden">
            Auto<span className="text-accent-400">Vault</span>
          </span>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-slate-400">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
