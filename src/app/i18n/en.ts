import type { LineReason, Missing, NothingDueReason, Warning } from '../../engine/schema';

type MissingKind = Missing['kind'];

export const en = {
  appName: 'Zakat Helper',
  notAFatwa: 'This is a calculator, not a fatwa.',
  lineReason: {
    counted: 'Counted',
    'long-term-fraction': 'Long-term shares: only the zakatable part counts',
    'jewellery-exempt': 'Not counted: jewellery you wear',
    'company-pays': 'Not counted: the company pays zakat for you',
    'not-for-sale': 'Not counted: not held for sale',
    'doubtful-debt': 'Not counted until you get it back',
    'not-zakatable-by-user': 'Not counted: you chose not to count it',
    'deducted-debt': 'Taken off: due within 12 months',
    'debt-not-deducted': 'Not taken off: debts do not reduce zakat in your settings',
  } satisfies Record<LineReason, string>,
  warning: {
    'gap-too-long':
      'More than a year has passed since your last zakat date. Add the missing year first if you skipped one.',
    'gap-too-short': 'Less than a year has passed since your last zakat date.',
  } satisfies Record<Warning, string>,
  nothingDue: {
    'below-nisab': 'Nothing is due: your total is below nisab.',
    'no-nisab-at-previous':
      'Nothing is due yet: you did not hold nisab at your last zakat date, so your zakat year starts now.',
    'dipped-below-nisab':
      'Nothing is due: your total fell below nisab during the year, so your zakat year starts again.',
  } satisfies Record<NothingDueReason, string>,
  missing: {
    'holding-price': (name: string) => `Enter today's price or value for ${name}.`,
    fx: (currency: string) => `Enter today's exchange rate for ${currency}.`,
    'metal-price': (metal: 'gold' | 'silver') =>
      `Enter today's price per gram of pure ${metal === 'gold' ? 'gold' : 'silver'}.`,
    'first-year-answer': 'Answer whether you held at least nisab at your last zakat date.',
  } satisfies Record<MissingKind, unknown>,
};

export type Messages = typeof en;
