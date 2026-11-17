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
