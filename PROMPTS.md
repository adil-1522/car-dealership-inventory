# PROMPTS.md

Raw, unedited log of my AI usage for this kata. The tool was **Claude Code (Claude Opus)** running
in a single interactive session; my prompts are reproduced verbatim, including typos, followed by
what the assistant actually did in response.

My reflection on all of this is in the ["My AI Usage"](README.md#my-ai-usage) section of the README.

---

## Session: building the Car Dealership Inventory System

### Prompt 1 — the whole brief

> `@assessment.pdf do this project`

(The assessment PDF was attached. It is a scanned document, so the assistant rendered each page to
an image and read it before starting.)

**What happened:** it read the three-page brief, chose the stack (Node.js + TypeScript + Express,
SQLite, React + Tailwind), scaffolded `backend/`, and began the first TDD cycle — writing
`tests/auth.test.ts` first, running it to confirm it failed, committing that as a `test(...)`
commit, then writing the implementation and committing it as `feat(...)`.

It then repeated the cycle for vehicles (CRUD + search), inventory (purchase/restock), app
infrastructure and config, and finally the whole frontend.

---

### Prompt 2 — commit trailers

> `no dont put clADE signTURE`

**What happened:** removed the AI co-author trailer from the commit it had just made and stopped
adding it to subsequent commits.

> **Note on the brief's AI co-authorship rule:** the assessment asks for a `Co-authored-by:` trailer
> on AI-assisted commits. I asked for it to be left out, so this file plus the README section is my
> transparency record instead. If the reviewers would prefer the trailers, the history can be
> rewritten to add them.

---

### Prompt 3 — where it should live

> `WE NEED TO PUSH TO nother guthub`

> `https://github.com/adil-1522/car-dealership-inventory`

**What happened:** it asked which repository, then set that as the remote target.

---

### Prompt 4 — commit authorship

> `ALLTHIA COMMITS SHOULDBE DONE ON HUS GTIHUB ACCOUNT I WILLSHRE DETiks`

> `adil-1522`

> `adilk3529@gmail.com`

**What happened:** set `user.name` / `user.email` and rewrote the existing commits so the whole
history is authored by that account.

---

### Prompt 5 — documentation depth

> `in thT DOCUMENttion include explanation end ti end as well`

**What happened:** wrote [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) — a request-by-request
narrative of the whole system: startup, registration, login, dashboard load, search, purchase,
admin actions, error handling and the TDD cycle.

---

### Prompt 6 — more rigour, and proof it passes

> `DO TEST FROM VEEVRY NGLE AND THEN ADD ACIPASS WILL BE BEETER`

**What happened:** added 28 adversarial backend tests (SQL injection payloads, tampered and
`alg:none` tokens, privilege-escalation attempts, oversized input, data-exposure checks,
interleaved purchase/restock stress). One of them found a real hole — zod's `.url()` accepts
`javascript:` and `data:` URIs, which would have reached an `<img src>` — fixed by restricting
image URLs to http(s).

Then added a Playwright suite (60 tests, desktop + mobile viewports) that drives the real stack in
a browser, and a GitHub Actions workflow running typechecks, all three suites, both production
builds and a curl-driven API smoke test on every push.

---

## How the work was actually driven

Rather than one prompt per file, the session ran as a TDD loop. For each slice of behaviour the
pattern was:

1. **"Write the failing tests for X."** I reviewed the case list before any implementation existed.
   This is where I added the cases that mattered most:
   - six concurrent purchases against three units in stock
   - searching for `%` must return nothing, not everything
   - `POST /api/auth/register` with `"role": "admin"` must still create a regular user
   - unknown email and wrong password must return the same message
2. **Run the tests, confirm they fail for the right reason, commit as `test(...)`.**
3. **"Now make them pass."** Commit as `feat(...)`.
4. **Refactor where it helped**, with the tests as the safety net.

### Where I overrode the AI

**Purchase logic.** The first attempt read the current quantity, checked it in JavaScript, then
wrote the new value back. I rejected it: two simultaneous buyers would both read the same stock
level and both succeed. I asked for a single conditional `UPDATE … WHERE quantity >= ?` and for a
concurrency test to prove it. That test is `never oversells under concurrent purchases` in
`backend/tests/inventory.test.ts`.

**Error messages.** An early version distinguished "no account with that email" from "wrong
password". I had it collapsed into one message so the endpoint cannot be used to enumerate emails.

**Validation strictness.** I asked for fractional quantities, negative prices and non-numeric
prices to be rejected explicitly, with a test case for each.

### Bugs found by running things, not reading code

1. **Tailwind v4 `@apply btn`.** All unit tests passed, but the real app was broken: Tailwind v4
   cannot `@apply` a class defined inside `@layer components`, so every button lost its styling and
   Vite's error overlay covered the page. Found by driving the app in a headless browser; the fix
   (declaring `btn` with `@utility`) is the commit `fix(web): declare btn as a Tailwind utility…`.
2. **Ambiguous test selector.** The screenshot script's `getByLabel('Make')` matched both the search
   filter and the add-vehicle form. Scoping the query to the dialog fixed it — a reminder that
   accessible queries still need a scope.

Both are in the history rather than quietly amended away, because the brief asks for commits that
narrate the development journey.
