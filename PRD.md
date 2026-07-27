# PRD — User Center: Roles & Permissions (v2)

**Status:** Ready to build
**Date:** 2026-07-27
**Owner:** Mihir Sethi (Associate Product Manager, DigitalPaani)
**Who this is for:** the dev team building the real backend and admin console (Shivam + team)
**Live reference:** [`index.html`](index.html) is a full working click-through prototype of everything in this document. It's one HTML file — no build step, no server, no install. Open it in any browser. **Whenever you're not sure how something should look or behave, open the prototype and try it.** The code is plain JavaScript, so you can also just read the function that does the thing you're building.

---

## Read this first

This document tells you **what to build, in what order, and where to find the exact rule** for each piece. It does not re-explain every decision inline — each section links to the one document that has the full "why."

Skip to whatever step you're working on. But read **Section 1** first — it's five ideas, and once you have them, the rest of this document (and the prototype) will make sense immediately.

**A quick heads-up on files:** this repo has two kinds of documents.
- Files like `CLAUDE.md`, `coverage-map.csv`, and `index.html` are in the git repo. If you cloned the repo, you already have them.
- Files under `internal/` (Excel workbooks, migration lists) and `context-drop/` (background docs) are **not** in the git repo — they contain real user data or are working drafts, so they're kept off GitHub on purpose. If a step below needs one of these, it says so, and you should ask Mihir for it directly.

Every step in Sections 2–4 (the actual build) only needs files you already have from git. Section 5 (running the real migration) needs a few `internal/` files — that's flagged clearly when you get there.

---

## 1. The five ideas that explain everything

**1. A "Plant" is the only container.**
There is no company folder, no workspace, no group sitting above a plant. Company is just a label written on the plant record. People connect straight to plants — nothing in between. (Full rule: `CLAUDE.md` → "Assignment scope.")

**2. Product modules are a ceiling, not a grant.**
DigitalPaani sells 8 product modules to companies, and each plant is licensed for some subset of them:

| Code | What it is |
|---|---|
| `core` | The baseline — always on, every plant, free. |
| `ops` | Issue Resolution (the feature this whole redesign was originally for — not built yet, see Step 13). |
| `tasks` | Tasks & Shifts. |
| `data` | Data, Lab & Logbook entry. |
| `analytics` | Dashboards & Analytics. |
| `iot` | IoT & Remote Control. |
| `floc` | Floc Detector — a hardware add-on with **no permissions of its own**, just a sold entitlement (see Step 2). |
| `inv` | Inventory Management. |

A module being licensed doesn't GIVE anyone a permission — it just allows permissions that are already tagged to that module to actually work. The one rule that runs the whole system:

> **Effective access at a plant = the person's permission `AND` the plant's licensed module.**

If a plant isn't licensed for a module, every permission tagged to that module goes dark there — but it stays saved on the person's profile, and comes back automatically the moment the plant licenses that module. Nothing is ever silently deleted by a licensing change.

**3. Every permission lives in one of 10 labeled boxes ("sets").**
`work`, `approve`, `oversight`, `remote`, `readplant`, `portfolio`, `people`, `tech`, `templates`, `flags`. You never assign someone one permission at a time — you give them a role, and a role is just a fixed list of these boxes.

**4. Roles and grants are fixed combinations of boxes — never invent a new one.**
There are exactly **5 roles** (L1 Operator, L3 Lead, L4 Senior Lead, Regular Non-op, Senior Non-op) and **4 admin grants** (People Admin, Technical Admin, Full Site Admin, Global Admin). Each is just a named list of which of the 10 boxes it includes. If a real person needs something slightly different, that's an **override** on their one assignment (see Step 6) — you never create a 6th role.

**5. A few permissions are exceptions — never part of any role, ever.**
Three permissions (remote-control actuation, "view as another user," the sensor-health dashboard) are never included in any role by default. They're switched on for one named person at a time, with a written reason, and they're the one thing **Global Admin still gets automatically** — see Step 7.

That's it. Everything below is these five ideas turning into screens, tables, and buttons.

---

## 2. The building blocks (what you need to store)

Plain field lists — this is not a schema, just what data needs to exist somewhere. The prototype's in-memory variable names are in brackets so you can find the matching logic in `index.html`.

