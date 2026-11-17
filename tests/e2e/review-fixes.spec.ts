import { expect, test, type Page } from '@playwright/test';
import { startNew, waitForWorkingCopy, withoutFilePickers } from './helpers';

async function firstYearWithShares(page: Page) {
  await startNew(page);
  await page.getByRole('button', { name: "Start this year's zakat" }).click();
  await page.getByLabel('Yes').check();
  await page.locator('#price-silver').fill('5');
  await page.getByRole('button', { name: 'Continue to what you hold' }).click();
  await page.locator('#add-name').fill('Aramco');
  await page.locator('#add-kind').selectOption('shares');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('C1: a long-term fraction of 25 is refused and the app keeps working after a reload', async ({
  page,
}) => {
  await withoutFilePickers(page);
  await firstYearWithShares(page);
  await page.locator('details.more summary').first().click();
  await page.getByLabel('Bought to sell').uncheck();
  await page.locator('input[id$="-fraction"]').fill('25');
  await expect(page.getByText('Enter a number from 0 to 1')).toBeVisible();
  await waitForWorkingCopy(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'All years' })).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
});

test('C2: when saving to the remembered file fails, a new copy is saved and the app stays usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = globalThis as unknown as Record<string, unknown>;
    delete w['showOpenFilePicker'];
    // A picker whose file can never be written, like a file on a removed drive.
    w['showSaveFilePicker'] = () =>
      Promise.resolve({
        name: 'gone.json',
        requestPermission: () => Promise.resolve('granted'),
        createWritable: () => Promise.reject(new DOMException('gone', 'NotFoundError')),
      });
  });
  await startNew(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save file' }).click();
  await download;
  await expect(page.getByText('A new copy was saved instead')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your zakat years' })).toBeVisible();
});

test('I1: a browser copy from a newer version shows a way out instead of a dead end', async ({
  page,
}) => {
  await withoutFilePickers(page);
  await startNew(page);
  await waitForWorkingCopy(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        type Req = { result: unknown; onsuccess: (() => void) | null };
        const idb = (globalThis as unknown as { indexedDB: { open: (n: string) => Req } })
          .indexedDB;
        const open = idb.open('zakat-helper');
        open.onsuccess = () => {
          const db = open.result as {
            transaction: (
              s: string,
              m: string,
            ) => {
              objectStore: (s: string) => {
                get: (k: string) => Req;
                put: (v: unknown, k: string) => Req;
              };
            };
          };
          const store = db.transaction('kv', 'readwrite').objectStore('kv');
          const get = store.get('working-copy');
          get.onsuccess = () => {
            const copy = get.result as { profile: Record<string, unknown> };
            copy.profile = { ...copy.profile, version: 99 };
            store.put(copy, 'working-copy').onsuccess = () => {
              resolve();
            };
          };
        };
      }),
  );
  await page.reload();
  await expect(page.getByText('newer version of Zakat Helper')).toBeVisible();
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'Remove and start over' }).click();
  await expect(page.getByRole('button', { name: 'Start new' })).toBeVisible();
});

test('I2: a forgotten passphrase is not a dead end', async ({ page }) => {
  await withoutFilePickers(page);
  await startNew(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Set a passphrase' }).click();
  await page.getByLabel('New passphrase').fill('correct horse battery');
  await page.getByLabel('Type it again').fill('correct horse battery');
  await page.getByRole('button', { name: 'Protect my file' }).click();
  await waitForWorkingCopy(page, 'encrypted');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your zakat file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open a different file' })).toBeVisible();
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'Remove and start over' }).click();
  await expect(page.getByRole('button', { name: 'Start new' })).toBeVisible();
});

test('I3: a draft year can be discarded', async ({ page }) => {
  await withoutFilePickers(page);
  await startNew(page);
  await page.getByRole('button', { name: "Start this year's zakat" }).click();
  await page.getByRole('button', { name: 'Zakat Helper' }).click();
  await page.locator('.row.link').first().click();
  await page.getByRole('button', { name: 'Discard this draft' }).click();
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await expect(page.getByText('No zakat years yet')).toBeVisible();
});
