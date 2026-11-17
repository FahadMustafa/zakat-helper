# zakat-helper

A privacy-first, browser-only app for working out yearly zakat: what you hold, what is zakatable, what is due, what you have paid and what is left. Arabic and English. The same zakat engine ships as an Agent Skill so people can run it in their own agent setups.

Status: v1 built and deployed to https://zakat-helper.fahadamustafa.workers.dev (not announced). Tasks live in beads (`bd ready`); epic `zakat-helper-aru` carries the build rulings in its notes.

## Build & Test

```bash
npm run verify    # gate before claiming done: typecheck + lint + format:check + test + build
npx vitest run <path>
npm run test:e2e  # Playwright (tests/e2e), 1 worker; not part of verify, run after UI changes
npm run build:skill  # after any engine/cli change, or verify fails on a stale skill bundle
npm run deploy    # build + npx wrangler deploy (Cloudflare Workers static assets)
```

- Playwright can't drive native file pickers: tests delete `showOpenFilePicker`/`showSaveFilePicker` (`tests/e2e/helpers.ts`) to use the download and `<input type=file>` path.

- `src/engine` is type-checked by `tsconfig.engine.json` with no DOM lib, so DOM use there fails the build.
- TypeScript is pinned to 6.0.x until typescript-eslint supports 7.

## Why

Fahad does his zakat once a year by hand: he picks a date, takes a checkpoint of every account balance and asset, compares it with last year's checkpoint to see what has been held a full year, then pays the due amount to several recipients over the following weeks. Multiple banks, multiple currencies, gold, shares and land make this a spreadsheet chore that has to be rebuilt from last year's notes. The app makes the yearly checkpoint quick, keeps the history, and tracks payments until the year is settled. Published for the public, so other people can follow their own rulings.

## Goals

- One yearly checkpoint per zakat date, copied forward from last year so you only update numbers.
- Work out the zakatable amount by the user's chosen year rule: everything held on zakat day (default) or lowest combined balance across the year.
- Due amount per year; payment ledger per year (several recipients, several dates); due / paid / remaining; settled years.
- Data never leaves the device. The user's file is the record; the browser keeps a working copy.
- Arabic (RTL) and English; Hijri (Umm al-Qura) and Gregorian dates.
- Settings for the points where scholars differ, each with a one-line explanation and sources.
- Easy and intuitive for a non-technical person doing this once a year.
- Zakat engine reusable as an Agent Skill.

## Non-goals (v1)