- **Plant** — name, company label, which modules are licensed. [`PLANTCO`, `PLANTMODS`]
- **Person** — name, title, one admin grant (or none), a list of per-plant assignments. [`PEOPLE`]
- **Assignment** — one row per (person, plant): which of the 5 roles, plus any overrides (permissions manually added or removed) each with a mandatory written reason. [`ASG` / `p.asg[plant]`]
- **Custom role** — a named "add these, remove these" template that an admin applies to chosen people later — not a 6th role, just a reusable exception template. [`PACKS`]
- **Exception grant** — a person + a plant + one of the 3 exception permissions + a reason. [`remote.actuate`, `flags.impersonate`, `flags.sensorhealth`]
- **Audit log** — one line per change: who did what, to whom, when, why. [`AUDIT`]
- **Legacy deprecation flag** — one on/off switch per retiring old feature (see Step 12).

---

## 3. Build it in this order

Each step names the prototype tab and the key functions to read in `index.html`. Build and test each step before moving to the next — later steps assume earlier ones work.

### Step 1 — Plants: the base registry
- [ ] Store plant name + company label. Company is just text on the plant, not its own table.
- [ ] A screen listing all plants, grouped by company label, with an "add plant" action.
- [ ] New plants start with **no modules licensed** (Platform Core is always on for everyone, everywhere, for free).

*Prototype:* the **Plants** tab. Read `renderPlants()`, `addPlantSubmit()`, `plantModal()` in `index.html`.

