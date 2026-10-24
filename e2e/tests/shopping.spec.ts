import { expect, test } from '@playwright/test';
import { addVehicle, loginAsAdmin, registerShopper, stockBadge, vehicleCard } from './fixtures';

test.describe('Browsing and purchasing', () => {
  test('the showroom lists vehicles with stock badges and stats', async ({ page }) => {
    await loginAsAdmin(page);
    const model = await addVehicle(page, { quantity: '5' });

    const card = vehicleCard(page, new RegExp(model));
    await expect(card).toBeVisible();
    await expect(stockBadge(page, new RegExp(model))).toHaveText('5 in stock');
    await expect(page.getByText(/\d+ models/)).toBeVisible();
    await expect(page.getByText(/\d+ units/)).toBeVisible();
  });

  test('low stock and sold out are called out differently', async ({ page }) => {
    await loginAsAdmin(page);
    const low = await addVehicle(page, { quantity: '2' });
    const gone = await addVehicle(page, { quantity: '0' });

    await expect(stockBadge(page, new RegExp(low))).toHaveText('Only 2 left');
    await expect(stockBadge(page, new RegExp(gone))).toHaveText('Sold out');
  });

  test('a purchase decrements stock and confirms with a toast', async ({ page }) => {
    await loginAsAdmin(page);
    const model = await addVehicle(page, { quantity: '3' });
    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);

    const card = vehicleCard(page, new RegExp(model));
    await card.getByRole('button', { name: 'Purchase' }).click();

    await expect(page.getByRole('status')).toContainText(/Purchased/i);
    await expect(stockBadge(page, new RegExp(model))).toHaveText('Only 2 left');
  });

  test('the last unit can be bought and the button then disables', async ({ page }) => {
    await loginAsAdmin(page);
    const model = await addVehicle(page, { quantity: '1' });
    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);

    const card = vehicleCard(page, new RegExp(model));
    await card.getByRole('button', { name: 'Purchase' }).click();

    await expect(stockBadge(page, new RegExp(model))).toHaveText('Sold out');
    await expect(card.getByRole('button', { name: 'Sold out' })).toBeDisabled();
  });

  test('a sold-out vehicle cannot be purchased', async ({ page }) => {
    await loginAsAdmin(page);
    const model = await addVehicle(page, { quantity: '0' });

    await expect(vehicleCard(page, new RegExp(model)).getByRole('button', { name: 'Sold out' })).toBeDisabled();
  });

  test('the stock level persists across a reload', async ({ page }) => {
    await loginAsAdmin(page);
    const model = await addVehicle(page, { quantity: '4' });
    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);

    await vehicleCard(page, new RegExp(model)).getByRole('button', { name: 'Purchase' }).click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.reload();

    await expect(stockBadge(page, new RegExp(model))).toHaveText('Only 3 left');
  });
});

test.describe('Search and filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('filters by make', async ({ page }) => {
    // A make unique to this run, so the assertion does not depend on what else is in the database.
    const make = `Searchmark${Date.now()}`;
    const model = await addVehicle(page, { make, quantity: '1' });

    await page.getByLabel('Make').fill(make.toLowerCase());
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(vehicleCard(page, new RegExp(model))).toBeVisible();
    await expect(page.locator('article')).toHaveCount(1);
  });

  test('filters by price range', async ({ page }) => {
    const make = `Rangetest${Date.now()}`;
    const cheap = await addVehicle(page, { make, price: '10000' });
    const dear = await addVehicle(page, { make, price: '90000' });

    await page.getByLabel('Make').fill(make);
    await page.getByLabel('Max price').fill('20000');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(vehicleCard(page, new RegExp(cheap))).toBeVisible();
    await expect(vehicleCard(page, new RegExp(dear))).toBeHidden();
  });

  test('shows an empty state when nothing matches', async ({ page }) => {
    await page.getByLabel('Make').fill('NoSuchMakeExists');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(page.getByText('No vehicles found')).toBeVisible();
  });

  test('rejects an inverted price range without calling the API', async ({ page }) => {
    await page.getByLabel('Min price').fill('90000');
    await page.getByLabel('Max price').fill('1000');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText(/Min price/i);
  });

  test('reset clears the filters and restores the full list', async ({ page }) => {
    await page.getByLabel('Make').fill('NoSuchMakeExists');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('No vehicles found')).toBeVisible();

    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(page.getByLabel('Make')).toHaveValue('');
    await expect(page.locator('article').first()).toBeVisible();
  });
});
