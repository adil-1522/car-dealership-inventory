import { expect, test } from '@playwright/test';
import { ADMIN, loginAsAdmin, registerShopper } from './fixtures';

test.describe('Authentication', () => {
  test('guests are redirected to the login page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('a shopper can register and lands on the showroom', async ({ page }) => {
    await registerShopper(page);

    await expect(page.getByRole('heading', { name: 'Vehicle inventory' })).toBeVisible();
    // The full name is hidden on narrow screens by design; the avatar initials are always shown.
    await expect(page.getByText('JB', { exact: true })).toBeVisible();
  });

  test('registration rejects mismatched passwords before calling the API', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Mismatch');
    await page.getByLabel('Email').fill('mismatch@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    await page.getByLabel('Confirm password').fill('Different1');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert')).toContainText('Passwords do not match');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('a duplicate email is refused with the server message', async ({ page }) => {
    const email = await registerShopper(page);
    await page.getByRole('button', { name: 'Log out' }).click();

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Copycat');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    await page.getByLabel('Confirm password').fill('Secret123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert')).toContainText(/already registered/i);
  });

  test('a wrong password shows an error and does not sign in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the session survives a page reload', async ({ page }) => {
    await registerShopper(page);

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Vehicle inventory' })).toBeVisible();
  });

  test('logging out clears the session and blocks the dashboard', async ({ page }) => {
    await registerShopper(page);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an admin sees the Admin badge, a shopper does not', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await registerShopper(page);
    await expect(page.getByText('Admin', { exact: true })).toBeHidden();
  });

  test('a tampered token logs the user straight back out', async ({ page }) => {
    await registerShopper(page);

    await page.evaluate(() => localStorage.setItem('dealership.token', 'tampered.token.value'));
    await page.reload();

    // The first API call returns 401, which the app turns into a logout.
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });
});
