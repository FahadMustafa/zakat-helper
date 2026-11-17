---
name: zakat
description: Work out yearly zakat on cash in several currencies, gold, silver, shares, property, money owed and debts, with the rulings where scholars differ as explicit settings (nisab basis, jewellery, debts, lunar or solar year, everything-held vs lowest-balance). Runs a bundled calculator on a file saved by the Zakat Helper app or on a short JSON input built from the conversation. Use when someone asks how much zakat they owe, whether they are above nisab, how to count gold, shares or a property for zakat, or wants to check a Zakat Helper file.
license: MIT
compatibility: Requires Node.js 22 or later. No network access needed.
metadata:
  author: Fahad Mustafa
  source: https://github.com/FahadMustafa/zakat-helper
---

# Zakat

Calculates zakat with the same engine as the Zakat Helper web app. It is a calculator, not a fatwa: say so when you give a figure, and point to the settings that produced it.

## Privacy

The calculation runs locally. But anything the user tells you, and anything the script prints, is now in this conversation and goes to the model provider. Say this once before collecting figures if the user seems to expect the privacy of the web app, and offer the app (https://zakat-helper.fahadamustafa.workers.dev) as the private option.

## Steps

1. **Collect the date and prices.** The zakat date, the base currency, the exchange rate for each other currency (1 unit = x base), and the price per gram of pure gold and pure silver in the base currency. Ask the user for prices; do not invent them. If they don't know, tell them where to look (their bank's rate, a local gold price for 24 karat) rather than guessing.
2. **Collect holdings.** For each item: what it is and the figures listed in the input format below. Ask the per-item questions that change the result:
   - gold or silver: weight, karat or fineness, and whether it is jewellery they wear
   - shares: bought to sell (trading) or kept (long-term), and whether the company pays zakat for them
   - property: is it for sale? If yes, today's value
   - money owed to them: do they expect it back?
   - debts: how much falls due in the next 12 months
   - pensions and crypto: whether they count it (see rules)
3. **Ask the first-year question.** Did they hold at least nisab on their previous zakat date? If not, nothing is due yet.
4. **Settle the settings that differ between scholars.** Read [references/rules.md](references/rules.md) and ask only about settings that affect this user's holdings. Defaults: everything held on zakat day, lunar year, silver nisab, worn jewellery counted, debts not deducted, unpaid earlier zakat deducted.
5. **Run the script** (path relative to this skill's folder):
   ```bash
   node scripts/zakat.mjs --input input.json
   node scripts/zakat.mjs path/to/zakat-file.json [--checkpoint <id>]
   ZAKAT_PASSPHRASE='...' node scripts/zakat.mjs encrypted-file.json
   ```
   With a saved file it uses the latest checkpoint unless `--checkpoint` is given. Avoid putting a passphrase in shell history; let the user set the variable themselves if they prefer.
6. **Explain the result.** Lead with the amount due (or why nothing is due), then the lines that were not counted and why, the nisab used, and the settings. If `result.ok` is false, `result.missing` lists what to ask for (a price, an exchange rate, a metal price, or the first-year answer).

## Input format (`--input`)

All amounts are decimal strings without grouping separators (`"95000"`, `"3.75"`).

```json
{
  "date": "2026-03-01",
  "baseCurrency": "SAR",
  "heldNisabAtPreviousZakatDate": true,
  "prices": { "fx": { "USD": "3.75" }, "goldPerGramPure": "400", "silverPerGramPure": "5" },
  "settings": { "nisabBasis": "silver", "jewelleryZakatable": true },
  "holdings": [
    { "kind": "cash", "name": "Al Rajhi current account", "currency": "SAR", "amount": "95000" },
    { "kind": "cash", "name": "HSBC dollar account", "currency": "USD", "amount": "18000" },
    { "kind": "gold", "name": "Gold bars", "grams": "100", "karat": 21, "personalJewellery": false }
  ]
}
```

Holding kinds and their fields:

| kind         | fields                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cash`       | `currency`, `amount`                                                                                                                     |
| `gold`       | `grams`, `karat` (1-24), `personalJewellery`                                                                                             |
| `silver`     | `grams`, `fineness` (1-1000), `personalJewellery`                                                                                        |
| `shares`     | `currency`, `count`, `pricePerShare`, `treatment` (`trading` or `long-term`), `zakatableFraction` (default `"0.25"`), `companyPaysZakat` |
| `property`   | `currency`, `forSale`, `value` (needed when for sale)                                                                                    |
| `receivable` | `currency`, `amount`, `collectable`                                                                                                      |
| `liability`  | `currency`, `deductibleAmount` (what falls due in the next 12 months)                                                                    |
| `other`      | `currency`, `amount`, `category` (`pension`, `crypto`, `goods-for-sale`, `other`), `zakatable`                                           |

Optional top-level fields: `settings` (any of `yearRule`, `yearType`, `nisabBasis`, `jewelleryZakatable`, `deductDebts`, `deductUnpaidPriorZakat`) and `lowestBalance` (for the lowest-balance rule, the user's lowest total during the year in the base currency).

## Output

JSON with `checkpoint`, the `settings` used, `result` (per-holding `lines` with a `reason`, totals, `nisabThreshold`, `rate`, and `outcome`: `{ "kind": "due", "due": "4937.5" }` or `{ "kind": "nothing-due", "reason": "below-nisab" }`), and `year` (paid and remaining, for saved files with payments).

Line reasons: `counted`, `long-term-fraction`, `jewellery-exempt`, `company-pays`, `not-for-sale`, `doubtful-debt`, `not-zakatable-by-user`, `deducted-debt`, `debt-not-deducted`.
