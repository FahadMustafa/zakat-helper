import { expect, test } from '@playwright/test';
import { openFromDisk, saveToDisk, startNew, withoutFilePickers } from './helpers';

test.beforeEach(async ({ page }) => {
  await withoutFilePickers(page);
});

test('a refresh keeps unsaved work', async ({ page }) => {
  await startNew(page);
  await expect(page.getByRole('heading', { name: 'Your zakat years' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your zakat years' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Not saved to a file yet');
});

test('an encrypted working copy asks for the passphrase after a reload', async ({ page }) => {
  await startNew(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Set a passphrase' }).click();
  await page.getByLabel('New passphrase').fill('correct horse battery');
  await page.getByLabel('Type it again').fill('correct horse battery');
  await page.getByRole('button', { name: 'Protect my file' }).click();
  await expect(page.getByText('Passphrase set.')).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your zakat file' })).toBeVisible();
  await page.getByLabel('Passphrase').fill('wrong one');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('alert')).toContainText('does not open this file', {
    timeout: 15_000,
  });
  await page.getByLabel('Passphrase').fill('correct horse battery');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your zakat years' })).toBeVisible({
    timeout: 15_000,
  });
});

test('opening an older copy asks first and keeps the browser copy if chosen', async ({ page }) => {
  await startNew(page);
  const older = await saveToDisk(page);
  await expect(page.getByRole('status')).toContainText('Saved to');
  // Change something and save again, so the file on disk at `older` is now behind.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Gold: 85 grams').click();
  await saveToDisk(page);
  await page.getByRole('button', { name: 'Done' }).click();

  await openFromDisk(page, older, 'Open a file');
  await expect(page.getByRole('dialog', { name: 'Which copy do you want to keep?' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('is older than the copy in this browser');
  await page.getByRole('button', { name: 'Keep the copy in this browser' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Gold: 85 grams')).toBeChecked();
});