### Step 2 — Product modules: the licensing ceiling
- [ ] A matrix: one row per plant, one column per module, one on/off switch per cell.
- [ ] Writing to this matrix is **Global Admin only** — this is the single place module flags are ever changed. Don't let any other screen edit modules directly, even to be "helpful" — link to this screen instead.
- [ ] Every permission in your system needs a `module` tag. A permission with no tag defaults to `core` (always on).
- [ ] `floc` is a special case: it's licensed and toggled exactly like the other 7 modules, but **no permission is ever tagged to it.** It exists purely so a contract can say what hardware was sold — it never turns anything on or off for a user. This is the pattern for any future hardware add-on module too.
- [ ] Clicking a module (here or anywhere it's shown as a card) should open a detail view: what it unlocks, and how many plants are licensed for it.

*Prototype:* the **Product modules** tab. Read `renderModules()`, `toggleMod()`, `plantMods(plant)`, `PERMMOD`, and `moduleModal()` for the detail view.
*Full permission → module mapping:* [`coverage-map.csv`](coverage-map.csv).

### Step 3 — People and admin grants
- [ ] A person record: name, title, at most **one** admin grant (People / Technical / Full Site / Global — or none).
- [ ] A directory table (no avatars — just name, title, company, per-plant role chips, grant, status).
- [ ] New people start with **zero access.** Nothing is granted until someone explicitly assigns them to a plant.
- [ ] At this point the grant field is just a label — don't hardcode what each grant *does* yet. That's Step 4, next.

*Prototype:* the **People** tab (this is the landing screen). Read `renderDirectory()`, `startAddPerson()`.

### Step 4 — The permission engine: sets, roles, grants
- [ ] Define the 10 sets and exactly which permissions live in each — copy this straight from `index.html`'s `SETS` constant, don't re-derive it.
- [ ] Define the 5 roles as fixed set-lists, and the 4 grants the same way (see the table below). (The numbering skips L2 on purpose — that's carried over from the legacy system's naming, not a gap in this list.)
- [ ] **Global Admin is a superuser: it implicitly includes every set, including the 3 exception permissions.** Never let a permission check say "no" to a Global Admin.
- [ ] Clicking a role or grant card should open a detail view: every permission it grants, how many people currently hold it, and (for a role) notes on what it replaced from the old system.

| Name | Type | Includes |
|---|---|---|
| L1 Operator | Role | work + readplant |
| L3 Lead | Role | work + approve + readplant |
| L4 Senior Lead | Role | work + approve + oversight + readplant + portfolio |
| Regular Non-op | Role | readplant |
| Senior Non-op | Role | readplant + portfolio |
| People Admin | Grant | people |
| Technical Admin | Grant | tech |
| Full Site Admin | Grant | people + tech |
| Global Admin | Grant | **everything** — all 10 sets, every plant, no exceptions |

*Prototype:* read `SETS`, `ROLES`, `GRANTS`, `isStdG()`, and `roleModal()`/`grantModal()` for the detail views, in `index.html`. Full rule text: `CLAUDE.md` → "The v2 model."

### Step 5 — Per-plant assignments
- [ ] Give a person a role **at a specific plant.** The same person can be an L1 Operator at one plant and a Regular Non-op (just a viewer) at another — this is normal, not an edge case. (74 real people in the migration data need exactly this.)
- [ ] The admin grant is account-wide (one grant, works everywhere the person has any plant), but the role is per-plant.

*Prototype:* the person profile editor inside the People tab. Read `togglePlantSel()`, `initAsg()`.

**The exact shape to save, per person:**
```
{
  userId,
  assignments: [
    { plant, company, tier, overrides: { add: [...], remove: [...] }, reason, drift }
  ],
  grant,
  entitlementContext: { modulesByPlant, cappedByPlant }
}
```
One `assignments` row per plant the person touches. `overrides.add`/`overrides.remove` are permission keys like `approve.forceclose`. `entitlementContext` is **informational only** — a snapshot for display and debugging. **Never use it to decide access.** The real check, every time, at runtime, is always Step 2's rule: `user permission AND plant module`, computed fresh — never read from what was saved at assignment time.

*Prototype:* the `save()` function.

### Step 6 — Overrides (deviations from the standard)
- [ ] Let one assignment add or remove individual permissions beyond what the role standard gives.
- [ ] **Every override needs a written reason**, stored and shown in the audit trail.
- [ ] Show a running "drift count" — how many people currently deviate from their role's standard. A high or growing number is a signal the role itself should change, not that overrides are working as intended.
- [ ] Dependency rules: `approve` needs `work` first, `oversight` needs `approve` first, `portfolio` needs `readplant` first, `templates` needs both `people` and `tech` first, and `flags.impersonate` needs the `people` set first (see Step 7). Enforce these — don't let someone get `approve` without `work`.

*Prototype:* read `deviations()`, `personDrift()`, `resetStd()`.

### Step 7 — The 3 exception grants
- [ ] `remote.actuate` (remote-control actuation), `flags.impersonate` (view-as, requires the person also hold People Admin/Full Site/Global), `flags.sensorhealth` (sensor-health dashboard).
- [ ] None of these are ever in a role by default. Each is switched on for **one person, one plant, one reason** at a time.
- [ ] **Exclude these from every bulk action and every custom role.** A plant-wide "give everyone X" action must silently skip these — never let one action hand out a sensitive exception to a whole roster.
- [ ] Global Admin gets all three automatically (see Step 4) — that's the one exception to "always requires an explicit grant."

*Prototype:* read the `sensitive:true` flag on the `remote` set, the `preq` field on `flags.impersonate`, and the exclusion filters inside `createCustomRole()` / `bulkEditPerm()` — those two functions aren't built until Steps 8 and 9; come back and re-check this bullet once they exist.

### Step 8 — Custom roles (reusable exception templates)
- [ ] A custom role is just `{name, permissions to add, permissions to remove, reason}` — not a new type of role, just a reusable add/remove template.
- [ ] Defining one does nothing by itself. It's **applied** to chosen people later, in either:
  - **add** mode (layer the template on top of whatever they already have), or
  - **overwrite** mode (reset them to their role standard first, then apply the template).
- [ ] Before applying, show each affected person a preview: what will actually change for them (some may already have some of it).
- [ ] Applying a custom role writes a **stamped, per-person exception** — it is not a live link. If you edit the custom role later, people who already received it do NOT change retroactively.
- [ ] The 3 exception permissions can never be bundled into a custom role.
- [ ] The list of permissions someone can even pick from when building a template depends on who's building it: Global/Company admins pick from the full catalog; a cluster or single-plant admin only sees permissions their own licensed modules unlock.

*Prototype:* the **Role library** tab. Read `createCustomRole()`, `applyCustomRole()`, `applyPreview()`, `customPalette()` for the scope-dependent picker.

### Step 9 — Plant-wide bulk actions
- [ ] **Bulk set tier** ("tier" is just this field's name in the data model — it means role): assign one role to an entire plant's roster in a single audited action.
- [ ] **Bulk edit permission:** add or remove one specific permission for a chosen set of people at a plant — this writes a separate reasoned exception per person (not a live-linked template — that's what Step 8 is for).
- [ ] Every bulk action still checks the module ceiling and the exception-permission exclusion, person by person. Anyone skipped for either reason shows up in the action's summary line — never fail silently.

*Prototype:* read `bulkSetTier()`, `bulkEditPerm()`, `renderBulk()`.

### Step 10 — Access Review (the audit surface)
- [ ] **Person lens:** a grid of every permission × every plant for one person, with 5 possible states per cell: standard / added / removed (someone explicitly took it away) / capped-by-module / not-applicable (never part of this role to begin with — different from "removed"). Clicking a cell shows a one-sentence "why" (e.g. "capped — the `iot` module isn't licensed at this plant").
- [ ] **Plant lens:** the roster at one plant, plus a "who can do X here?" search that respects the module ceiling.
- [ ] Color convention: amber always means "this person deviates from standard here." Grey always means "the module isn't licensed here." Never reuse these colors for anything else.

*Prototype:* the **Access review** tab. Read `renderReview()`, `setWhy()`.

### Step 11 — Control panel (for scoped admins, not Global)
Reminder: admins work at one of three altitudes — **Global** (every plant), **Cluster** (every plant sharing one company label), or a single **Plant**. This step is the home screen for the last two.

- [ ] A separate home screen for cluster-level and single-plant admins: their scope's key numbers (plant count, roster size, how many people currently deviate from standard), quick actions, and a "who can do X here?" lookup, all pre-filtered to their scope.
- [ ] Global Admin never lands here — bounce them to the People tab if they somehow do.
- [ ] Every action on this screen must re-check scope inside the function itself, not just hide the button in the UI. (A cluster admin calling the bulk-action function directly with a plant outside their cluster must still be refused.)

*Prototype:* the **Control panel**. Read `renderControlPanel()`, `inScope()`, `scopedPlants()`, `scopedPeople()`.

### Step 11b — The screen-visibility engine
This is the rule for **which tabs, buttons, and banners a person sees**, anywhere in the product — and it's not a design choice you make screen by screen. It's computed the same way everywhere, from the person's permissions:

- [ ] Which tabs a person sees is derived entirely from what permissions they hold — never hardcoded per role.
- [ ] Where they land when they open the app follows one fixed priority order: **approvals → issues → portfolio → dashboard → admin.** Whichever of those the person has access to, highest in that list, is their landing screen.
- [ ] Treat this as the actual frontend specification — if the real product's navigation ever seems to disagree with what someone's permissions say they should see, the navigation is wrong, not the permissions.

*Prototype:* read `computeTabs()`, `landingTab()`, `bodyFor()` in `index.html` — these three functions ARE the spec.

### Step 12 — One-click deprecation flags
Some old features are staying alive for now but are marked to die later, all at once, with one click. This is **not** the module ceiling from Step 2 — it's a separate, smaller mechanism, because several of these old permissions currently share a live "home" with permissions that must keep working (see the mapping doc in Section 4).

- [ ] Build a small platform-level settings table: one true/false flag per legacy feature group. **Global Admin only** can flip these — put them in a "Sunsetting" section, separate from the Step 2 module matrix.
- [ ] Each old screen/route checks its own flag. Flipping a flag off hides that old feature for **every user, every plant, in one action** — and touches zero user records, so flipping it back on instantly restores everything.
- [ ] The 9 flags today: `L-DASH` (old per-plant dashboards), `L-GROUPS` (user groups), `L-WS` (workspaces), `L-ROLES` (free-form role creation), `L-TICKETS` (the old ticket system), `L-TASKCFG` (old task config screens), `L-OLDDATA` (old lab/water-quality entry + old data-input templates), `L-OLDCFG` (old plant-config screens), `L-OLDLAYOUT` (old plant-layout view).
- [ ] One related but different thing: back-dated data entry isn't a flag at all — it's a one-time change, already decided. It simply becomes ordinary data entry (no extra gate), and the old separate permission retires. Nothing to toggle later.
- [ ] Don't confuse that with **Data correction** — a different feature (editing an entry that's already recorded). It's a real, separate permission (`approve.datacorrect`), and only L3 Leads and up, or Technical Admin and up, hold it. This is a permission check, not an approval workflow.

*Full detail — which legacy permission is behind which flag, and what it becomes after the flag flips:* `internal/role-permission-migration-map-rev3.xlsx` (ask Mihir — not in git; see Section 6. It's called `-rev3` because of an Excel file-lock quirk while it was being written; it's the latest and correct version).

### Step 13 — Run the migration (the 753 real users)
This step needs files that are **not in the git repo.** Ask Mihir for them before you start — see Section 6 for the full list. Short version of what needs to happen:

- [ ] **517 people** get their new role + grant fully automatically — no question for a human.
- [ ] **236 people** also migrate automatically, but each one carries exactly one follow-up question for a plant manager to answer later (mostly: "does this L1 Operator actually approve/close issues? If yes, promote to L3 Lead" — that's 219 of the 236; the rest are a handful of "does this viewer actually run the site?" and "does this lead need a bigger admin grant?" checks).
- [ ] **Zero people are blocked.** There is no "figure this out later" bucket. Every one of the 753 gets a real answer on day one.
- [ ] **7 people** get their admin grant manually upgraded to Full Site Admin as part of this migration (they already held the other half of it under the old system).
- [ ] **49 people** currently have zero plants. 5 of those are pure admin-grant holders (handled automatically); the other 44 go into a short manual queue — assign them a real plant, or offboard them. Don't invent a plant for someone just to close the queue.
- [ ] The **Issue Resolution** feature (the whole `ops` module) stays unlicensed everywhere on day one, on purpose — it isn't built yet. This is why the "is this person a lead?" question above doesn't block anything: approval authority simply has no effect until the feature ships.
- [ ] Skip all 10 legacy roles marked `isArchived:true` — they're test/demo roles, nobody real holds any of them, so there's nothing to map.

*Per-user exact answers (all 753, old role + old permissions → new role + new permissions):* `internal/migration-final-mapping.xlsx`.
*Per-user action list (what to do, what to ask):* `internal/migration-worksheet-final-rev2.xlsx`.
*The 7 admin-grant upgrades, with evidence:* `internal/admin-grants-applied.xlsx`.
*⚠ Important:* `internal/migrate.js` and `internal/MIGRATION-RUNBOOK.md` were written earlier in the project and predate several rulings above (they still say some users go on hold, and don't know about the deleted/deprecated permissions or the 7 grant upgrades). Treat the two files linked directly above as correct today; update `migrate.js` to match them before running it for real.

### Step 14 — After migration: the follow-up queue
- [ ] The 219 "operator or lead?" questions and the 9 "viewer or site-admin?" questions from Step 13 don't need answers immediately — track them as a simple list plant managers clear over time.
- [ ] When the Issue Resolution feature actually ships: license the `ops` module per plant as each one is ready, and start asking the 219 promotion questions for real.
- [ ] Flip the Step 12 deprecation flags one at a time, only after each old feature's replacement is confirmed working — never flip more than one at once, and watch for a day before moving to the next.

---

## 4. Where every legacy permission goes

The old system had **121 permissions** spread across 56 overlapping roles. Every one of them has a decided new home. Don't invent a mapping — look it up:

- [`coverage-map.csv`](coverage-map.csv) — the simple version: old permission tag → new permission (or "deleted," "retired," etc.), one row each. **This one is in the git repo.**
- `internal/role-permission-migration-map-rev3.xlsx` — the developer-friendly version of the same thing, organized by destination: which permissions live under which of the 5 roles / 4 grants, which 3 are exceptions (Step 7), which are behind a deprecation flag (Step 12) and what they'll become, and which are simply deleted. **Start here if you're writing the actual mapping code** — ask Mihir, not in git.
- `internal/EcoInnovision-permissions-decisions-reviewed.xlsx` — the full decision record: every one of the 121, with the reasoning for each call. Read this only if you need the "why" behind a specific one. Ask Mihir.

A few permissions in the new system have **no old equivalent at all** — they're genuinely new capabilities the redesign adds: the core of the `approve` set (approving/rejecting gates, self-approve, force-close, reopen, photo override) and the co-sign permission in `oversight`, plus `remote.actuate`, `approve.datacorrect`, `tech.stores`, and `flags.sensorhealth`. Don't go looking for a legacy source for these — there isn't one.

Two permissions that *sit inside* the `approve` set are different — they DO have a legacy source, so don't skip them when reading `coverage-map.csv`: `approve.assign` (creating/assigning tasks) and `approve.invlogs` (the inventory movement log) both map back to old permissions.

---

## 5. Rules that must never be broken

Short list. If new code violates one of these, it's a bug, not a design choice.

1. **Effective access is always `permission AND plant module`.** Never grant something that skips the module check.
2. **Global Admin's own access check never says "no."** This is about what a Global Admin holds, not about handing things out — see rule 3.
3. **The 3 exception permissions can never be bundled into a role, a custom role, or a bulk action — for anyone else.** They only ever reach someone else one person, one plant, one reason at a time. (Global Admin is the one person who already has them, per rule 2 — that's not the same as a bulk grant.)
4. **Every override needs a written reason.** No silent deviations from a role standard.
5. **Company is a label, not a container.** Never build a screen that treats "company" as something people or plants belong *inside*.
6. **A custom role application is stamped, not live-linked.** Editing the template later must never retroactively change someone who already received it.
7. **Module writes happen in exactly one place** (Step 2). Every other screen that shows modules is read-only, with a link back to Step 2.
8. **The word "workspace" and the phrase "CloseTheLoop" never appear in any user-facing text.** "Workspace" is retired; "CloseTheLoop" is an internal codename only — the product name is "User Center — Roles & Permissions."
9. **Deprecation flags gate old screens, not the module ceiling.** Don't reuse Step 2's mechanism for Step 12 — they solve different problems (see Step 12 for why).

---

## 6. Full reference index

### In the git repo — everyone building from this document already has these
| Doc | What it's for |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The full model spec — every ruling, in detail, with dates. The source of truth this PRD is built from. |
| [`README.md`](README.md) | How the prototype is deployed (GitHub Pages) and how to run it locally. |
| [`coverage-map.csv`](coverage-map.csv) | All 121 old permissions → their new home, one row each. |
| [`index.html`](index.html) | The working prototype — the reference implementation for every step above. |
| [`presentation/index.html`](presentation/index.html) | A guided onboarding walkthrough version of the same model — useful for demos, not a build target. |

### Ask Mihir for these — not in the git repo (real data or working drafts)
| Doc | What it's for |
|---|---|
| `internal/role-permission-migration-map-rev3.xlsx` | The developer-facing permission map (Section 4) — start here for mapping code. |
| `internal/EcoInnovision-permissions-decisions-reviewed.xlsx` | Every one of the 121 permissions, decided, with reasoning. |
| `internal/EcoInnovision-permissions-catalog.xlsx` | The raw legacy permission catalog, exported as-is from the old database. |
| `internal/migration-final-mapping.xlsx` | All 753 users: old role + permissions → new role + permissions. |
| `internal/migration-worksheet-final-rev2.xlsx` | All 753 users: the exact migration action + any follow-up question. |
| `internal/admin-grants-applied.xlsx` | The 7 users manually upgraded to Full Site Admin, with evidence. |
| `internal/NUMBER-PINS.md` | The exact user/role/assignment counts, pinned against the real production export. |
| `internal/split-resolution.csv` | The 11 users who genuinely need a different role at different plants. |
| `internal/MIGRATION-SPEC.md`, `internal/MIGRATION-RUNBOOK.md`, `internal/migrate.js` | The original migration engineering plan and script — **predates several rulings above; update before running (see Step 13).** |
| `context-drop/.../LegacyRBAC/LegacyRBAC.md` | How the OLD three-tree admin console actually behaves today — useful background on what's being replaced. |
| `context-drop/.../ADR/ADR-001/002/003` | The background reasoning behind "no groups," "no workspaces," and "modules are licensed per plant." `CLAUDE.md` already states the rulings — read these only for the deeper "why." |
| `context-drop/.../PRD.md` | An early draft PRD from 2026-07-08. **Superseded by this document** — do not build from it. |

### Private links (Mihir's — ask him to share if useful for the team)
These are read-only pages showing supporting analysis, not build instructions:
- Before/after comparison of the model changes: `https://claude.ai/code/artifact/19429e37-64f4-4efe-ac8b-4cd366baeed9`
- All 56 legacy roles broken into layers: `https://claude.ai/code/artifact/5c6e5f43-f6d2-4b52-8f95-29d962951f47`
- The 121-permission catalog broken into layers: `https://claude.ai/code/artifact/78098591-1665-4ad1-ab1a-a41be6aac329`
- The full migration plan, with cohort counts: `https://claude.ai/code/artifact/393a3b1f-2df6-499e-8bae-91d92298330e`
