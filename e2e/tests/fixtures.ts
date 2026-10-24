import { expect, Page } from '@playwright/test';

export const ADMIN = { email: 'admin@dealership.com', password: 'Admin@123' };

/** Registers a fresh shopper so tests never collide on email uniqueness. */
export async function registerShopper(page: Page, name = 'Jane Buyer') {
  const email = `shopper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Secret123');
  await page.getByLabel('Confirm password').fill('Secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicle inventory' })).toBeVisible();
  return email;
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicle inventory' })).toBeVisible();
}

/** The card for a vehicle, located by its heading. */
export function vehicleCard(page: Page, name: string | RegExp) {
  return page.locator('article').filter({ has: page.getByRole('heading', { name }) });
}

/**
 * The stock badge on a card. Targeted by element rather than text because
 * "Sold out" also appears on the disabled purchase button.
 */
export function stockBadge(page: Page, name: string | RegExp) {
  return vehicleCard(page, name).locator('span.absolute.right-3');
}

/** Adds a vehicle as admin and returns the unique model name used. */
export async function addVehicle(
  page: Page,
  overrides: Partial<{ make: string; model: string; category: string; price: string; quantity: string }> = {},
) {
  const model = overrides.model ?? `Test-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add vehicle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Make').fill(overrides.make ?? 'Testla');
  await dialog.getByLabel('Model').fill(model);
  await dialog.getByLabel('Category').fill(overrides.category ?? 'Sedan');
  await dialog.getByLabel('Price (USD)').fill(overrides.price ?? '30000');
  await dialog.getByLabel('Quantity').fill(overrides.quantity ?? '2');
  await dialog.getByRole('button', { name: 'Add vehicle' }).click();
  await expect(dialog).toBeHidden();
  return model;
}
