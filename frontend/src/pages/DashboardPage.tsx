import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { vehicleApi } from '../api/endpoints';
import { Modal } from '../components/Modal';
import { SearchFilters } from '../components/SearchFilters';
import { VehicleCard } from '../components/VehicleCard';
import { VehicleForm } from '../components/VehicleForm';
import { useAuth } from '../context/AuthContext';
import type { Vehicle, VehicleFilters, VehicleInput } from '../types';

/** Which admin dialog (if any) is open. */
type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; vehicle: Vehicle }
  | { kind: 'delete'; vehicle: Vehicle }
  | { kind: 'restock'; vehicle: Vehicle }
  | null;

interface Notice {
  text: string;
  tone: 'success' | 'error';
}

const DEFAULT_CATEGORIES = ['Sedan', 'SUV', 'Truck', 'Electric', 'Luxury', 'Coupe'];

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
const label = (v: Vehicle) => `${v.make} ${v.model}`;

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [knownCategories, setKnownCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const notify = useCallback((text: string, tone: Notice['tone'] = 'success') => setNotice({ text, tone }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const load = useCallback(async (filters: VehicleFilters = {}) => {
    setLoading(true);
    setLoadError(null);
    try {
      const hasFilters = Object.values(filters).some(Boolean);
      const result = hasFilters ? await vehicleApi.search(filters) : await vehicleApi.list();
      setVehicles(result);
      setKnownCategories((prev) => Array.from(new Set([...prev, ...result.map((v) => v.category)])).sort());
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replaceVehicle = (updated: Vehicle) =>
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));

  async function handlePurchase(vehicle: Vehicle) {
    setBusyId(vehicle.id);
    try {
      replaceVehicle(await vehicleApi.purchase(vehicle.id));
      notify(`Purchased ${label(vehicle)}. Enjoy the ride!`);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(input: VehicleInput) {
    if (dialog?.kind === 'edit') {
      replaceVehicle(await vehicleApi.update(dialog.vehicle.id, input));
      notify(`Updated ${input.make} ${input.model}`);
    } else {
      const created = await vehicleApi.create(input);
      setVehicles((prev) => [...prev, created]);
      notify(`Added ${label(created)} to the inventory`);
    }
    setDialog(null);
  }

  async function handleDelete(vehicle: Vehicle) {
    try {
      await vehicleApi.remove(vehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      notify(`Deleted ${label(vehicle)}`);
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
    setDialog(null);
  }

  async function handleRestock(vehicle: Vehicle, quantity: number) {
    try {
      replaceVehicle(await vehicleApi.restock(vehicle.id, quantity));
      notify(`Restocked ${label(vehicle)} (+${quantity})`);
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
    setDialog(null);
  }

  const stats = useMemo(
    () => ({
      models: vehicles.length,
      units: vehicles.reduce((sum, v) => sum + v.quantity, 0),
      soldOut: vehicles.filter((v) => v.quantity === 0).length,
    }),
    [vehicles],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-400">Showroom</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Vehicle inventory</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-ink-800 px-3 py-1 text-slate-300">{stats.models} models</span>
            <span className="rounded-full bg-ink-800 px-3 py-1 text-slate-300">{stats.units} units</span>
            <span className="rounded-full bg-ink-800 px-3 py-1 text-slate-300">{stats.soldOut} sold out</span>
          </div>
        </div>
        {isAdmin && (
          <button type="button" className="btn-primary self-start sm:self-auto" onClick={() => setDialog({ kind: 'create' })}>
            + Add vehicle
          </button>
        )}
      </section>

      <SearchFilters categories={knownCategories} onSearch={load} />

      <section className="mt-8">
        {loadError ? (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
            Could not load vehicles: {loadError}
          </p>
        ) : loading && vehicles.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-ink-900" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center">
            <p className="text-lg font-semibold text-white">No vehicles found</p>
            <p className="mt-1 text-sm text-slate-400">Try widening your search or resetting the filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isAdmin={isAdmin}
                busy={busyId === vehicle.id}
                onPurchase={handlePurchase}
                onEdit={(v) => setDialog({ kind: 'edit', vehicle: v })}
                onDelete={(v) => setDialog({ kind: 'delete', vehicle: v })}
                onRestock={(v) => setDialog({ kind: 'restock', vehicle: v })}
              />
            ))}
          </div>
        )}
      </section>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <Modal title={dialog.kind === 'edit' ? `Edit ${label(dialog.vehicle)}` : 'Add a vehicle'} onClose={() => setDialog(null)}>
          <VehicleForm
            initial={dialog.kind === 'edit' ? dialog.vehicle : undefined}
            onSubmit={handleSave}
            onCancel={() => setDialog(null)}
          />
        </Modal>
      )}

      {dialog?.kind === 'delete' && (
        <Modal title="Delete vehicle?" onClose={() => setDialog(null)}>
          <p className="text-sm text-slate-300">
            <strong className="text-white">{label(dialog.vehicle)}</strong> will be permanently removed from the inventory.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="btn bg-red-500 text-white hover:bg-red-600" onClick={() => handleDelete(dialog.vehicle)}>
              Delete
            </button>
          </div>
        </Modal>
      )}

      {dialog?.kind === 'restock' && (
        <RestockDialog vehicle={dialog.vehicle} onClose={() => setDialog(null)} onRestock={handleRestock} />
      )}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold shadow-2xl ${
            notice.tone === 'success' ? 'bg-emerald-500 text-ink-950' : 'bg-red-500 text-white'
          }`}
        >
          {notice.text}
        </div>
      )}
    </main>
  );
}

function RestockDialog({
  vehicle,
  onClose,
  onRestock,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onRestock: (vehicle: Vehicle, quantity: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState('1');
  const amount = Number(quantity);
  const valid = Number.isInteger(amount) && amount > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) onRestock(vehicle, amount);
  }

  return (
    <Modal title={`Restock ${label(vehicle)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">Currently {vehicle.quantity} in stock.</p>
        <div>
          <label htmlFor="restock-qty" className="label">Units to add</label>
          <input id="restock-qty" type="number" min={1} step={1} className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!valid}>Restock</button>
        </div>
      </form>
    </Modal>
  );
}
