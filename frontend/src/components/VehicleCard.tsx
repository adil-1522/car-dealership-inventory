import type { Vehicle } from '../types';
import { formatPrice, stockLabel } from '../utils/format';
import { CarIllustration } from './CarIllustration';

interface VehicleCardProps {
  vehicle: Vehicle;
  isAdmin: boolean;
  /** True while an action for this vehicle is in flight. */
  busy?: boolean;
  onPurchase: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
}

/** Hue per category so the placeholder art gives each card some identity. */
const CATEGORY_TINT: Record<string, string> = {
  sedan: 'text-sky-400',
  suv: 'text-emerald-400',
  truck: 'text-orange-400',
  electric: 'text-lime-300',
  luxury: 'text-violet-300',
  coupe: 'text-rose-400',
};

export function VehicleCard({ vehicle, isAdmin, busy = false, onPurchase, onEdit, onDelete, onRestock }: VehicleCardProps) {
  const soldOut = vehicle.quantity === 0;
  const lowStock = !soldOut && vehicle.quantity <= 3;
  const tint = CATEGORY_TINT[vehicle.category.toLowerCase()] ?? 'text-slate-300';

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-slate-600">
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950">
        {vehicle.imageUrl ? (
          <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" />
        ) : (
          <CarIllustration className={`w-3/5 ${tint} transition group-hover:scale-105`} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur">
          {vehicle.category}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
            soldOut ? 'bg-red-500/20 text-red-300' : lowStock ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {stockLabel(vehicle.quantity)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-bold text-white">
              {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.year && <span className="text-sm text-slate-400">{vehicle.year}</span>}
          </div>
          {vehicle.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{vehicle.description}</p>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-accent-400">{formatPrice(vehicle.price)}</span>
          <button
            type="button"
            className="btn-primary"
            disabled={soldOut || busy}
            onClick={() => onPurchase(vehicle)}
          >
            {soldOut ? 'Sold out' : busy ? 'Purchasing…' : 'Purchase'}
          </button>
        </div>

        {isAdmin && (
          <div className="flex gap-2 border-t border-ink-700 pt-3">
            <button type="button" className="btn-ghost flex-1 px-2 py-1.5 text-xs" onClick={() => onRestock(vehicle)}>
              Restock
            </button>
            <button type="button" className="btn-ghost flex-1 px-2 py-1.5 text-xs" onClick={() => onEdit(vehicle)}>
              Edit
            </button>
            <button type="button" className="btn-danger flex-1 px-2 py-1.5 text-xs" onClick={() => onDelete(vehicle)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
