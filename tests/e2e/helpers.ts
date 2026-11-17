import type { Page } from '@playwright/test';

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

/** Wait until the app has written its working copy to IndexedDB (writes are async after each change). */
export async function waitForWorkingCopy(
  page: Page,
  kind: 'plain' | 'encrypted' = 'plain',
): Promise<void> {
  await page.waitForFunction(
    (wanted) =>
      new Promise<boolean>((resolve) => {
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
          resolve(false);
        };
        open.onsuccess = () => {
          const db = open.result as Db;
          if (!db.objectStoreNames.contains('kv')) {
            db.close();
            resolve(false);
            return;
          }
          const get = db.transaction('kv').objectStore('kv').get('working-copy');
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { kind?: string } | undefined)?.kind === wanted);
          };
          get.onerror = () => {
            db.close();
            resolve(false);
          };
        };
      }),
    kind,
  );
}
