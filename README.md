# staging-bug-pack

> Client-side web app for GitHub-issue-ready staging bug reproduction packs.

## Quick start

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or open `index.html` directly.

## Features
- Title, Browser, OS (required); Staging URL + test account notes (optional)
- Dynamic steps to reproduce
- Expected / Actual (required)
- Screenshot uploads 0–5 with Markdown placeholders
- Live Markdown preview, copy, download `.md`
- Empty required fields block export with inline errors
- No auth / no backend

## Tests
```bash
node tests/test-logic.js
```

## Acceptance criteria
See PR #1. Built via Antigravity.
