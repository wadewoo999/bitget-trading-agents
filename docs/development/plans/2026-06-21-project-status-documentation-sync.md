# Project Status Documentation Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the 2026-06-21 repository assessment and align active project documents with the confirmed no-runtime-Qwen product direction.

**Architecture:** Add one dated current-status document as the detailed assessment source, then keep README and AGENTS as short indexes. Update the long-term product specification so deterministic decision logic, Agent Hub, Paper Trading, GetAgent Playbook, and later Strategy Lab work no longer depend on a runtime LLM.

**Tech Stack:** Markdown, TOML, Git diff validation

---

### Task 1: Create the current status assessment

**Files:**
- Create: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`

- [x] **Step 1: Record assessment metadata and repository status**

Add the assessment date, current commit, evidence boundary, repository structure, and measured quality-gate results. State that the results are a 2026-06-21 snapshot rather than permanent product truth.

- [x] **Step 2: Record completion and gap analysis**

Document the implemented Sample analysis path, contract-only modules, missing runtime capabilities, technical risks, Hackathon blockers, and planning estimates for Phase 2, Minimum Demo, full product, and submission readiness.

- [x] **Step 3: Record the approved priority order**

Use this order exactly:

```text
Agent Hub Live Data
→ Paper Trading and evidence
→ Public Vercel deployment
→ GetAgent Playbook and evidence
→ Submission package
→ Strategy Lab and later product expansion
```

State that multi-asset, news, on-chain, and macro data remain planned and are not cancelled.

### Task 2: Align product truth

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/product/PROJECT_SPEC.md`
- Modify: `.env.example`

- [x] **Step 1: Update AGENTS engineering rules and index**

Replace runtime LLM fallback rules with deterministic decision validation and link `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md` from the detailed-document index.

- [x] **Step 2: Remove runtime LLM requirements from the product specification**

Replace LLM decision generation with deterministic rules, remove `ai | rule_fallback`, remove the LLM requirement from Strategy Lab, and retain schema validation, confidence override, risk controls, and reproducibility.

- [x] **Step 3: Remove unused Qwen runtime environment variables**

Leave only Bitget server-side variables in `.env.example`.

### Task 3: Update repository entry documentation

**Files:**
- Modify: `README.md`

- [x] **Step 1: Add the status document to the document index**

Link `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md` as the current status and roadmap source.

- [x] **Step 2: Replace the implementation order**

Use the same approved order as Task 1 and state that Qwen is a development resource, not a runtime product dependency.

### Task 4: Verify the documentation sync

**Files:**
- Verify: `AGENTS.md`
- Verify: `README.md`
- Verify: `.env.example`
- Verify: `docs/product/PROJECT_SPEC.md`
- Verify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`

- [x] **Step 1: Scan active documents for stale runtime requirements**

Run:

```bash
rg -n "Qwen|LLM|rule_fallback|mode: \"ai\"" AGENTS.md README.md .env.example docs/product docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md
```

Expected: no runtime product requirement remains; references may only explain that Qwen is not a runtime dependency.

- [x] **Step 2: Validate links and formatting**

Run:

```bash
test -f docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md
git diff --check
git status --short
```

Expected: the status file exists, no whitespace errors, and only the approved documentation files plus `.env.example` are modified or untracked.

- [x] **Step 3: Prepare manual Git handoff**

Provide the user with:

```bash
git add AGENTS.md README.md .env.example docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md docs/development/specs/2026-06-21-project-status-documentation-design.md docs/development/plans/2026-06-21-project-status-documentation-sync.md docs/product/PROJECT_SPEC.md
git commit -m "Document project status and next steps"
git push origin main
```
