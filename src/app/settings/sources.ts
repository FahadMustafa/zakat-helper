// Source links shown under each setting. Full text and quotes: skills/zakat/references/rules.md.
export type Source = { label: string; url: string };

export const SOURCES = {
  yearRule: [
    { label: 'IslamQA 50801', url: 'https://islamqa.info/en/answers/50801' },
    { label: 'MUIS Singapore', url: 'https://www.zakat.sg/types-of-zakat/zakat-on-savings/' },
  ],
  yearType: [
    {
      label: 'ZATCA, Fiqh of Zakat Estimation',
      url: 'https://zatca.gov.sa/en/MediaCenter/Publications/Documents/Summary%20Fiqh%20of%20Zakat%20Estimation%20Book-En.pdf',
    },
    {
      label: 'NZF',
      url: 'https://nzf.org.uk/knowledge/can-a-solar-year-be-used-for-zakat-calculation/',
    },
  ],
  nisabBasis: [
    {
      label: 'IslamQA 337998',
      url: 'https://islamqa.info/en/answers/337998/giving-zakaah-on-cash-in-a-different-currency',
    },
    { label: 'Islamic Relief', url: 'https://islamic-relief.org/nisab/' },
  ],
  jewelleryZakatable: [
    { label: 'IslamQA 19901', url: 'https://islamqa.info/en/answers/19901' },
    {
      label: 'Dar al-Ifta 7733',
      url: 'https://www.dar-alifta.org/en/fatwa/details/7733/paying-zakat-on-jewelry',
    },
  ],
  deductDebts: [
    {
      label: 'IslamQA 22426',
      url: 'https://islamqa.info/en/answers/22426/is-zakaah-required-of-one-who-is-in-debt',
    },
    { label: 'NZF', url: 'https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/' },
  ],
  deductUnpaidPriorZakat: [
    {
      label: 'NZF',
      url: 'https://nzf.org.uk/knowledge/will-an-outstanding-zakat-debt-be-deductible-when-calculating-my-zakat-for-this-year/',
    },
  ],
} as const satisfies Record<string, readonly Source[]>;
