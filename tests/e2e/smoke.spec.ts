import { expect, test, type Page } from '@playwright/test';
import { openFromDisk, saveToDisk, withoutFilePickers } from './helpers';

const COPY = {
  en: {
    lang: 'English',
    startNew: 'Start new',
    start: 'Start',
    year: "Start this year's zakat",
    yes: 'Yes',
    toHold: 'Continue to what you hold',
    toReview: 'Continue to review',
    add: 'Add',
    finish: 'Finish this year',
    addPayment: 'Add a payment',
    addPaymentSubmit: 'Add payment',
    newRecipient: 'Someone new',
    save: 'Save file',
    openFile: 'Open a file',
    settled: 'Settled',
    del: 'Delete',
    cancel: 'Cancel',
  },
  ar: {
    lang: 'العربية',
    startNew: 'ابدأ من جديد',
    start: 'ابدأ',
    year: 'ابدأ زكاة هذا العام',
    yes: 'نعم',
    toHold: 'تابع إلى ما تملكه',
    toReview: 'تابع إلى المراجعة',
    add: 'أضف',
    finish: 'أنهِ هذا العام',
    addPayment: 'أضف دفعة',
    addPaymentSubmit: 'أضف الدفعة',
    newRecipient: 'مستفيد جديد',
    save: 'احفظ الملف',
    openFile: 'افتح ملفًا',
    settled: 'مُسدَّدة',
    del: 'احذف',
    cancel: 'إلغاء',
  },
} as const;

async function addHolding(page: Page, add: string, name: string, kind: string, currency?: string) {
  await page.locator('#add-name').fill(name);
  await page.locator('#add-kind').selectOption(kind);
  if (currency) await page.locator('#add-currency').selectOption(currency);
  await page.getByRole('button', { name: add, exact: true }).click();
}

async function pay(
  page: Page,
  c: (typeof COPY)[keyof typeof COPY],
  recipient: string,
  amount: string,
  isNew: boolean,
) {
  await page.getByRole('button', { name: c.addPayment }).first().click();
  if (isNew) {
    await page.locator('#pay-to').selectOption({ label: c.newRecipient });
    await page.locator('#pay-name').fill(recipient);
  } else {
    await page.locator('#pay-to').selectOption({ label: recipient });
  }
  await page.locator('#pay-amount').fill(amount);
  await page.getByRole('button', { name: c.addPaymentSubmit }).click();
}

for (const lang of ['en', 'ar'] as const) {
  test(`a full year from start to settled survives save and reopen (${lang})`, async ({
    page: first,
    browser,
  }) => {
    let page = first;
    const c = COPY[lang];
    await withoutFilePickers(page);
    await page.goto('/');
    await page.getByRole('button', { name: c.lang }).click();
    await page.getByRole('button', { name: c.startNew }).click();
    await page.getByRole('button', { name: c.start, exact: true }).click();
    await page.getByRole('button', { name: c.year }).click();

    await page.getByLabel(c.yes).check();
    await page.locator('#price-silver').fill('5');
    await page.getByRole('button', { name: c.toHold }).click();
    await addHolding(page, c.add, 'Al Rajhi', 'cash', 'SAR');
    await addHolding(page, c.add, 'HSBC', 'cash', 'USD');
    await addHolding(page, c.add, 'Gold bars', 'gold');
    const qty = page.locator('.holding input[inputmode="decimal"]');
    await qty.nth(0).fill('95000');
    await qty.nth(1).fill('18000');
    await qty.nth(2).fill('100');
    await page.locator('details.more').nth(2).locator('summary').click();
    await page.locator('select[id$="-karat"]').selectOption('21');
    await page.locator('#fx-USD').fill('3.75');
    await page.getByRole('button', { name: c.toReview }).click();
    // gold was added after the prices step: the review asks for its price
    await page.locator('.actions button').first().click();
    await page.locator('#price-gold').fill('400');
    await page.getByRole('button', { name: c.toHold }).click();
    await page.getByRole('button', { name: c.toReview }).click();

    // 95,000 + 67,500 + 35,000 = 197,500 -> 4,937.50
    await expect(page.locator('.due-line')).toContainText('4,937.50');
    await page.getByRole('button', { name: c.finish }).click();

    await pay(page, c, 'Ehsan', '3000', true);
    await pay(page, c, 'Family', '1000', true);
    await pay(page, c, 'Ehsan', '937.50', false);
    await expect(page.locator('.pill.settled')).toHaveText(c.settled);

    // Deleting a payment asks first; cancelling keeps it.
    await page.getByRole('button', { name: c.del }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: c.cancel }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.pill.settled')).toHaveText(c.settled);

    const file = await saveToDisk(page, c.save);

    // A new device: fresh browser storage, open the saved file.
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await withoutFilePickers(other);
    await other.goto('/');
    await other.getByRole('button', { name: c.lang }).click();
    await openFromDisk(other, file, lang === 'en' ? 'Open my file' : 'افتح ملفي');
    page = other;
    await expect(page.locator('.year')).toContainText('4,937.50');
    await expect(page.locator('.pill.settled').first()).toHaveText(c.settled);
  });
}
