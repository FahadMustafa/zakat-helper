import { expect, type Page } from '@playwright/test';

/** Force the download + <input type=file> path: Playwright cannot drive native file pickers. */
export async function withoutFilePickers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = globalThis as unknown as Record<string, unknown>;
    delete w['showOpenFilePicker'];
    delete w['showSaveFilePicker'];
  });
}

export async function startNew(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Start new' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
}

/** Click Save file and return the downloaded file's path. */
export async function saveToDisk(page: Page, button = 'Save file'): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const d = await download;
  const path = `test-results/${String(Date.now())}-${d.suggestedFilename()}`;
  await d.saveAs(path);
  return path;
}

export async function openFromDisk(
  page: Page,
  path: string,
  button = 'Open my file',
): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button }).click();
  await (await chooser).setFiles(path);
}

/** The kind of working copy in IndexedDB right now ('plain', 'encrypted'), or undefined. */
async function workingCopyKind(page: Page): Promise<string | undefined> {
  return page.evaluate(
    () =>
      new Promise<string | undefined>((resolve) => {
        type Req = {
          result: unknown;
          onsuccess: (() => void) | null;
          onerror: (() => void) | null;
        };
        type Db = {
          transaction: (s: string) => { objectStore: (s: string) => { get: (k: string) => Req } };
          close: () => void;
          objectStoreNames: { contains: (s: string) => boolean };
        };
        const idb = (globalThis as unknown as { indexedDB: { open: (n: string) => Req } })
          .indexedDB;
        const open = idb.open('zakat-helper');
        open.onerror = () => {
          resolve(undefined);
        };
        open.onsuccess = () => {
          const db = open.result as Db;
          if (!db.objectStoreNames.contains('kv')) {
            db.close();
            resolve(undefined);
            return;
          }
          const get = db.transaction('kv').objectStore('kv').get('working-copy');
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { kind?: string } | undefined)?.kind);
          };
          get.onerror = () => {
            db.close();
            resolve(undefined);
          };
        };
      }),
  );
}

/**
 * Wait until the app has written its working copy (writes are async after each change).
 * page.waitForFunction does not await a returned promise, so poll page.evaluate instead.
 */
export async function waitForWorkingCopy(
  page: Page,
  kind: 'plain' | 'encrypted' = 'plain',
): Promise<void> {
  await expect.poll(() => workingCopyKind(page), { timeout: 15_000 }).toBe(kind);
}
