import { expect, test } from '@playwright/test';
import { addVehicle, loginAsAdmin, registerShopper, stockBadge, vehicleCard } from './fixtures';

test.describe('Admin inventory management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('adds a vehicle that appears immediately', async ({ page }) => {
    const model = await addVehicle(page, { make: 'Porsche', price: '121000', quantity: '2' });

    const card = vehicleCard(page, new RegExp(model));
    await expect(card).toBeVisible();
    await expect(card.getByText('$121,000')).toBeVisible();
  });

  test('validates the add form before submitting', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add vehicle' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Add vehicle' }).click();

    await expect(dialog.getByRole('alert')).toContainText(/Make is required/i);
    await expect(dialog).toBeVisible();
  });

  test('surfaces a server validation error in the form', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add vehicle' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Make').fill('Bad');
    await dialog.getByLabel('Model').fill('Image');
    await dialog.getByLabel('Category').fill('Sedan');
    await dialog.getByLabel('Price (USD)').fill('1000');
    await dialog.getByLabel('Image URL (optional)').fill('ftp://example.com/x.png');
    await dialog.getByRole('button', { name: 'Add vehicle' }).click();

    await expect(dialog.getByRole('alert')).toContainText(/http/i);
  });

  test('edits a vehicle and keeps the untouched fields', async ({ page }) => {
    const model = await addVehicle(page, { price: '30000', quantity: '2' });
    const card = vehicleCard(page, new RegExp(model));

    await card.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Price (USD)').fill('25500');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(card.getByText('$25,500')).toBeVisible();
    await expect(stockBadge(page, new RegExp(model))).toHaveText('Only 2 left');
  });

  test('restocks a sold-out vehicle so it can be bought again', async ({ page }) => {
    const model = await addVehicle(page, { quantity: '0' });
    const card = vehicleCard(page, new RegExp(model));
    await expect(stockBadge(page, new RegExp(model))).toHaveText('Sold out');

    await card.getByRole('button', { name: 'Restock' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Units to add').fill('4');
    await dialog.getByRole('button', { name: 'Restock', exact: true }).click();

    await expect(stockBadge(page, new RegExp(model))).toHaveText('4 in stock');
    await expect(card.getByRole('button', { name: 'Purchase' })).toBeEnabled();
  });

  test('deletes a vehicle after confirming', async ({ page }) => {
    const model = await addVehicle(page);
    const card = vehicleCard(page, new RegExp(model));

    await card.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(card).toHaveCount(0);
  });

  test('cancelling a delete keeps the vehicle', async ({ page }) => {
    const model = await addVehicle(page);
    const card = vehicleCard(page, new RegExp(model));

    await card.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(card).toBeVisible();
  });

  test('a dialog closes on Escape', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add vehicle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('shoppers see no admin controls at all', async ({ page }) => {
    const model = await addVehicle(page);
    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);

    const card = vehicleCard(page, new RegExp(model));
    await expect(card.getByRole('button', { name: 'Purchase' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Restock' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Add vehicle' })).toHaveCount(0);
  });

  test('the API rejects a shopper write even if the UI is bypassed', async ({ page }) => {
    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dealership.token')}`,
        },
        body: JSON.stringify({ make: 'Hack', model: 'Attempt', category: 'Sedan', price: 1, quantity: 1 }),
      });
      return res.status;
    });

    expect(status).toBe(403);
  });
});
