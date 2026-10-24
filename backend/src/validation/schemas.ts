import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const requiredText = (label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(100);

const vehicleFields = {
  make: requiredText('Make'),
  model: requiredText('Model'),
  category: requiredText('Category'),
  price: z.number({ error: 'Price must be a number' }).nonnegative('Price cannot be negative'),
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .nonnegative('Quantity cannot be negative'),
  year: z.number().int().min(1886).max(2100).nullable(),
  imageUrl: z.string().trim().url('Image URL must be a valid URL').max(2048).nullable(),
  description: z.string().trim().max(2000).nullable(),
};

export const createVehicleSchema = z.object({
  ...vehicleFields,
  quantity: vehicleFields.quantity.default(0),
  year: vehicleFields.year.optional(),
  imageUrl: vehicleFields.imageUrl.optional(),
  description: vehicleFields.description.optional(),
});

export const updateVehicleSchema = z
  .object(vehicleFields)
  .partial()
  .refine((changes) => Object.values(changes).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

/** Query strings arrive as text, so prices are coerced and blank values ignored. */
const optionalPrice = (label: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} must be a number` }).nonnegative(`${label} cannot be negative`).optional(),
  );

const optionalText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined),
  z.string().max(100).optional(),
);

export const searchSchema = z.object({
  make: optionalText,
  model: optionalText,
  category: optionalText,
  minPrice: optionalPrice('minPrice'),
  maxPrice: optionalPrice('maxPrice'),
});

export const idParamSchema = z.coerce
  .number({ error: 'Vehicle id must be a positive integer' })
  .int('Vehicle id must be a positive integer')
  .positive('Vehicle id must be a positive integer');

const positiveQuantity = z
  .number({ error: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .positive('Quantity must be at least 1');

export const purchaseSchema = z.object({ quantity: positiveQuantity.default(1) });

export const restockSchema = z.object({ quantity: positiveQuantity });
