# PRD — User Center: Roles & Permissions (v2)

**Status:** Ready to build
**Date:** 2026-08-13
**Owner:** Mihir Sethi (Associate Product Manager, DigitalPaani)
**Live reference:** [`index.html`](index.html) is a full working click-through prototype of everything in this document. It's one HTML file — no build step, no server, no install. Open it in any browser. **Whenever you're not sure how something should look or behave, open the prototype and try it.** The code is plain JavaScript, so you can also just read the function that does the thing you're building.
**User guide:** [`GUIDE.html`](GUIDE.html) — a step-by-step walkthrough of the prototype: the three admin personas, every screen, and eight click-by-click recipes. Open it side by side with the prototype. **Section 7** maps it recipe by recipe to the build steps below.

---

## Read this first

This document tells you **what to build, in what order, and where to find the exact rule** for each piece. It does not re-explain every decision inline — each section links to the one document that has the full "why."

Skip to whatever step you're working on. But read **Section 1** first — it's five ideas, and once you have them, the rest of this document (and the prototype) will make sense immediately.

**A quick heads-up on files:** this repo has two kinds of documents.
- Files like `CLAUDE.md`, `coverage-map.csv`, and `index.html` are in the git repo. If you cloned the repo, you already have them.
- Files under `internal/` (Excel workbooks, migration lists) and `context-drop/` (background docs) are **not** in the git repo — they contain real user data or are working drafts, so they're kept off GitHub on purpose. If a step below needs one of these, it says so, and you should ask Mihir for it directly.

Every step in Sections 2–4 (the actual build) only needs files you already have from git. Step 13 (running the real migration) needs a few `internal/` files — that's flagged clearly when you get there.

---

## The simplification — what's in, what's out (read before building)

Three decisions cut this project down to a much smaller build than earlier drafts, older notes, or the prototype's git history suggest. **If anything you read elsewhere disagrees with this table, this table wins.**

| Decision | What it means for the build | Decided |
|---|---|---|
| **One role per user, account-wide.** A role describes the person, not a plant. | The person record has ONE `role` field. No per-plant role picker, no role column on assignment rows, no "different role at different plants" logic anywhere. A plant assignment is just plant access. | 2026-07-30 |
| **No custom roles — the feature is cut.** None will be created, and nobody — **People Admins included** — gets any create-or-apply capability. | Skip Step 8 entirely: no template storage, no builder UI, no apply flow, no scoped permission palettes. The 5 roles + 4 grants are the complete, permanent role vocabulary. | 2026-08-13 |
| **No bulk role changes.** | The plant-wide bulk surface does exactly two things: add people to a plant's access list (at their existing role), and add/remove individual permissions as per-person exceptions. | 2026-07-30 |

What's left is a system with exactly **four mechanisms** — nothing else grants or removes access:

1. **Product modules**, licensed per plant — the ceiling (Step 2).
2. **One of 5 roles** per person, plus **at most one of 4 admin grants** — the defaults (Steps 3–5).
3. **Per-person, per-plant overrides** with a mandatory written reason — the only flexibility (Step 6).
4. **3 exception permissions**, granted one person / one plant / one reason at a time (Step 7).

Two things to keep open while building:

- [`reference/module-feature-permission-map.xlsx`](reference/module-feature-permission-map.xlsx) — the lookup workbook: every product module → the features it includes → the permission tags behind them; every role and every grant → its permission tags; plus an audit of all 121 legacy database permission tags that **flags every tag that does not carry into v2** (deleted, retired, merged, or folded into the platform baseline).
- The [`tests/`](tests/) folder — five plain-node scripts (no dependencies: `node tests/verify-usercenter.js`) that assert every rule in this PRD against the prototype. They are the executable version of this document; if your build passes an equivalent suite, you built the right thing.

---

## 0. Today's system — the current flow, the problem, and worked examples

You're replacing something. This section is a record of what that something actually does today: the flow as it runs in production, the problems it causes, and walk-throughs of real tasks failing. **No solutions here** — nothing in this section describes v2. (Full factual record: `LegacyRBAC.md` — ask Mihir; the findings below are lifted from it.)

