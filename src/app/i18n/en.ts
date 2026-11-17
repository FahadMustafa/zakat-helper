import type { LineReason, Missing, NothingDueReason, Warning } from '../../engine/schema';

type MissingKind = Missing['kind'];

export const en = {
  appName: 'Zakat Helper',
  common: {
    openFile: 'Open a file',
    save: 'Save file',
    cancel: 'Cancel',
    continue: 'Continue',
    back: 'Back',
    done: 'Done',
    ok: 'OK',
    settings: 'Settings',
    unsaved: (name: string) => `${name} has unsaved changes`,
    unsavedNew: 'Not saved to a file yet',
    saved: (name: string) => `Saved to ${name}`,
    privacy:
      'Your figures stay on this device. Save your file somewhere safe; it is the only copy.',
  },
  home: {
    title: 'Your zakat years',
    empty:
      'No zakat years yet. Start with the date you work out your zakat and what you hold on that day.',
    start: "Start this year's zakat",
  },
  checkpoint: {
    title: (year: string) => `Zakat for ${year}`,
    steps: { prices: 'Date and prices', holdings: 'What you hold', review: 'Review' },
    date: 'Zakat date',
    hijriEntry: 'Or enter the Hijri date',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    noSuchDay: 'That day does not exist in the Hijri calendar.',
    kindWithCurrency: (kind: string, currency: string) => `${kind}, ${currency}`,
    firstYearQuestion: 'A year before this date, did you hold at least nisab?',
    firstYearYes: 'Yes',
    firstYearNo: 'No, or I am not sure',
    firstYearDetail: 'If not, your zakat year starts on this date and nothing is due this time.',
    metalPrice: (metal: 'gold' | 'silver', currency: string) =>
      `Price of 1 gram of pure ${metal === 'gold' ? 'gold (24 karat)' : 'silver'} today, in ${currency}`,
    lastYear: (v: string) => `Last year: ${v}`,
    fxTitle: 'Exchange rates today',
    fxLabel: (currency: string, base: string) => `1 ${currency} in ${base}`,
    fxDetail: 'Use the rate you could actually get, so the poor are not short-changed.',
    holdIntro: "Last year's amounts are filled in. Change anything that is different today.",
    holdIntroFirst:
      'Add what you hold today: bank accounts, cash, gold, shares, property for sale, money owed to you.',
    head: { holding: 'Holding', last: 'Last year', now: 'Today' },
    kinds: {
      cash: 'Cash and bank',
      gold: 'Gold',
      silver: 'Silver',
      shares: 'Shares',
      property: 'Property',
      receivable: 'Money owed to you',
      liability: 'Debt you owe',
      other: 'Other',
    },
    quantity: {
      cash: (c: string) => `Amount in ${c}`,
      gold: 'Weight in grams',
      silver: 'Weight in grams',
      shares: 'Number of shares',
      property: (c: string) => `Value today in ${c}`,
      receivable: (c: string) => `Amount in ${c}`,
      liability: (c: string) => `Due in the next 12 months, in ${c}`,
      other: (c: string) => `Amount in ${c}`,
    },
    details: 'Details',
    karat: 'Karat',
    fineness: 'Fineness (999 is pure)',
    jewellery: 'This is jewellery I wear',
    sharePrice: (c: string) => `Price per share today, in ${c}`,
    trading: 'Bought to sell',
    longTerm: 'Kept for the long term',
    fraction: 'Part of the value that counts, from 0 to 1 (0.25 is a common estimate)',
    companyPays: 'The company pays zakat for me',
    forSale: 'I mean to sell it',
    collectable: 'I expect to get it back',
    category: 'Type',
    categories: {
      pension: 'Pension',
      crypto: 'Crypto',
      'goods-for-sale': 'Goods for sale',
      other: 'Other',
    },
    zakatable: 'Count it for zakat',
    close: 'I no longer hold this',
    addTitle: 'Add something you hold',
    addName: 'Name',
    addNameHint: 'For example: Al Rajhi current account',
    addKind: 'Type',
    addCurrency: 'Currency',
    add: 'Add',
    invalidAmount: 'Use digits, with a dot for decimals, like 12,345.50',
    toHoldings: 'Continue to what you hold',
    toReview: 'Continue to review',
    toPrices: 'Back to date and prices',
    backToHoldings: 'Back to what you hold',
  },
  firstRun: {
    title: 'Work out your zakat privately',
    intro:
      'Your figures stay on this device. You keep them in a file that you save, and open again next year.',
    open: 'Open my file',
    startNew: 'Start new',
    setupTitle: 'Before you start',
    setupIntro: 'Pick what you follow. You can change any of this later in Settings.',
    start: 'Start',
  },
  settings: {
    title: 'Settings',
    intro:
      'Scholars differ on a few points. Pick what you follow. Each choice shows where it comes from.',
    frozenNote:
      'Changes apply to years you have not finished. Finished years keep the settings they were worked out with.',
    language: 'Language',
    dateDisplay: {
      title: 'Dates',
      hijri: 'Hijri',
      gregorian: 'Gregorian',
      both: 'Hijri and Gregorian',
    },
    baseCurrency: { title: 'Main currency', detail: 'Your zakat is worked out in this currency.' },
    yearRule: {
      title: 'What counts for this year',
      'whole-balance': {
        label: 'Everything you hold on your zakat day',
        detail: 'Includes money that arrived during the year. Accepted by all four schools.',
      },
      'lowest-balance': {
        label: 'Your lowest total during the year',
        detail:
          'Only money held for the whole year counts. We estimate it from last year and today; you can lower it.',
      },
    },
    yearType: {
      title: 'Zakat year',
      lunar: { label: 'Hijri year, 2.5%', detail: 'Your zakat date follows the Hijri calendar.' },
      solar: {
        label: 'Gregorian year, 2.5775%',
        detail:
          'If you keep your zakat date on the Gregorian calendar, the rate is raised to make up for the longer year.',
      },
    },
    nisabBasis: {
      title: 'Nisab',
      silver: {
        label: 'Silver: 595 grams',
        detail: 'The lower threshold, so more people pay and the poor benefit.',
      },
      gold: { label: 'Gold: 85 grams', detail: 'Twenty mithqal of gold.' },
    },
    jewelleryZakatable: {
      title: 'Jewellery you wear',
      yes: { label: 'Count it', detail: 'Gold and silver jewellery you wear is counted.' },
      no: {
        label: 'Do not count it',
        detail: 'Jewellery you wear for personal use is not counted.',
      },
    },
    deductDebts: {
      title: 'Debts you owe',
      no: {
        label: 'Do not take them off',
        detail:
          'Your debts do not reduce your zakat. Debts you paid before your zakat day are already gone from your balance.',
      },
      yes: {
        label: 'Take off what falls due in the next 12 months',
        detail:
          'Debts due within 12 months, and up to 12 months of instalments on longer debts. Interest is never taken off.',
      },
    },
    deductUnpaidPriorZakat: {
      title: 'Zakat you still owe from earlier years',
      yes: {
        label: "Take it off this year's total",
        detail: 'Unpaid zakat is a debt that must be paid, so it is taken off.',
      },
      no: { label: 'Do not take it off', detail: 'This year is worked out on its own.' },
    },
    sources: 'Sources',
  },
  passphrase: {
    title: 'Passphrase',
    off: 'Your file is not protected by a passphrase.',
    on: 'Your file and the copy in this browser are protected by a passphrase.',
    set: 'Set a passphrase',
    change: 'Change passphrase',
    remove: 'Remove passphrase',
    warning:
      'If you forget the passphrase, nobody can open your file. There is no way to reset it.',
    field: 'Passphrase',
    newField: 'New passphrase',
    confirm: 'Type it again',
    mismatch: 'The two passphrases do not match.',
    tooShort: 'Use at least 8 characters.',
    apply: 'Protect my file',
    applied: 'Passphrase set. Save your file to protect the copy on disk.',
    removed: 'Passphrase removed. Save your file to update the copy on disk.',
  },
  unlock: {
    title: 'Unlock your zakat file',
    intro: 'The copy in this browser is protected by a passphrase.',
    button: 'Unlock',
    wrong: 'That passphrase does not open this file. Check it and try again.',
  },
  prompts: {
    passphraseTitle: 'This file has a passphrase',
    passphraseBody: (name: string) => `Enter the passphrase for ${name}.`,
    open: 'Open',
    conflictTitle: 'Which copy do you want to keep?',
    conflictOlder: (name: string) => `${name} is older than the copy in this browser.`,
    conflictUnsaved: (name: string) =>
      `This browser has changes you have not saved. Opening ${name} replaces them.`,
    keepBrowser: 'Keep the copy in this browser',
    keepFile: (name: string) => `Open ${name}`,
    problemTitle: (name: string) => `${name} could not be opened`,
  },
  error: {
    title: 'Something went wrong',
    reload: 'Reload the page',
  },
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
