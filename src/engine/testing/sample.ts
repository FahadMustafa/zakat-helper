import type { Profile } from '../schema';

/** Example profile used across engine tests and the skill CLI check. Figures are examples. */
export function sampleProfile(): Profile {
  return {
    format: 'zakat-helper',
    version: 1,
    meta: { profileId: '6f1c2b8e-3a4d-4c5e-9f60-7a8b9c0d1e2f', revision: 3, savedAt: null },
    settings: {
      locale: 'en',
      dateDisplay: 'both',
      baseCurrency: 'SAR',
      yearRule: 'whole-balance',
      yearType: 'lunar',
      nisabBasis: 'silver',
      jewelleryZakatable: true,
      deductDebts: false,
      deductUnpaidPriorZakat: true,
    },
    holdings: [
      { id: 'rajhi', kind: 'cash', name: 'Al Rajhi current account', currency: 'SAR' },
      { id: 'snb', kind: 'cash', name: 'SNB savings', currency: 'SAR' },
      { id: 'hsbc', kind: 'cash', name: 'HSBC dollar account', currency: 'USD' },
      { id: 'bars', kind: 'gold', name: 'Gold bars' },
      { id: 'ring', kind: 'silver', name: 'Silver ring' },
      { id: 'tasi', kind: 'shares', name: 'Tadawul shares', currency: 'SAR' },
      { id: 'plot', kind: 'property', name: 'Plot in Al Narjis', currency: 'SAR' },
      { id: 'loan', kind: 'receivable', name: 'Loan to a friend', currency: 'SAR' },
      { id: 'card', kind: 'liability', name: 'Credit card', currency: 'SAR' },
      { id: 'pension', kind: 'other', name: 'GOSI pension', currency: 'SAR' },
    ],
    checkpoints: [
      {
        id: 'cp-1447',
        date: '2026-03-01',
        baseCurrency: 'SAR',
        heldNisabAtPrevious: true,
        prices: {
          fx: { USD: '3.75' },
          metalPerGramPure: { gold: '400', silver: '5' },
          perHolding: { tasi: '32' },
        },
        entries: [
          { kind: 'cash', holdingId: 'rajhi', amount: '95000' },
          { kind: 'cash', holdingId: 'snb', amount: '80000' },
          { kind: 'cash', holdingId: 'hsbc', amount: '18000' },
          { kind: 'gold', holdingId: 'bars', grams: '100', karat: 21, personalJewellery: false },
          {
            kind: 'silver',
            holdingId: 'ring',
            grams: '10',
            fineness: 925,
            personalJewellery: true,
          },
          {
            kind: 'shares',
            holdingId: 'tasi',
            count: '500',
            treatment: { kind: 'trading' },
            companyPaysZakat: true,
          },
          { kind: 'property', holdingId: 'plot', forSale: false },
          { kind: 'receivable', holdingId: 'loan', amount: '5000', collectable: false },
          { kind: 'liability', holdingId: 'card', deductibleAmount: '3000' },
          {
            kind: 'other',
            holdingId: 'pension',
            amount: '40000',
            category: 'pension',
            zakatable: false,
          },
        ],
        status: 'draft',
      },
    ],
    payments: [],
    recipients: [{ id: 'ehsan', name: 'Ehsan platform' }],
  };
}