### 0.1 The current flow

Today, "what can this user do?" is decided in **three disconnected places**, edited on three different screens, with no reconciliation between them:

1. **Roles** — 56 of them (46 still live). A role is a bag of checked permission leaves from the catalog (121 permissions in two trees: Asset and Administrative). A user can hold **several roles at once**; their grants are the union. Most roles aren't job functions — they're one-off feature switches ("E-mail", "Back Dated Data Entry" ×2, "View as Different User") or customer/demo specials ("DEMO CSM Role").
2. **The User Group's Module List** — every user belongs to one group (one group per customer, in practice), and the group carries a **second, independent copy of the permission tree** with its own checkboxes. This is the master gate: **when a role and the group's Module List disagree, the Module List wins.** A role's permissions only work *inside* what the group has enabled.
3. **The User Group's Workspace List** — a third list deciding which workspaces/plants the group can *see at all*. If the plant isn't here, nothing else matters.

On top of these, users also hold **per-asset Asset Roles** (one or more per plant), drawn from the same permission tree again.

So the effective access formula today is:

> (Administrative Roles ∪ per-asset Asset Roles) → **filtered by** the group's Module List → **filtered by** the group's Workspace List

Three objects, three owners, no screen that shows the combined result, and no warning when they disagree.

### 0.2 The problem, in current time

- **Assigning a role does not complete the loop.** A role grant only takes effect if the user's group *also* has the module enabled AND the plant is in the group's workspace list. Nothing in the UI says so — the role screen reports success, and the user reports "I still can't see it." (Worked example below.)
- **Fixing one user over-grants the whole group.** The usual "fix" for the incomplete loop is to enable the module on the group's Module List — which switches it on for **every user in that group**, not just the one you meant.
- **Revoking doesn't complete the loop either — a live security bug.** Removing a user's Asset Role from a plant looks like revoking their access, but plant *visibility* is gated by the group's Workspace List, which that action never touches. The user keeps seeing the plant and its dashboards; the admin believes access is cut; no warning appears anywhere. Dashboards have even been observed viewable by users with **no right at all** to the underlying plant.
- **Audits are unanswerable.** "What can this person do at plant X?" requires mentally intersecting three trees under a precedence rule that isn't displayed anywhere. In the production data, **725 of 753 users hold multiple stacked roles**, and **27 users point at a role that was deleted from the database** — nobody noticed.
- **Role names lie.** "Operator Administrative Role" grants only dashboard viewing — roughly 300 users would be wrongly promoted by any name-based reasoning. "Client Role" (read-only by intent) carries manual-ticket *write* permissions.
- **Every new need mints a new role.** Because roles double as feature switches, a customer wanting one extra capability gets a new bespoke role instead of a new assignment — that's how 56 roles happened, and it doesn't stop on its own.
- **No operational semantics.** Nothing in the legacy 121 permissions expresses approve / force-close / co-sign — the concepts the Issue Resolution feature is built on. Today there is no way to say who may approve or close anything.

### 0.3 Worked examples of today's flow

