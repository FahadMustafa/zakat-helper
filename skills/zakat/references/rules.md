# Zakat rules used by Zakat Helper

This file is the single reference for every rule the calculator applies. Each section gives the options, the default, a one-line explanation (also used as app copy), where scholars differ, and sources. All sources were retrieved on 2026-11-17 unless marked otherwise.

**This is a calculator, not a fatwa.** It applies the settings the user picks. Where scholars differ, the user should follow their own scholar.

## Constants

| Name                     | Value                | Basis                                                 |
| ------------------------ | -------------------- | ----------------------------------------------------- |
| Gold nisab               | 85 g pure gold       | 20 mithqal x 4.25 g. IslamQA 337998; Dar al-Ifta 7733 |
| Silver nisab             | 595 g pure silver    | 200 dirhams x 2.975 g. IslamQA 337998                 |
| Rate, lunar year         | 0.025                | Consensus                                             |
| Rate, solar year         | 0.025775             | ZATCA, Summary of Fiqh of Zakat Estimation, p. 28     |
| Gold purity              | karat / 24           | 24 karat is pure gold                                 |
| Silver purity            | fineness / 1000      | 999 is pure silver                                    |
| Long-term shares default | 0.25 of market value | NZF                                                   |
| Lunar year length        | 354 days             |                                                       |
| Solar year length        | 365 days             |                                                       |
| Gap warning tolerance    | 15 days              | App choice, not a ruling                              |

## Year rule: what counts for this year

- **Everything you hold on your zakat day** (default). Explanation: "Includes money that arrived during the year. Accepted by all four schools." In the Hanafi school, money that arrives during the year joins the year of the nisab you already held. The other schools give new money its own year but accept paying it early: IslamQA 50801 recommends paying on all savings at one date, and counts the extra as zakat paid in advance (the Standing Committee calls it a "down payment"). Condition: nisab was held at the previous zakat date.
- **Your lowest total during the year**. Explanation: "Only money held for the whole year counts. We estimate it from last year and today; you can lower it." MUIS Singapore: zakat is 2.5% of the lowest balance held during the haul; with several accounts, take the lowest combined total at a single point in time, not the sum of each account's own lowest. If savings fall below nisab at any point, the haul breaks and nothing is due for that period. IslamQA 50801 agrees that falling below nisab restarts the year.
- The app's estimate for the lowest-total rule is the lower of last checkpoint's holdings and today's holdings, both valued at today's prices. The true lowest balance is never higher than this. Converting cash to goods for trade, or the reverse, does not affect the year (ZATCA, Summary of Fiqh of Zakat Estimation, p. 27), which is why the comparison uses combined totals, not individual accounts.

Sources:

- https://islamqa.info/en/answers/50801
- MUIS via ask.gov.sg and zakat.sg (403 to automated fetch; content seen through search results only, re-check by hand before publishing): https://ask.gov.sg/muis/questions/clks0tqgo007ql90fmvpc8okw , https://www.zakat.sg/types-of-zakat/zakat-on-savings/
- https://zatca.gov.sa/en/MediaCenter/Publications/Documents/Summary%20Fiqh%20of%20Zakat%20Estimation%20Book-En.pdf

## Year type

- **Lunar year, 2.5%** (default). Explanation: "The zakat year follows the Hijri calendar."
- **Solar year, 2.5775%**. Explanation: "If you keep your zakat date on the Gregorian calendar, the rate is raised to make up for the longer year." ZATCA calls 2.5775% "the most appropriate and closest opinion to the original ruling". NZF quotes 2.577%, attributes it to the AAOIFI Shari'ah Standards, and itself advises using the lunar calendar.
- AAOIFI Shari'ah Standard 35 text was not retrieved (the compiled standards PDF could not be downloaded). The AAOIFI attribution is second-hand via NZF.

Sources:

- https://zatca.gov.sa/en/MediaCenter/Publications/Documents/Summary%20Fiqh%20of%20Zakat%20Estimation%20Book-En.pdf (p. 28)
- https://nzf.org.uk/knowledge/can-a-solar-year-be-used-for-zakat-calculation/

## Nisab basis

- **Silver, 595 g** (default). Explanation: "The lower threshold, so more people pay and the poor benefit." The Islamic Fiqh Council in Makkah: "Zakah on cash becomes due when the value reaches the lower of the two nisabs of gold or silver" (via IslamQA 337998), which ties the cash nisab to 595 g of silver. Islamic Relief: "Most scholars advise people to use the silver value."
- **Gold, 85 g**. Explanation: "Twenty mithqal of gold." Used by Dar al-Ifta Egypt.
- Notes shown in the app: Islamic Relief uses 87.48 g gold and 612.36 g silver (South Asian tola figures). Dar al-Ifta fatwa 7705 states the nisab as "85 grams of 21 carat gold". The app uses pure-metal grams for both.

Sources:

- https://islamqa.info/en/answers/337998/giving-zakaah-on-cash-in-a-different-currency
- https://islamic-relief.org/nisab/
- https://www.dar-alifta.org/en/fatwa/details/7705/is-zakat-payable-on-the-gold-and-silver-jewelry-that-a-woman-owns

## Gold and silver

- Value = weight x purity x price per gram of pure metal. Gold purity is karat / 24, silver purity is fineness / 1000.
- Gold and silver held as savings or bullion are always zakatable.

## Personal jewellery

- **Counted** (default). Explanation: "Gold and silver jewellery you wear is counted." The Standing Committee (9/264), Ibn Baz and Ibn Uthaymeen hold that zakat on jewellery is obligatory, and IslamQA 19901 calls it "the more correct of these two views". This is also the Hanafi position.
- **Not counted**. Explanation: "Jewellery you wear for personal use is not counted." Dar al-Ifta Egypt: "jewelry kept for personal use is non-zakatable." This is the Maliki, Shafi'i and Hanbali school position.
- Jewellery held for trade or saving is counted either way.

