import { expect, test } from '@playwright/test';

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start new' })).toBeVisible();
  await page.evaluate(async () => {
    const sw = (navigator as unknown as { serviceWorker: { ready: Promise<unknown> } })
      .serviceWorker;
    await sw.ready;
  });
  // Let the worker take control, then make sure every asset has passed through it once.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start new' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start new' })).toBeVisible();
  await page.getByRole('button', { name: 'Start new' }).click();
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
});