- No backend, accounts, analytics, telemetry or third-party scripts. No price or FX feeds (prices typed in; last year's shown as a hint).
- No cloud sync (Google Drive / OneDrive). The user puts the file wherever they like.
- No bank or broker integrations, no imports from statements.
- Not covered: livestock, agricultural produce, business accounting beyond simple "goods for sale", zakat al-fitr, several people in one file.

## Anti-goals

- Losing a user's history (browser storage wiped, unsaved changes, unreadable old file versions).
- Any data leaving the device.
- Presenting a ruling. The app calculates; it says plainly that it is not a fatwa and shows which settings produced the number.
- A finance-app feel: dense dashboards, jargon, ten screens to get one number.

## Constraints

- Static site only. Hosted on Cloudflare Workers static assets (assets-only, `not_found_handling: single-page-application`), `*.workers.dev` URL until a domain is bought. Wrangler is used via `npx wrangler` (account: Fahad's personal Cloudflare).
- Public GitHub repo `FahadMustafa/zakat-helper` (use the `FahadMustafa` gh account, not `fahad-zaintech`). MIT licence.
- Money is exact: decimal arithmetic or integer minor units. Never JavaScript floats for amounts, quantities or prices.
- Every zakat rule cites at least one published source in `skills/zakat/references/rules.md`.
- Latest package versions at build time; TypeScript strict to the max; zod at every file boundary.

## Approaches considered

- **A. The file is the record (chosen).** Open file, work, save. Chrome/Edge save back to the same file (File System Access API); Firefox/Safari download a new copy. Browser keeps a working copy so refreshes are safe. Chosen because Safari deletes script-written storage after ~7 days without a visit, and this app is opened once a year.
- **B. Browser storage is the record, export as backup.** Rejected: relies on users exporting; Safari silently wipes history.
- **C. Sync via the user's Google Drive / OneDrive.** Rejected for v1: app registration, sign-in and a third party in a no-third-party design. Revisit if users ask.

## Decided

### Yearly model

- A **checkpoint** is one zakat date: the date, the prices on that date, and the quantity of every holding in its own unit (SAR amount, USD amount, grams, shares, a plot).
- A checkpoint is a `draft` until the user **finalises** it. Finalising freezes the settings used, the prices and the computed due amount, so changing settings later never rewrites history. A finalised checkpoint can be reopened to a draft deliberately (with a warning if it has payments).
- **Year rule: everything held on zakat day** (default). Every zakatable holding on the checkpoint date counts, including money that arrived during the year, provided nisab was held at the previous zakat date (taken from the previous checkpoint's result; asked once on the first checkpoint). This is the Hanafi position; the other schools accept it as paying the newer money's zakat early (IslamQA 50801, Standing Committee). Valid in every school, so it is the default.
- **Year rule: lowest combined balance** (option). The zakatable base is the lowest total of all zakatable wealth at any point in the year (MUIS Singapore, TAIB Brunei; fits the Shafi'i/Maliki/Hanbali view). The app pre-fills an estimate: the lower of last checkpoint's holdings and this checkpoint's holdings, **both valued at this checkpoint's prices** (holdings closed during the year use last checkpoint's value). The user can lower it from statements. The true lowest balance can never exceed this estimate, so the estimate never under-counts against this method. Transfers between banks, currency changes and buying gold with cash cancel out because the comparison is on combined totals, not per holding. If the total dipped below nisab during the year, the user marks it and the year restarts (nothing due this checkpoint).
- **First checkpoint** (no previous one): for the lowest-balance rule the user enters last zakat date's total (or holdings) or the lowest balance directly; for the default rule, a yes/no "did you hold at least nisab at your last zakat date?".
- **Gaps and uneven spacing**: a checkpoint compares with the latest earlier checkpoint. If the gap is noticeably more or less than a year (lunar or solar per settings), warn and offer to add the missing year. Past years can be entered after the fact.
- Holdings keep a stable identity across years (name, kind, currency); a new year copies the last checkpoint forward. Holdings can be added and closed. Per-year facts live on the checkpoint entry, not the holding: quantity and classification (for sale, collectable, trading vs long-term, personal jewellery, company pays zakat), so reopening an earlier year never changes it.
- Nisab is checked against the total qualifying zakatable value on the checkpoint date. Below nisab: nothing due, and the screen says why.

### Payments

- A payment: date, recipient (reusable list), amount and currency sent, the base-currency value on the payment date, optional note.
- Each payment belongs to one checkpoint; the checkpoint shows due, paid, remaining and becomes settled when remaining reaches zero (overpayment shown as such). A year with nothing due shows as nothing due, with the reason.
- **Advance payments**: logged against "next zakat" before its checkpoint exists, attached when that checkpoint is finalised. Only allowed once the user holds nisab (agreed condition, al-Mughni 2/260).
- Unpaid zakat from an earlier year can be deducted from the next year's base (setting, on by default; NZF, Hanafi sources).
- Unpaid amounts stay on their own year. Opening a new checkpoint warns if an earlier year has a balance.
- Each checkpoint is in one base currency chosen in settings.

### Settings (where rulings differ)

Defaults in **bold**, each option with a one-line explanation and source links in the app. Findings and sources below go into `skills/zakat/references/rules.md` before the engine is written; AAOIFI SS 35 points are second-hand (via ZATCA and NZF) and marked as such.

- **Year rule**: **everything held on zakat day** / lowest combined balance (above).
- **Year type**: **lunar, 2.5%** / solar, 2.5775% (AAOIFI FAS 9 and ZATCA's Fiqh of Estimation summary; NZF quotes 2.577% and recommends lunar).
- **Nisab basis**: **silver, 595 g** (Makkah Fiqh Council via IslamQA 337998, Islamic Relief: the lower value, better for the poor) / gold, 85 g (20 mithqal x 4.25 g). Show the figures' source; note Islamic Relief's tola figures 87.48 g / 612.36 g.
- **Gold and silver**: weight plus purity (karat for gold, fineness for silver); value and nisab on pure content. Dar al-Ifta fatwa 7705 frames nisab as 85 g of 21-carat gold; note it.
- **Personal jewellery**: **zakatable** (Hanafi; Saudi Standing Committee, Ibn Baz, Ibn Uthaymeen, IslamQA 19901) / exempt (Maliki, Shafi'i, Hanbali; Dar al-Ifta fatwa 7733). Held for trade or hoarding is zakatable either way.
- **Shares**, per holding: **trading, full market value** / long-term, **25% of market value** default, editable (NZF, Islamic Relief; 30% is Joe Bradford/ZakatView). Flag "the company pays zakat for me" excludes the holding (Saudi-listed companies paying ZATCA; IslamQA 380902, 69912).
- **Land and property**: zakatable at market value only when marked for sale; home exempt by consensus; no clear intent to sell, no zakat; rental property counts its rent once in cash, not its value (IslamQA 231858).
- **Money owed to you**, per holding: **collectable, counted yearly** / doubtful, not counted until received (then one year, per IslamQA 125854 / 1817).
- **Debts you owe**: **not deducted** (Standing Committee, Ibn Baz, Ibn Uthaymeen; Shafi'i new view; IslamQA 22426) / deduct what falls due in the next 12 months, plus 12 months of long-term instalments (NZF, Hanafi/Hanbali schools).
- **Currencies**: combined at the zakat-date rate the user could actually get (IslamQA 337998).
- **Pensions and crypto**: flagged "you decide" with both positions linked (AMJA 23284 / 21964; NZF crypto page).
- No school presets in v1 (accuracy risk of claiming a whole school's position). Revisit once rules.md is reviewed.

Sources retrieved during design (2026-11-17):

- IslamQA: 50801 (hawl), 337998 (currencies, nisab for cash), 19901 and 59866 (jewellery), 380902 and 69912 (shares, company pays), 231858 (real estate), 125854 and 1817 (debts owed to you), 22426 (debts you owe), 98528 (advance payment): `https://islamqa.info/en/answers/<n>`
- Dar al-Ifta Egypt: https://www.dar-alifta.org/en/fatwa/details/7705/is-zakat-payable-on-the-gold-and-silver-jewelry-that-a-woman-owns , https://www.dar-alifta.org/en/fatwa/details/7733/paying-zakat-on-jewelry
- NZF: https://nzf.org.uk/knowledge/can-a-solar-year-be-used-for-zakat-calculation/ , https://nzf.org.uk/knowledge/shares-unit-trusts-and-equity-investments/ , https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/ , https://nzf.org.uk/knowledge/will-an-outstanding-zakat-debt-be-deductible-when-calculating-my-zakat-for-this-year/ , https://nzf.org.uk/knowledge/is-zakat-due-on-all-currencies/ , https://nzf.org.uk/knowledge/zakat-on-cryptocurrencies/
- ZATCA: https://zatca.gov.sa/en/MediaCenter/Publications/Documents/Summary%20Fiqh%20of%20Zakat%20Estimation%20Book-En.pdf
- Islamic Relief nisab: https://islamic-relief.org/nisab/
- MUIS lowest-balance method: https://www.zakat.sg/types-of-zakat/zakat-on-savings/ (seen via search only; re-check)
- Hawl overview: https://joebradford.substack.com/p/hawl-passing-of-one-year-for-zakat , https://www.alim.org/hadith/fiqh-us-sunnah/3/8/
- AMJA pensions: https://www.amjaonline.org/fatwa/en/23284/zakat-and-the-401k-retirement-plan , https://www.amjaonline.org/fatwa/en/21964/zakat-on-401k-or-retirement-plan
- Not retrieved directly: AAOIFI Shari'ah Standard 35 text. Obtain before publishing.

### Files and storage

- Profile file: JSON, `{ "format": "zakat-helper", "version": N, ... }`, validated with zod on open; old versions migrate forward, never rejected. Unknown or future versions are refused with a clear message, not half-loaded.
- Optional passphrase encryption: WebCrypto AES-GCM, key from PBKDF2-SHA-256 (iterations per current OWASP guidance). Envelope stores salt, IV and ciphertext. The UI warns that a lost passphrase means lost data. Same code runs in Node for the skill.
- Working copy in IndexedDB; `navigator.storage.persist()` requested. When the file is encrypted the working copy is encrypted too, and a reload asks for the passphrase. Unsaved-changes indicator and `beforeunload` warning. A gentle "save your file" nudge after finalising a year or adding payments.
- Every save stamps a revision counter and timestamp in the file. Opening a file older than the working copy says so and lets the user choose; nothing is overwritten silently.

### Dates and language

- Stored dates are ISO Gregorian; Hijri is display and input only. Display via `Intl.DateTimeFormat` with `islamic-umalqura`; Hijri input converts to Gregorian (no date library unless a gap appears).
- UI strings in typed dictionaries (`en`, `ar`); a missing key is a compile error. Numbers and currency via `Intl.NumberFormat`. Layout uses CSS logical properties so `dir="rtl"` flips everything.

### Code layout

- `src/engine/`: pure TypeScript, no DOM, no framework. Profile types and zod schema, the calculation, migrations. TDD with worked examples (each rule option, first year, below nisab, dips, FX, advance payments, overpayment).
- `src/app/`: React UI over the engine.
- `skills/zakat/`: Agent Skill (agentskills.io spec): `SKILL.md` (how to collect inputs, pick settings, run the script, explain results; not a fatwa), `references/rules.md` (rules, madhhab differences, sources), `scripts/zakat.mjs` (the engine bundled into one Node file, committed; reads a zakat-helper profile file, encrypted or not (passphrase from an environment variable), or a minimal input JSON, and prints the breakdown). SKILL.md warns that using it with a cloud model sends the figures to that provider. A check fails the build if the bundled script is out of date with the engine.

### Stack

- Vite, React, TypeScript (strict), zod, Vitest, ESLint with autofix, Prettier. One Playwright smoke test: create, fill a checkpoint, save, reopen, numbers match, in English and Arabic.
- Installable and offline (service worker / PWA).
- Self-hosted or system fonts only; strict CSP (`default-src 'self'`) via `_headers`, so the no-third-party promise is enforced by the browser.

### Look and feel

Approved 2026-11-17 (tokens in `src/app/styles/tokens.css`): a calm single column like a booklet page, start-aligned so it mirrors in Arabic. Amiri for headings and big figures, Readex Pro for UI, both self-hosted via @fontsource. Ink-well teal primary; gold only for amounts due and the "1 in 40" mark (40 squares, one gold), the single bold element.

Clean, elegant, simple, easy to use. Run the `frontend-design` skill before any UI code: token plan (palette, type with Arabic coverage, layout) plus mockups of home, the checkpoint flow and the payments view, approved by Fahad before building screens.

Main flow:

- First run: open a file or start new, then language, base currency and rule settings (sensible defaults, explanations inline).
- Home: list of zakat years with status (draft / due / settled) and outstanding amount; one primary action "Start this year's zakat".
- Checkpoint: date and prices, then holdings (each row shows last year next to this year), then the breakdown, then finalise.
- Payments: add a payment from the year's page; due / paid / remaining always visible.

## Left to the builder

- Choice of decimal approach (library vs scaled bigint), date-input widget, IndexedDB wrapper or none.
- Digit style for Arabic (Arabic-Indic vs Western) and whether to offer a toggle.
- Exact file schema field names and migration mechanics.
- PWA mechanics, Cloudflare config details, CI (a GitHub Action running the verify gate is enough).
- Later, not v1: a downloadable single-file HTML build users can run offline from disk as a trust signal.

# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**

- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.

<!-- END BEADS INTEGRATION -->