Sources:

- https://islamqa.info/en/answers/19901
- https://www.dar-alifta.org/en/fatwa/details/7733/paying-zakat-on-jewelry

## Shares

Per holding, each year:

- **For trading** (default). Explanation: "Shares you bought to sell are counted at full market value." NZF: "If shares are bought to sell ... Zakāt is due on the total share value."
- **Long-term**. Explanation: "For shares you keep, only the company's zakatable assets count. 25% of market value is a common estimate; change it if you know the real figure." NZF uses 25% as a proxy when balance sheets are hard to check.
- **The company pays zakat for you**. Explanation: "Not counted when the company pays zakat on your behalf." Ibn Uthaymeen (IslamQA 380902): if the state collects zakat from the company using precise calculations, the shareholder need not pay. The Standing Committee and the Fiqh Council accept company payment with the shareholder's permission, by company regulations, or by state law (IslamQA 69912). Saudi-listed companies pay zakat to ZATCA.

Sources:

- https://nzf.org.uk/knowledge/shares-unit-trusts-and-equity-investments/
- https://islamqa.info/en/answers/380902
- https://islamqa.info/en/answers/69912

## Land and property

Per holding, each year:

- **For sale**: counted at market value. Explanation: "Property you mean to sell is counted at today's value."
- **Not for sale** (default for property): not counted. Explanation: "Your home and property you are not selling are not counted." A home is exempt by consensus. If there is no firm intention to sell, nothing is due; Ibn Uthaymeen: "when there is hesitation, even if it is only one percent, no zakah is due."
- **Rented out**: the property's value is not counted; the rent is counted as cash once it is saved. The app treats rental property as not for sale and the rent as part of the user's cash.

Source: https://islamqa.info/en/answers/231858/how-to-pay-zakah-on-real-estate

## Money owed to you

Per holding, each year:

- **Expected to be repaid** (default). Explanation: "Counted every year, as if it were in your hands. You may delay paying until you receive it."
- **Doubtful**. Explanation: "Not counted until you get it back. Then pay one year's zakat on it." This is the view of Ibn Uthaymeen and the Standing Committee; IslamQA notes scholars differ.

Source: https://islamqa.info/en/answers/125854

## Debts you owe

- **Not deducted** (default). Explanation: "Your debts do not reduce your zakat. Debts you pay off before your zakat day are already gone from your balance." Ibn Baz, Ibn Uthaymeen and the Permanent Committee (IslamQA 22426). Ibn Uthaymeen allows paying a debt that is due now and being demanded first, then paying zakat on what is left; a debt not yet due is never deducted. This is also the Shafi'i new view.
- **Deduct what falls due in the next 12 months**. Explanation: "Debts due within 12 months, and up to 12 months of instalments on longer debts, reduce what is counted. Interest is never deducted." NZF; the Hanafi and Hanbali schools allow deducting debts. NZF advises using the long-term allowance only when paying zakat would threaten your repayments.

Sources:

- https://islamqa.info/en/answers/22426/is-zakaah-required-of-one-who-is-in-debt
- https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/

## Unpaid zakat from earlier years

- **Deducted** (default). Explanation: "Zakat you still owe from earlier years is a debt and is taken off this year's total." NZF: "Missed Zakat is treated as a liability that needs to be paid off immediately, hence, it is deductible" (approved by Mufti Amjad, 13 August 2023).
- **Not deducted**.
- Unpaid zakat never lapses; the app keeps it on its own year until paid.
- Only payments dated on or before this checkpoint's date count when working out what is still owed.
- Not verified for the Shafi'i and Hanbali schools.

Source: https://nzf.org.uk/knowledge/will-an-outstanding-zakat-debt-be-deductible-when-calculating-my-zakat-for-this-year/

## Paying in advance

- Allowed once you hold nisab. Abu Hanifa, al-Shafi'i and Ahmad permit it on that condition; waiting until it is due is preferable without a reason. The Standing Committee allowed one or two years ahead when it serves an interest.
- The app accepts advance payments only when the latest finished year was above nisab, and attaches them to the next year when it is finished.

Source: https://islamqa.info/en/answers/98528

## Currencies

- All currencies are combined at the rate on the zakat date. Explanation: "Use the best rate you could actually get, so the poor are not short-changed." IslamQA 337998: work it out "on the basis of the highest rate at which he could exchange".

Source: https://islamqa.info/en/answers/337998/giving-zakaah-on-cash-in-a-different-currency

## You decide: pensions and crypto

The app records these as "other" with a "count it" switch the user sets.

- **Pensions**: AMJA (Dr. Main Al-Qudah): zakat is due on what you are legally allowed to withdraw, minus any penalty and tax; if you cannot withdraw, it is not zakatable yet.
- **Crypto**: NZF: coins such as Bitcoin are zakatable at market value "because of their utility as currencies"; tokens depend on what they represent. Some scholars consider dealing in crypto impermissible.

Sources:

- https://www.amjaonline.org/fatwa/en/23284/zakat-and-the-401k-retirement-plan
- https://www.amjaonline.org/fatwa/en/21964/zakat-on-401k-or-retirement-plan
- https://nzf.org.uk/knowledge/zakat-on-cryptocurrencies/

## Open before public launch

- AAOIFI Shari'ah Standard 35 text not obtained. Points attributed to AAOIFI are second-hand via NZF and ZATCA.
- MUIS pages returned 403 to automated fetch; re-check the lowest-balance method by hand.
