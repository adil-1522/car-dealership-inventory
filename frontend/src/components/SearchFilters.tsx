import { FormEvent, useState } from 'react';
import type { VehicleFilters } from '../types';

interface SearchFiltersProps {
  categories: string[];
  onSearch: (filters: VehicleFilters) => void;
}

const EMPTY: Required<VehicleFilters> = { make: '', model: '', category: '', minPrice: '', maxPrice: '' };

export function SearchFilters({ categories, onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof VehicleFilters) => (e: { target: { value: string } }) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { minPrice, maxPrice } = filters;
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setError('Min price cannot be greater than max price');
      return;
    }
    setError(null);
    onSearch(filters);
  }

  function handleReset() {
    setFilters(EMPTY);
    setError(null);
    onSearch({});
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-700 bg-ink-900/70 p-4 backdrop-blur">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="col-span-1">
          <label htmlFor="f-make" className="label">Make</label>
          <input id="f-make" className="input" placeholder="Any" value={filters.make} onChange={update('make')} />
        </div>
        <div className="col-span-1">
          <label htmlFor="f-model" className="label">Model</label>
          <input id="f-model" className="input" placeholder="Any" value={filters.model} onChange={update('model')} />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="f-category" className="label">Category</label>
          <select id="f-category" className="input" value={filters.category} onChange={update('category')}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1">
          <label htmlFor="f-min" className="label">Min price</label>
          <input id="f-min" type="number" min={0} className="input" placeholder="$0" value={filters.minPrice} onChange={update('minPrice')} />
        </div>
        <div className="col-span-1">
          <label htmlFor="f-max" className="label">Max price</label>
          <input id="f-max" type="number" min={0} className="input" placeholder="No limit" value={filters.maxPrice} onChange={update('maxPrice')} />
        </div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-1">
          <button type="submit" className="btn-primary flex-1">Search</button>
          <button type="button" className="btn-ghost" onClick={handleReset}>Reset</button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>
      )}
    </form>
  );
}