**Example 1 — onboarding an operator (the loop that doesn't close).**
A new operator joins a plant. The admin assigns them "Operator Asset Role" on that plant and tells them they're set.
- The operator logs in and **can't see the Tasks feature.** Why: their user group's Module List doesn't have the Tasks module checked — and the Module List wins over the role. The role screen showed no error.
- The admin finds the group, checks the module. Now it works — **for the entire group**, including three client viewers who were never meant to run tasks.
- If the plant also wasn't in the group's Workspace List, there's a third stop nobody told the admin about.
- The "assign a role" action is therefore **not one action** — it's three edits on three screens, must be done in the right order, silently over-grants in the middle, and no screen confirms the loop is closed.

**Example 2 — offboarding from one plant (the reverse loop, currently a security bug).**
A contractor finishes work at plant A. The admin opens their record and removes their Asset Role on plant A — the action that looks like "revoke access."
- The contractor **still sees plant A and its dashboards**, because visibility comes from the group's Workspace List, which nobody touched. No warning, no error — the admin genuinely believes access is revoked.
- To actually cut access the admin must also edit the group's Workspace List — but that list is shared, so removing the plant there removes it for **every** user in the group. There is no way to revoke one person's visibility at one plant.

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
| `floc` | Floc Detector (BioHealthTrack) — a hardware add-on with **no permissions of its own yet**, just a sold entitlement; its permissions arrive when its widget ships (see Step 2). |
| `inv` | Inventory Management. |

A module being licensed doesn't GIVE anyone a permission — it just allows permissions that are already tagged to that module to actually work. The one rule that runs the whole system:

> **Effective access at a plant = the person's permission `AND` the plant's licensed module.**

If a plant isn't licensed for a module, every permission tagged to that module goes dark there — but it stays saved on the person's profile, and comes back automatically the moment the plant licenses that module. Nothing is ever silently deleted by a licensing change.

**3. Every permission lives in one of 10 labeled boxes ("sets").**
`work`, `approve`, `oversight`, `remote`, `readplant`, `portfolio`, `people`, `tech`, `templates`, `flags`. You never assign someone one permission at a time — you give them a role, and a role is just a fixed list of these boxes.

**4. Roles and grants are fixed combinations of boxes — never invent a new one.**
There are exactly **5 roles** (L1 Operator, L3 Lead, L4 Senior Lead, Regular Non-op, Senior Non-op) and **4 admin grants** (People Admin, Technical Admin, Full Site Admin, Global Admin). Each is just a named list of which of the 10 boxes it includes. If a real person needs something slightly different, that's an **override** on their assignment at that plant (see Step 6) — you never create a 6th role, and there is no custom-role mechanism of any kind (cut on 2026-08-13 — see the simplification table above and Step 8).

**5. A few permissions are exceptions — never part of any role, ever.**
Three permissions (remote-control actuation, "view as another user," the sensor-health dashboard) are never included in any role by default. They're switched on for one named person at a time, with a written reason, and they're the one thing **Global Admin still gets automatically** — see Step 7.

That's it. Everything below is these five ideas turning into screens, tables, and buttons.

---

## 2. The building blocks (what you need to store)

Plain field lists — this is not a schema, just what data needs to exist somewhere. The prototype's in-memory variable names are in brackets so you can find the matching logic in `index.html`.

- **Plant** — name, company label, which modules are licensed. [`PLANTCO`, `PLANTMODS`]
- **Person** — name, title, **one role** (account-wide — one of the 5, see Step 4), one admin grant (or none), a list of plant assignments. [`PEOPLE`, `p.role`]
- **Assignment** — one row per (person, plant): plant access, plus any overrides (permissions manually added or removed) each with a mandatory written reason. The role is NOT on this row — it lives on the person. [`ASG` / `p.asg[plant]`]
- **Exception grant** — a person + a plant + one of the 3 exception permissions + a reason. [`remote.actuate`, `flags.impersonate`, `flags.sensorhealth`]
- **Audit log** — one line per change: who did what, to whom, when, why. [`AUDIT`]
- **Legacy deprecation flag** — one on/off switch per retiring old feature (see Step 12).

---

## 3. Build it in this order

Each step names the prototype tab and the key functions to read in `index.html`. Build and test each step before moving to the next — later steps assume earlier ones work.

### Step 1 — Plants: the base registry
- [ ] Store plant name + company label. The label is an explicit company **name picked from a small managed list** — not free text (free text would let "Vedanta" and "Vedanta Ltd" silently split one cluster in two), and not a container with its own screens. New labels get added inline from step 1 of the add-plant wizard (Global Admin only); rename/merge tooling can come later.
- [ ] A screen listing all plants, grouped by company label, with an "add plant" action.
- [ ] Adding a plant is a **guided onboarding wizard** (Global Admin only), not a bare name form: **1. plant details** (name + company label) → **2. product modules** (license what was sold — this is the one sanctioned moment licensing happens outside the Step-2 matrix) → **3. people** (put existing users on the access list at their account-wide role, and/or create new users with their role). Nothing is written until the final confirm — cancel leaves the registry untouched — and the whole onboarding lands as **one audited action**. A plant *can* still be created with no modules and no people (Platform Core is always on for everyone, everywhere, for free).

*Prototype:* the **Plants** tab. Read `renderPlants()`, `startAddPlant()` → `renderNP()`/`npFinish()` (the wizard), `plantModal()` in `index.html`.

### Step 2 — Product modules: the licensing ceiling
- [ ] A matrix: one row per plant, one column per module, one on/off switch per cell.
- [ ] Writing to this matrix is **Global Admin only** — this is the single place module flags are changed after a plant exists. The one exception is initial licensing inside the add-plant onboarding wizard (Step 1), which is also Global-Admin-only. Don't let any other screen edit modules directly, even to be "helpful" — link to this screen instead.
- [ ] Every permission in your system needs a `module` tag. A permission with no tag defaults to `core` (always on).
- [ ] `floc` (the BioHealthTrack hardware) is a special case: it's licensed and toggled exactly like the other 7 modules, but **no permission is tagged to it *yet*.** Today it exists so a contract can say what hardware was sold. The moment BioHealthTrack grows a user-facing widget or screen, add that permission with a `mod:floc` tag and the ceiling from this step handles the rest — the widget appears only at plants licensed for it, with no model changes. Same pattern for any future hardware add-on module.
- [ ] Clicking a module (here or anywhere it's shown as a card) should open a detail view: what it unlocks, and how many plants are licensed for it.

*Prototype:* the **Product modules** tab. Read `renderModules()`, `toggleMod()`, `plantMods(plant)`, `PERMMOD`, and `moduleModal()` for the detail view.
*Full permission → module mapping:* [`coverage-map.csv`](coverage-map.csv).

### Step 3 — People and admin grants
- [ ] A person record: name, title, **one role** (account-wide — a role describes the person, not a plant; decided 2026-07-30), and at most **one** admin grant (People / Technical / Full Site / Global — or none).
- [ ] A directory table (no avatars — just name, title, company, one role chip, the plants they can access, grant, status).
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

Two similar-sounding words that are NOT the same thing: **portfolio** is a permission set inside a role (the multi-plant *view* — see all your assigned plants at once; L4 and Senior Non-op carry it; it grants no management power and no extra plants). **Cluster** is an admin *scope* (every plant sharing one company label — it defines which plants a cluster admin can act on, see Step 11). Portfolio = what you can see across your own plants; cluster = which plants an admin can manage.

*Prototype:* read `SETS`, `ROLES`, `GRANTS`, `isStdG()`, and `roleModal()`/`grantModal()` for the detail views, in `index.html`. Full rule text: `CLAUDE.md` → "The v2 model."

### Step 5 — Assignments: the plant access list
- [ ] The role is **account-wide** — one role per person, everywhere (decided 2026-07-30: a role is the person's capability level — "either the user has decision-making ability or they don't" — not a per-plant attribute). Changing it applies at every plant the person touches, and resets each plant back to the new role's standard (exceptions belonged to the old role).
- [ ] An **assignment is plant access**, nothing more: one row per plant the person can see or act at. Rows differ by what each plant's **modules** license (and by per-plant overrides, Step 6) — never by role.
- [ ] The admin grant is account-wide too (one grant, works everywhere the person has any plant).
- [ ] Multi-plant screens don't need role-specific variants: each row (an issue, a task) carries its plant, and the actions on that row come from the person's role `AND` **that plant's modules** — rows differ by module, not by role (the same per-row mechanic as Step 2). Show a quiet "view-only here" marker on rows where the person can't act; don't hide the rows and don't build separate screens per role.

*Prototype:* the person profile editor inside the People tab. Read `togglePlantSel()`, `initAsg()`, `setRole()`.

**The exact shape to save, per person:**
```
{
  userId,
  role,
  grant,
  assignments: [
    { plant, company, overrides: { add: [...], remove: [...] }, reason, drift }
  ],
  entitlementContext: { modulesByPlant, cappedByPlant }
}
```
`role` is the person's one account-wide role. One `assignments` row per plant the person can access — note there is no role on the row. `overrides.add`/`overrides.remove` are permission keys like `approve.forceclose`. `entitlementContext` is **informational only** — a snapshot for display and debugging. **Never use it to decide access.** The real check, every time, at runtime, is always Step 2's rule: `user permission AND plant module`, computed fresh — never read from what was saved at assignment time.

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
- [ ] **Exclude these from every bulk action.** A plant-wide "give everyone X" action must silently skip these — never let one action hand out a sensitive exception to a whole roster. (There are no custom roles to bundle them into — that whole channel is gone, see Step 8.)
- [ ] Global Admin gets all three automatically (see Step 4) — that's the one exception to "always requires an explicit grant."

*Prototype:* read the `sensitive:true` flag on the `remote` set, the `preq` field on `flags.impersonate`, and the exclusion filter inside `bulkEditPerm()` — that function isn't built until Step 9; come back and re-check this bullet once it exists.

### Step 8 — Custom roles: REMOVED, do not build (decision 2026-08-13)
Earlier drafts specified "custom roles" here — named, reusable add/remove permission templates an admin could define once and apply to many people. **The feature is cut.** No custom roles will ever be created, and no admin — **People Admins included** — gets any capability to create or apply one.

- [ ] There is nothing to build in this step. Specifically do **not** build: template storage, a template-builder UI, an apply-to-people flow, per-user apply previews, or admin-scoped permission palettes.
- [ ] Everything a custom role would have done is already covered: a **per-person override with a written reason** (Step 6) for one person, or a **bulk permission edit** (Step 9) for many people at one plant.
- [ ] The step number is kept only so cross-references in older notes still line up.

*Prototype:* the **Role library** tab now shows the fixed catalog only, with a panel recording this decision.

### Step 9 — Plant-wide bulk actions
- [ ] **Bulk roster add:** put selected people on a plant's access list in one audited action. They join at their **account-wide role** — the action never asks for a role.
- [ ] There is deliberately **no bulk role change.** A role change is account-wide (Step 5), so running one from a plant-scoped bulk surface would reach plants outside the acting admin's scope — a cluster or plant admin must never be able to change what someone can do at a plant they don't manage. Roles change on the person record, one person at a time.
- [ ] **Bulk edit permission:** add or remove one specific permission for a chosen set of people at a plant — this writes a separate stamped, reasoned exception per person. There is no template layer behind it (custom roles were cut — Step 8).
- [ ] Every bulk action still checks the module ceiling and the exception-permission exclusion, person by person. Anyone skipped for either reason shows up in the action's summary line — never fail silently.

*Prototype:* read `bulkAddToPlant()`, `bulkEditPerm()`, `renderBulk()`.

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

*Full detail — which legacy permission is behind which flag, and what it becomes after the flag flips:* [`reference/role-permission-migration-map.xlsx`](reference/role-permission-migration-map.xlsx).

### Step 13 — Run the migration (the 753 real users)
This step needs files that are **not in the git repo.** Ask Mihir for them before you start — see Section 6 for the full list. Short version of what needs to happen:

- [ ] **517 people** get their new role + grant fully automatically — no question for a human.
- [ ] **236 people** also migrate automatically, but each one carries exactly one follow-up question for a plant manager to answer later (mostly: "does this L1 Operator actually approve/close issues? If yes, promote to L3 Lead" — that's 219 of the 236; the rest are a handful of "does this viewer actually run the site?" and "does this lead need a bigger admin grant?" checks).
- [ ] **Zero people are blocked.** There is no "figure this out later" bucket. Every one of the 753 gets a real answer on day one.
- [ ] The migration worksheet already lists **exactly one role per user — use it as-is.** The 11 people who looked "mixed-capacity" (different roles at different plants) were investigated and resolved: every one is an operator who also held a legacy client-viewer role at other plants purely for *visibility* — misconfigured role stacking, not mixed authority. They migrate at their operating role everywhere; the resolution record is `internal/single-role-resolution.md` (ask Mihir, same as the other internal files).
- [ ] **7 people** get their admin grant manually upgraded to Full Site Admin as part of this migration (they already held the other half of it under the old system).
- [ ] **49 people** currently have zero plants. 5 of those are pure admin-grant holders (handled automatically); the other 44 go into a short manual queue — assign them a real plant, or offboard them. Don't invent a plant for someone just to close the queue.
- [ ] The **Issue Resolution** feature (the whole `ops` module) stays unlicensed everywhere on day one, on purpose — it isn't built yet. This is why the "is this person a lead?" question above doesn't block anything: approval authority simply has no effect until the feature ships.
- [ ] Skip all 10 legacy roles marked `isArchived:true` — they're test/demo roles, nobody real holds any of them, so there's nothing to map.

*Per-user exact answers (all 753, old role + old permissions → new role + new permissions):* `internal/migration-final-mapping.xlsx`.
*Per-user action list (what to do, what to ask):* `internal/migration-worksheet-final-rev2.xlsx`.
*The 7 admin-grant upgrades, with evidence:* `internal/admin-grants-applied.xlsx`.
*⚠ Important:* `internal/migrate.js` and `internal/MIGRATION-RUNBOOK.md` were written earlier in the project and predate several rulings above (they still say some users go on hold, and don't know about the deleted/deprecated permissions or the 7 grant upgrades). Treat the three files named above as correct today; update `migrate.js` to match them before running it for real.

### Step 14 — After migration: the follow-up queue
- [ ] The 219 "operator or lead?" questions and the 9 "viewer or site-admin?" questions from Step 13 don't need answers immediately — track them as a simple list plant managers clear over time.
- [ ] When the Issue Resolution feature actually ships: license the `ops` module per plant as each one is ready, and start asking the 219 promotion questions for real.
- [ ] Flip the Step 12 deprecation flags one at a time, only after each old feature's replacement is confirmed working — never flip more than one at once, and watch for a day before moving to the next.

---

## 4. Where every legacy permission goes

The old system had **121 permissions** spread across 56 overlapping roles. Every one of them has a decided new home. Don't invent a mapping — look it up:

- [`coverage-map.csv`](coverage-map.csv) — the simple version: old permission tag → new permission (or "deleted," "retired," etc.), one row each.
- [`reference/role-permission-migration-map.xlsx`](reference/role-permission-migration-map.xlsx) — the developer-friendly version of the same thing, organized by destination: which permissions live under which of the 5 roles / 4 grants, which 3 are exceptions (Step 7), which are behind a deprecation flag (Step 12) and what they'll become, and which are simply deleted. **Start here if you're writing the actual mapping code.**

Optional deeper reading, if you need the reasoning behind a specific call: [`reference/permissions-decisions-reviewed.xlsx`](reference/permissions-decisions-reviewed.xlsx) (the full decision record for all 121) and [`reference/permissions-catalog.xlsx`](reference/permissions-catalog.xlsx) (the raw legacy catalog, exported as-is from the old database). Neither is required to build.

A few permissions in the new system have **no old equivalent at all** — they're genuinely new capabilities the redesign adds: the core of the `approve` set (approving/rejecting gates, self-approve, force-close, reopen, photo override) and the co-sign permission in `oversight`, plus `remote.actuate`, `tech.stores`, and `flags.sensorhealth`. Don't go looking for a legacy source for these — there isn't one.

Three permissions that *sit inside* the `approve` set are different — they DO have a legacy source, so don't skip them when reading `coverage-map.csv`: `approve.assign` (creating/assigning tasks), `approve.invlogs` (the inventory movement log), and `approve.datacorrect` (editing a recorded entry — maps from `DataCorrection_Manage_WE`). For `approve.datacorrect`, what's new is its **placement and audience** (an approve-set line held by L3+ / Technical Admin+, per the 2026-07-22 ruling), not the capability itself.

---

## 5. Rules that must never be broken

Short list. If new code violates one of these, it's a bug, not a design choice.

1. **Effective access is always `permission AND plant module`.** Never grant something that skips the module check.
2. **Global Admin's own access check never says "no."** This is about what a Global Admin holds, not about handing things out — see rule 3.
3. **The 3 exception permissions can never be bundled into a role or a bulk action — for anyone else.** They only ever reach someone else one person, one plant, one reason at a time. (Global Admin is the one person who already has them, per rule 2 — that's not the same as a bulk grant.)
4. **Every override needs a written reason.** No silent deviations from a role standard.
5. **Company is a label, not a container.** Never build a screen that treats "company" as something people or plants belong *inside*.
6. **The role catalog is closed.** Exactly 5 roles and 4 grants, forever — no custom roles, no role-creation UI of any kind, for anyone (decision 2026-08-13). If a screen lets any admin mint or apply a new role shape, it's a bug.
7. **Module writes happen in exactly one place** (Step 2). Every other screen that shows modules is read-only, with a link back to Step 2.
8. **The word "workspace" and the phrase "CloseTheLoop" never appear in any user-facing text.** "Workspace" is retired; "CloseTheLoop" is an internal codename only — the product name is "User Center — Roles & Permissions."
9. **Deprecation flags gate old screens, not the module ceiling.** Don't reuse Step 2's mechanism for Step 12 — they solve different problems (see Step 12 for why).

---

## 6. Reference index

Only the documents this PRD actually points you to — every one of them either in this repo already, or linked directly.

| Doc | What it's for |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The full model spec — every ruling, in detail, with dates. The source of truth this PRD is built from. |
| [`README.md`](README.md) | How the prototype is deployed (GitHub Pages) and how to run it locally. |
| [`coverage-map.csv`](coverage-map.csv) | All 121 old permissions → their new home, one row each. |
| [`build-note-roles-grants.html`](build-note-roles-grants.html) | One-page dev build note: the roles-vs-grants separation contract (zero shared permissions), the operate-vs-configure module table, and the runtime-check flow chart. |
| [`reference/module-feature-permission-map.xlsx`](reference/module-feature-permission-map.xlsx) | The lookup workbook: module → feature → permission tags, role → permissions, grant → permissions, and the legacy-tag audit flagging every tag that doesn't carry into v2. |
| [`tests/`](tests/) | Five dependency-free node scripts that assert every rule in this PRD against the prototype (`node tests/verify-usercenter.js`). |
| [`index.html`](index.html) | The working prototype — the reference implementation for every step above. |
| [`GUIDE.html`](GUIDE.html) | The prototype user guide — personas, every screen, eight click-by-click recipes. Read it alongside the prototype; Section 7 is its index. |
| [`presentation/index.html`](presentation/index.html) | A guided onboarding walkthrough version of the same model — useful for demos, not a build target. |
| [`reference/role-permission-migration-map.xlsx`](reference/role-permission-migration-map.xlsx) | The developer-facing permission map (Section 4) — start here for mapping code. |
| [`reference/permissions-decisions-reviewed.xlsx`](reference/permissions-decisions-reviewed.xlsx) | Optional — every one of the 121 permissions, decided, with reasoning. |
| [`reference/permissions-catalog.xlsx`](reference/permissions-catalog.xlsx) | Optional — the raw legacy permission catalog, exported as-is from the old database. |

**Step 13's migration files are the one exception** — `migration-final-mapping.xlsx`, `migration-worksheet-final-rev2.xlsx`, and `admin-grants-applied.xlsx` each contain real user records (753, 753, and 7 respectively), so they're **not linked here** and stay off the public site. Ask Mihir for these directly when you're ready to run the migration.

## 7. Prototype walkthrough — how to drive it yourself

Every rule in Sections 1–5 is already working and clickable in [the prototype](index.html). This section is the map: who to be, which screen does what, and eight click-by-click recipes that each demonstrate one rule end to end. The full walkthrough with every control described lives in [`GUIDE.html`](GUIDE.html) — each row below deep-links into it.

> Nothing in the prototype is persisted — **refresh and everything resets** to the seed data (6 plants across 4 clusters, 5 people, a full set of modules and licences). Click anything without fear; you cannot break it.

### 7.1 The three personas — start by choosing who you are

Three buttons at the bottom of the left rail. Everything re-scopes instantly when you switch. Switching personas is the fastest way to check the thing Step 11 insists on: scope is enforced inside every action, not merely hidden in the UI.

| Persona | Scope | What it proves |
|---|---|---|
| **🌐 Company admin** (Global) | Every company, plant and person | The only persona that can license modules, onboard plants, and hand out the Global grant. Global Admin is the superuser — Step 3. |
| **🏢 Cluster admin** (Vedanta) | The 2 Vedanta plants | Module matrix goes read-only (ADR-003); cluster-wide chips appear; nothing can reach a non-Vedanta plant — Step 11. |
| **🏭 Plant admin** (Essentia STP) | One plant's roster | The tightest scope: bulk actions, exceptions and reviews all clamp to one plant — Steps 9 and 11. |

*Guide:* [GUIDE.html → Choose who you are](GUIDE.html#personas).

### 7.2 The seven screens, and the build step each one implements

| Screen | What it is | Build step |
|---|---|---|
| [People (User Center)](GUIDE.html#people) | The person registry everything drives from — directory, needs-attention queue, and the profile editor where role, admin grant, plant access and exceptions are set. | Steps 3, 5, 6, 7 |
| [Plants](GUIDE.html#plants) | The plant registry grouped by company label, plant records with rosters, and the add-plant onboarding wizard. | Step 1 |
| [Product modules](GUIDE.html#modules) | The licensing ceiling — the plant × module matrix, and the one write surface for licences after onboarding. | Step 2 |
| [Role library](GUIDE.html#library) | The fixed 5 roles + 4 grants as detail cards — the complete role vocabulary; a panel records the 2026-08-13 removal of custom roles. | Steps 4, 8 (8 = nothing to build) |
| [Access review](GUIDE.html#review) | The reviewer cross-check: person lens (capability × plant matrix with why-chains) and plant lens ("who can do X here?"). | Step 10 |
| [App preview](GUIDE.html#previews) | The rule-driven visibility engine — what tabs, buttons and banners a given person actually sees at a given plant, with the permission that produced each one. | Step 11b |
| [Control panel](GUIDE.html#control) | The scoped home for cluster and plant admins: scope KPIs, quick actions, capability lookup, scoped roster. | Step 11 |

### 7.3 Eight recipes — one rule demonstrated per recipe

Each recipe names the persona to start from and takes a few clicks. Run them in order the first time; together they cover every guardrail this PRD asks you to build.

| # | Recipe | The rule it demonstrates |
|---|---|---|
| 1 | [Add a person and give them access](GUIDE.html#r1) | One account-wide role + a plant access list is the whole assignment. Deviations block the save until each has a written reason — Steps 3, 5, 6. |
| 2 | [Grant remote control to one person at one plant](GUIDE.html#r2) | Sensitive permissions are per-person, per-plant, reasoned only — never in a role default or a bulk action (and there are no custom roles to bundle them into) — Step 7. |
| 3 | [Simulate a contract change](GUIDE.html#r3) | The module ceiling: flip a licence off and watch capped lines grey out everywhere without a single user profile being edited — Step 2. |
| 4 | [Answer "who can approve issues at this plant?"](GUIDE.html#r4) | The audit question today's system can't answer, resolved in one query that respects the ceiling — Step 10. |
| 5 | [Run a plant-wide bulk action](GUIDE.html#r5) | Bulk adds people to a plant or edits specific permissions for a set of them — with ceiling, prerequisites and skips audited. No bulk role change — and no custom-role templates — by design — Step 9. |
| 6 | [Preview exactly what someone will see](GUIDE.html#r6) | Frontend visibility is derived from permission state, not per-role mockups. The why-list is the spec the real UI follows — Step 11b. |
| 7 | [Add or remove someone from a plant's roster](GUIDE.html#r7) | Removing a plant row is the complete revocation — the defect from §0.2 cannot occur in this model — Step 5. |
| 8 | [Onboard a new plant end to end](GUIDE.html#r8) | Plant details → product modules → people as one audited action, committed only at the final step — Step 1. |

*Also in the guide:* [Colours & badges](GUIDE.html#colors) — what amber, grey, the drift count and 📦 mean, consistently on every screen. Worth reading before recipe 1.
