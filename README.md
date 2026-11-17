# Zakat Helper

Work out your yearly zakat in the browser. On your zakat date you record what you hold: bank accounts in any currency, gold, silver, shares, property for sale, money owed to you. The app shows what is zakatable, what is due, and tracks each payment until the year is settled. Next year it copies your holdings forward so you only update the numbers.

Arabic and English. Hijri (Umm al-Qura) and Gregorian dates. Works offline once loaded.

Live: https://zakat-helper.fahadamustafa.workers.dev

## Private by design

There is no server, no account and no analytics. Your figures stay on your device. You keep them in a file you save and open, optionally protected by a passphrase (AES-GCM, key derived in the browser). The browser keeps a working copy so a refresh is safe, but the file is the record: save it somewhere you trust. The site's content security policy blocks any request to another server.

## Where scholars differ

The points scholars disagree on are settings, each with a short explanation and its sources: everything held on zakat day or the lowest balance during the year, Hijri or Gregorian year, silver or gold nisab, worn jewellery, debts, unpaid zakat from earlier years, and per-holding choices for shares, property and money owed to you. The rules and their sources are in [skills/zakat/references/rules.md](skills/zakat/references/rules.md).

Zakat Helper is a calculator, not a fatwa. Every result shows the settings that produced it.

## Agent skill

`skills/zakat` is an [Agent Skill](https://agentskills.io) that runs the same calculation engine from Claude Code or any agent that supports skills. Copy the folder into your agent's skills directory (for Claude Code: `~/.claude/skills/zakat`). It needs Node.js 22 and no network access. See [SKILL.md](skills/zakat/SKILL.md) for the input format.

## Development

```bash
npm install
npm run dev          # local dev server
npm run verify       # typecheck, lint, format check, skill bundle check, unit tests, build
npm run test:e2e     # Playwright end-to-end tests (npx playwright install chromium first)
npm run build:skill  # rebuild skills/zakat/scripts/zakat.mjs after engine changes
npm run deploy       # build and deploy to Cloudflare Workers (needs wrangler login)
```

`src/engine` is the pure calculation engine shared by the app and the skill; `src/app` is the React UI.

MIT licence.
