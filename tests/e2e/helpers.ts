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
export async function saveToDisk(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save file' }).click();
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
