import { FormEvent, useState } from 'react';
import type { Vehicle, VehicleInput } from '../types';

interface VehicleFormProps {
  /** When provided the form edits this vehicle; otherwise it creates a new one. */
  initial?: Vehicle;
  onSubmit: (input: VehicleInput) => Promise<void> | void;
  onCancel: () => void;
}

type FormState = Record<keyof VehicleInput, string>;

function toFormState(v?: Vehicle): FormState {
  return {
    make: v?.make ?? '',
    model: v?.model ?? '',
    category: v?.category ?? '',
    price: v ? String(v.price) : '',
    quantity: v ? String(v.quantity) : '',
    year: v?.year ? String(v.year) : '',
    imageUrl: v?.imageUrl ?? '',
    description: v?.description ?? '',
  };
}

/** Returns the first validation problem, or null when the form is valid. */
function validate(f: FormState): string | null {
  if (!f.make.trim()) return 'Make is required';
  if (!f.model.trim()) return 'Model is required';
  if (!f.category.trim()) return 'Category is required';
  if (f.price === '' || Number(f.price) < 0) return 'Price must be zero or more';
  if (f.quantity !== '' && (!Number.isInteger(Number(f.quantity)) || Number(f.quantity) < 0)) {
    return 'Quantity must be a whole number, zero or more';
  }
  return null;
}

export function VehicleForm({ initial, onSubmit, onCancel }: VehicleFormProps) {
  const [form, setForm] = useState(() => toFormState(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const field = (name: keyof FormState) => ({
    id: `v-${name}`,
    value: form[name],
    onChange: (e: { target: { value: string } }) => setForm((prev) => ({ ...prev, [name]: e.target.value })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        make: form.make.trim(),
        model: form.model.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        quantity: form.quantity === '' ? 0 : Number(form.quantity),
        year: form.year ? Number(form.year) : null,
        imageUrl: form.imageUrl.trim() || null,
        description: form.description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save vehicle');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="v-make" className="label">Make</label>
          <input className="input" placeholder="Toyota" {...field('make')} />
        </div>
        <div>
          <label htmlFor="v-model" className="label">Model</label>
          <input className="input" placeholder="Camry" {...field('model')} />
        </div>
        <div>
          <label htmlFor="v-category" className="label">Category</label>
          <input className="input" placeholder="Sedan" list="category-options" {...field('category')} />
          <datalist id="category-options">
            {['Sedan', 'SUV', 'Truck', 'Electric', 'Luxury', 'Coupe'].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="v-year" className="label">Year</label>
          <input type="number" className="input" placeholder="2025" {...field('year')} />
        </div>
        <div>
          <label htmlFor="v-price" className="label">Price (USD)</label>
          <input type="number" min={0} className="input" placeholder="27500" {...field('price')} />
        </div>
        <div>
          <label htmlFor="v-quantity" className="label">Quantity</label>
          <input type="number" min={0} className="input" placeholder="0" {...field('quantity')} />
        </div>
      </div>
      <div>
        <label htmlFor="v-imageUrl" className="label">Image URL (optional)</label>
        <input type="url" className="input" placeholder="https://…" {...field('imageUrl')} />
      </div>
      <div>
        <label htmlFor="v-description" className="label">Description (optional)</label>
        <textarea rows={3} className="input" {...field('description')} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add vehicle'}
        </button>
      </div>
    </form>
  );
}
