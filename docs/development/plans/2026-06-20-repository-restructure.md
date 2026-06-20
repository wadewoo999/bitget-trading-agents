# Repository Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the repository into product, Hackathon, development, application, feature, and integration responsibilities without changing runtime behavior.

**Architecture:** Keep Next.js and tool configuration at the repository root, retain existing feature-first source modules, and divide documentation into `product`, `hackathon`, and `development` groups. Move only files that already have a defined destination, update every affected reference, and avoid empty placeholder directories.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Vitest, Testing Library, ESLint, Markdown, Git

---

## File Map

**Move:**

- `docs/PROJECT_SPEC.md` → `docs/product/PROJECT_SPEC.md`: complete product requirements.
- `docs/OFFICIAL_HACKATHON_REQUIREMENTS.md` → `docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md`: official event rules and source mirror.
- `docs/superpowers/specs/2026-06-20-minimum-demo-design.md` → `docs/development/specs/2026-06-20-minimum-demo-design.md`: approved Demo design.
- `docs/superpowers/specs/2026-06-20-repository-restructure-design.md` → `docs/development/specs/2026-06-20-repository-restructure-design.md`: approved restructure design.
- `docs/superpowers/plans/2026-06-20-project-foundation.md` → `docs/development/plans/2026-06-20-project-foundation.md`: historical foundation plan.
- `docs/superpowers/plans/2026-06-20-repository-restructure.md` → `docs/development/plans/2026-06-20-repository-restructure.md`: this execution plan.

**Modify:**

- `AGENTS.md`: point detailed-document references to their new locations.
- `README.md`: point document links to their new locations and describe the responsibility-based directory layout.
- `docs/product/PROJECT_SPEC.md`: repair its relative link to the Hackathon requirements document.
- `src/app/page.tsx`: point public GitHub document links to their new locations.
- `tests/unit/app-shell.test.tsx`: assert the new public GitHub document URLs.

**Delete generated local files:**

- `tsconfig.tsbuildinfo`
- `tsconfig.typecheck.tsbuildinfo`

No source module moves are required. `src/app/*`, `src/features/*`, and `tests/unit/*` already match the approved responsibility boundaries.

### Task 1: Lock the New Public Document URLs with a Test

**Files:**

- Modify: `tests/unit/app-shell.test.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Change the document-link expectations to the approved paths**

Replace the two expected URLs in `tests/unit/app-shell.test.tsx` with:

```tsx
expect(screen.getByRole("link", { name: "Product specification" })).toHaveAttribute(
  "href",
  "https://github.com/wadewoo999/bitget-trading-agents/blob/main/docs/product/PROJECT_SPEC.md",
);
expect(screen.getByRole("link", { name: "Hackathon requirements" })).toHaveAttribute(
  "href",
  "https://github.com/wadewoo999/bitget-trading-agents/blob/main/docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md",
);
```

- [ ] **Step 2: Run the focused test and verify it fails for the old URLs**

Run:

```bash
npm test -- tests/unit/app-shell.test.tsx
```

Expected: FAIL in `links to the approved project documents`; the received URLs still contain `docs/PROJECT_SPEC.md` and `docs/OFFICIAL_HACKATHON_REQUIREMENTS.md`.

- [ ] **Step 3: Update the page links**

Replace the footer in `src/app/page.tsx` with:

```tsx
<footer className="document-links">
  <a href={`${repositoryBase}/docs/product/PROJECT_SPEC.md`}>Product specification</a>
  <a href={`${repositoryBase}/docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md`}>
    Hackathon requirements
  </a>
</footer>
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- tests/unit/app-shell.test.tsx
```

Expected: PASS, 2 tests passed.

- [ ] **Step 5: Commit the public-link update**

```bash
git add src/app/page.tsx tests/unit/app-shell.test.tsx
git commit -m "Update public document links"
```

### Task 2: Move Documentation into Responsibility-Based Directories

**Files:**

- Move: all files listed in the File Map
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/product/PROJECT_SPEC.md`

- [ ] **Step 1: Create only the destination directories that will contain files**

Run:

```bash
mkdir -p docs/product docs/hackathon docs/development/specs docs/development/plans
```

Expected: the four destination directories exist; no `.gitkeep` files are created.

- [ ] **Step 2: Move the product and Hackathon documents**

Run:

```bash
git mv docs/PROJECT_SPEC.md docs/product/PROJECT_SPEC.md
git mv docs/OFFICIAL_HACKATHON_REQUIREMENTS.md docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md
```

Expected: Git records both files as moves and their contents are unchanged.

- [ ] **Step 3: Move the development specs and plans**

Run:

```bash
git mv docs/superpowers/specs/2026-06-20-minimum-demo-design.md docs/development/specs/2026-06-20-minimum-demo-design.md
git mv docs/superpowers/specs/2026-06-20-repository-restructure-design.md docs/development/specs/2026-06-20-repository-restructure-design.md
git mv docs/superpowers/plans/2026-06-20-project-foundation.md docs/development/plans/2026-06-20-project-foundation.md
git mv docs/superpowers/plans/2026-06-20-repository-restructure.md docs/development/plans/2026-06-20-repository-restructure.md
```

Expected: `docs/superpowers/` becomes empty and disappears from Git after the moves.

- [ ] **Step 4: Update the detailed-document links in `AGENTS.md`**

Use exactly:

```markdown
- 完整產品規格、資料契約、風險規則與驗收標準：[`docs/product/PROJECT_SPEC.md`](docs/product/PROJECT_SPEC.md)
- 官方活動規則、提交要求與原始內容鏡像：[`docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md`](docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)
```

- [ ] **Step 5: Update the document index and add a concise structure section to `README.md`**

Replace the Project documents list with:

```markdown
- [Product specification](docs/product/PROJECT_SPEC.md)
- [Official hackathon requirements](docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)
- [Development specs and plans](docs/development/)
- [Agent instructions](AGENTS.md)
```

Insert this section after `Project documents` and before `Planned implementation order`:

```markdown
## Repository structure

- `src/app/`: Next.js pages and route handlers
- `src/features/`: product modules and their public contracts
- `docs/product/`: product requirements and acceptance criteria
- `docs/hackathon/`: official event rules and submission requirements
- `docs/development/`: approved designs and implementation plans
- `tests/`: unit, integration, fixture, and end-to-end tests as they are introduced
```

- [ ] **Step 6: Repair the product specification's cross-directory link**

In `docs/product/PROJECT_SPEC.md`, replace:

```markdown
詳細官方活動規則見 [`OFFICIAL_HACKATHON_REQUIREMENTS.md`](OFFICIAL_HACKATHON_REQUIREMENTS.md)。
```

with:

```markdown
詳細官方活動規則見 [`OFFICIAL_HACKATHON_REQUIREMENTS.md`](../hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)。
```

- [ ] **Step 7: Verify the file tree and old-path cleanup**

Run:

```bash
rg --files docs | sort
rg -n "docs/(PROJECT_SPEC|OFFICIAL_HACKATHON_REQUIREMENTS|superpowers)" -g '!node_modules' -g '!.next' .
```

Expected: the first command lists only the new `docs/product`, `docs/hackathon`, and `docs/development` locations. The second command may show old paths only inside the restructure design's historical move table; no active link or application reference uses an old path.

- [ ] **Step 8: Run the focused application test**

Run:

```bash
npm test -- tests/unit/app-shell.test.tsx
```

Expected: PASS, 2 tests passed.

- [ ] **Step 9: Commit the documentation structure**

```bash
git add AGENTS.md README.md docs
git commit -m "Reorganize repository documentation"
```

### Task 3: Remove Generated TypeScript State and Verify the Repository

**Files:**

- Delete locally: `tsconfig.tsbuildinfo`
- Delete locally: `tsconfig.typecheck.tsbuildinfo`
- Verify: `.gitignore`
- Verify: all tracked files

- [ ] **Step 1: Confirm generated files are ignored and not tracked**

Run:

```bash
git check-ignore tsconfig.tsbuildinfo tsconfig.typecheck.tsbuildinfo
git ls-files '*.tsbuildinfo'
```

Expected: `git check-ignore` prints both filenames; `git ls-files` prints nothing.

- [ ] **Step 2: Delete the generated TypeScript build state**

Run:

```bash
rm -f tsconfig.tsbuildinfo tsconfig.typecheck.tsbuildinfo
```

Expected: neither file exists. TypeScript may regenerate them during later checks, but `.gitignore` keeps them outside repository state.

- [ ] **Step 3: Run all quality gates**

Run each command separately:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands exit 0; the existing contract and app-shell tests pass; Next.js completes a production build.

- [ ] **Step 4: Check links, tracked files, secrets, and working-tree scope**

Run:

```bash
rg -n "docs/(PROJECT_SPEC|OFFICIAL_HACKATHON_REQUIREMENTS|superpowers)" -g '!node_modules' -g '!.next' .
git ls-files | sort
git diff --check HEAD~2..HEAD
git status --short
```

Expected:

- Old paths appear only as historical source paths in the approved restructure design and implementation plan.
- Tracked documentation is under `docs/product`, `docs/hackathon`, and `docs/development`.
- `git diff --check` produces no output.
- `git status --short` is empty after the two implementation commits.
- No `.env`, API Key, Token, `.next`, `node_modules`, or `*.tsbuildinfo` file is tracked.

- [ ] **Step 5: Push the verified `main` branch**

```bash
git push origin main
```

Expected: GitHub accepts both implementation commits and reports `main -> main`.
