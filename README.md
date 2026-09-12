# staging-bug-pack 📦

> A client-side web application for generating structured, GitHub-issue-ready Markdown reproduction packs for staging bugs.

`staging-bug-pack` standardizes QA bug reports so developers receive the exact reproduction steps, environment details, expected/actual behaviors, and screenshot placeholders needed to investigate and fix bugs quickly.

Zero build steps. Zero backend. Zero tracking. Zero external network calls. Runs 100% locally in your browser.

---

## 🚀 Quick Start (Local One-Liners)

No dependencies or build steps are required. You can run it with any of the following one-liners:

### Option 1: Direct browser open (no server needed)
```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

### Option 2: Python 3 built-in server
```bash
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### Option 3: Node.js `npx serve`
```bash
npx serve .
# Then open the displayed URL (e.g. http://localhost:3000)
```

### Option 4: PHP built-in server
```bash
php -S localhost:8000
```

---

## ✨ Features

- **Standardized Reproduction Form**:
  - **Issue Title** (required): concise summary used as issue title and H1 heading.
  - **Environment Details**:
    - Staging URL (optional)
    - Browser (required, with autocomplete suggestions + **Auto-detect Env** button)
    - Operating System (required, with autocomplete suggestions)
    - Test Account Notes (optional, role, permissions, flags)
  - **Dynamic Steps to Reproduce** (required):
    - Add, delete, and reorder steps (move up/down)
    - Validation guarantees at least one non-empty step
  - **Expected Behavior** (required textarea)
  - **Actual Behavior** (required textarea)
  - **Console Notes** (optional textarea): included in Markdown only when filled
  - **Network Notes** (optional textarea): included in Markdown only when filled
  - **Screenshot Evidence Upload (0–5 files)**:
    - Drag & drop zone or file browser
    - Visual thumbnail previews with filenames and file sizes
    - Remove individual screenshots
    - Enforced 5-screenshot limit
    - Export lists filenames and provides Markdown image placeholders: `![screenshot-N](filename)`
- **Strict Validation**:
  - Export, Copy, and **Open GitHub Issue** buttons are strictly disabled until all required fields are valid.
  - Clear inline error messages and visual indicators for missing fields:
    - Missing Title
    - Missing Browser
    - Missing Operating System
    - Missing Expected Behavior
    - Missing Actual Behavior
    - Missing or empty Steps to Reproduce
  - Real-time status badge indicates missing requirement count or "Ready to Export".
- **Real-Time Markdown Preview**:
  - Dual-mode preview: **Raw Markdown** (syntax-friendly monospace) & **Rendered View** (GitHub-style typography).
  - Live synchronization as you type.
  - "Preview Markdown" button to jump smoothly to the preview panel.
- **Instant Export Actions**:
  - **Copy Markdown**: Copies the formatted GitHub Markdown directly to your clipboard with visual confirmation.
  - **Download .md File**: Generates and downloads a `.md` file named using the title slug (e.g. `checkout-modal-crashes.md`).
  - **Open GitHub Issue**: Prompts for `owner/repo` (remembers last used in `localStorage`), then opens GitHub’s new-issue form with title + body prefilled. Long packs that would exceed a ~7000-character URL limit open with a short paste instruction and automatically copy the full Markdown to the clipboard.
  - **Load Demo Data**: One-click button to populate sample bug report data for testing.
  - **Reset Form**: Cleanly resets all inputs and state (including optional console/network notes).
- **Privacy & Security**:
  - 100% client-side.
  - No auth, no GitHub OAuth, no issue creation APIs, and no backend database.
  - Image files remain in browser memory and are never uploaded to any remote server.
- **Responsive & Accessible**:
  - Mobile-friendly single-column layout; clean two-column grid on desktop.
  - System font stack with dark/light mode support based on OS preference.

---

## 📋 Acceptance Criteria Checklist

| Requirement | Status | Details |
|---|:---:|---|
| **Single HTML page / pure static site** | ✅ | Pure HTML5, CSS3, and vanilla JS with zero build steps or external dependencies. |
| **Local one-liner in README** | ✅ | `open index.html` / `python3 -m http.server 8000` / `npx serve .` |
| **Title field (required)** | ✅ | Required input, validated on submit/blur/input, exports as H1. |
| **Environment fields** | ✅ | Staging URL (optional), Browser (required), OS (required), Test account notes (optional). Includes 1-click Auto-detect helper. |
| **Dynamic Steps to Reproduce** | ✅ | Add step, remove step, up/down reorder buttons. At least one non-empty step required. |
| **Expected Behavior (required)** | ✅ | Multi-line textarea, inline error displayed if empty. |
| **Actual Behavior (required)** | ✅ | Multi-line textarea, inline error displayed if empty. |
| **Console / Network Notes (optional)** | ✅ | Textareas after Actual; Markdown sections only when non-empty. |
| **Screenshots (0–5 slots)** | ✅ | Drag & drop dropzone, thumbnail previews, file size display, 5-image cap, filenames listed and placeholders generated. |
| **Validation blocks Export / Copy / GitHub** | ✅ | Buttons are disabled and blocked until Title, Browser, OS, Expected, Actual, and 1+ step are filled. |
| **Open GitHub Issue** | ✅ | In-app `owner/repo` dialog, `localStorage` remember, URL encode title/body; long-pack clipboard fallback (~7000 char URL limit). |
| **Inline error messages** | ✅ | Distinct inline error alerts under Title, Browser, OS, Steps, Expected, and Actual fields. |
| **Preview Markdown** | ✅ | Live Raw Markdown view and GitHub-rendered HTML view tabs + scroll button. |
| **Copy Markdown to clipboard** | ✅ | Fast clipboard write with animated toast feedback. |
| **Download .md file** | ✅ | Client-side Blob download with slugified filename. |
| **Exported Markdown Specification** | ✅ | Title as H1, Environment section, numbered steps, Expected, Actual, optional Console/Network Notes, Screenshots section, and footer note `"Generated by staging-bug-pack"`. |
| **Responsive design** | ✅ | Mobile and desktop friendly responsive CSS. |
| **No backend / no OAuth** | ✅ | Pure client-side tool without auth, backend, or GitHub OAuth. |

---

## 📁 Project Structure

```
staging-bug-pack/
├── index.html           # Main semantic HTML5 single-page application
├── css/
│   └── styles.css       # Responsive, modern CSS (supports dark & light modes)
├── js/
│   ├── app.js           # UI state management, dropzone, tabs, clipboard, download
│   ├── markdown.js      # Pure Markdown generator module (GitHub issue spec)
│   └── validator.js     # Form validation rules and error generation
├── tests/
│   ├── test-logic.js    # Unit test suite for validation and markdown generation
│   ├── test-e2e.js      # Headless Chrome end-to-end browser test script
│   └── app-screenshot.png # Visual screenshot of the application in action
└── README.md            # Documentation, one-liners, and acceptance checklist
```

---

## 🧪 Running Automated Tests

You can run both unit tests and end-to-end browser tests locally:

### 1. Unit Tests (Validation & Markdown Generator)
```bash
node tests/test-logic.js
```

### 2. End-to-End Headless Browser Test (Google Chrome)
```bash
node --experimental-websocket tests/test-e2e.js
```

Both test suites verify form validation, dynamic step modification, inline error rendering, button enable/disable states, markdown export output formatting, and screenshot handling.
