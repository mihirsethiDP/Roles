# CLAUDE.md — CloseTheLoop v2 Roles & Permissions

## What this project is

Prototype + spec for overhauling DigitalPaani's roles & permissions system
(CloseTheLoop v2). The legacy system (EcoInnovision V1) has 56 roles built from
121 atomic permissions; 725 of 753 users hold multiple stacked roles. v2 replaces
this with a composable model. The prototype in `index.html` ("Role Studio") is the
reference implementation of both the configuration UX and the UI-visibility rules.

Owner: Mihir Sethi (APM, DigitalPaani). Collaborators: Alexander Loijos (Product
Lead), Ranjana (design), Shivam Jisoriya (tech).

## The v2 model (settled — do not redesign)

- **Product modules cap everything (top of the hierarchy).** DigitalPaani sells
  product modules to companies; modules are licensed **per plant** (`PLANTMODS`
  in index.html, editable in the "Product modules" tab). 8 modules — see
  `MODULES`: core (always included), ops (Issue Resolution), tasks (Tasks/Shifts/
  Maintenance), data (Data/Lab/Logbook), analytics (Dashboards & Analytics),
  iot (IoT & Remote Control), floc (Floc Detector — **permissionless hardware
  add-on**: `noperm:true`, no `mod:` tag points to it; exists purely as a plant
  entitlement so contracts track what's sold; never caps or grants anything
  user-side — this is the pattern for future hardware SKUs), inv (Inventory
  Management — added 2026-07,
  supersedes the old "Stores/Inventory = Phase 2" deferral; `work.inventory`
  gives operators add/remove on usage/expiry/purchase, `approve.invlogs` gives
  supervisors the movement log — both net-new to the backend, like APPR).
  Every permission carries a `mod:` tag (`PERMMOD`);
  modules cut ACROSS role-type sets on purpose (e.g. tasks module spans work,
  approve, people, readplant). **Effective access at a plant = user permission
  ∧ plant module.** The ceiling caps but never edits the user profile: capped
  permissions stay saved and activate if the plant's plan is upgraded — so
  per-user flexibility survives module changes.
- **9 permission sets, 43 individual permissions** — see `SETS` in index.html.
  Sets: work, approve, oversight, readplant, portfolio, people, tech, templates, flags.
- **5 base roles** = default set compositions (see `ROLES`):
  L1 = work + readplant · L3 = L1 + approve · L4 = L3 + oversight + portfolio ·
  Regular Non-op = readplant · Senior Non-op = readplant + portfolio.
- **4 admin grants** (orthogonal, max one per user per site): People, Technical,
  Full Site (= People + Technical), Global (= Full Site anywhere + templates).
- **Flexibility = per-user overrides** at set or individual-permission level.
  Guardrails (all implemented in index.html, keep them): dependency cascades
  (approve→work, oversight→approve, portfolio→readplant, templates→people+tech,
  flags→parent grant fully on), mandatory reason for any deviation, visible
  drift count. Overrides are exceptions with a shelf life — flags expire on
  role change; recurring identical overrides signal the role standard should change.
- **Assignment scope (owner ruling 2026-07-13, per ADR-002): no containers.**
  Company is a LABEL on the plant record (`PLANTCO`/`COMPANIES`), never an
  entity — "Company is actually the Plant." People are assigned directly to
  plants; pickers group plants by company label. The word "workspace" is
  retired from all UI (per-permission labels included).
- **Per-plant assignments (owner ruling 2026-07-13): a person holds a tier
  PER PLANT** — `ASG` in index.html, one row per (person, plant), different
  capacities at different plants are first-class (74 real users in the
  migration data need this). Overrides and their mandatory reason are scoped
  per plant; drift is counted per plant; guardrail cascades run per
  assignment. Grant stays account-level (max one per user per site). The old
  "split vs edit the group assignment" open question is dissolved — you edit
  rows.
- **Save payload shape v2** (backend contract — see `save()` in index.html):
  `{userId, assignments:[{plant, company, tier, overrides:{add[],remove[]}, reason, drift}], grant, entitlementContext:{modulesByPlant, cappedByPlant}}`
  Override keys are `set.permission` strings, e.g. `approve.forceclose`.
  `entitlementContext` is informational — the runtime permission check at a
  plant is always `user permission AND plant module`; entitlements live on the
  plant/contract record, not the user.
- **Product name (owner ruling 2026-07-13): "User Center — Roles &
  Permissions".** "CloseTheLoop" stays only as the internal project codename
  in docs — it must not appear in any UI string of either prototype.
- **Personas** (index.html hero toggle, three admin altitudes): 🌐 Company
  admin (Global) sees everything and edits module flags; 🏢 Cluster admin
  (GreenGrid, `CLUSTER_CO`) manages the 4 GreenGrid plants; 🏭 Plant admin
  (People Admin @ STP — Sector 62, `SITE_SCOPE`) manages one plant. Cluster
  and plant admins: read-only module matrix (ADR-003 gating), Global grant
  chip locked, whole-cluster chips only at cluster level and above. All
  scoping flows through `inScope`/`scopedPlants`/`scopedPeople`; every
  bulk action is scope-checked in the function, not just hidden in UI.
- **Plant-wide bulk actions** (`bulkSetTier`/`bulkEditPerm`, panel in the
  User Center): assign a tier to a plant's whole roster in one audited
  action (custom-role bundles re-apply via live link; hand-made exceptions
  reset with the tier), or add/remove specific permissions for a selected
  set of users — written as per-person per-plant reasoned exceptions
  (stamped, NOT live-linked; the named live-linked variant is a custom
  role). Module ceiling and flag prerequisites enforced per person;
  reason mandatory; skips are counted in the audit line.
- **Custom roles = add-only live-linked bundles** (`PACKS`,
  `createCustomRole`) — NOT catalog forks: base role + named extra abilities +
  one recorded reason, bulk-applied to many people/plants in one audited
  action; exception flags are refused by design; retiring revokes everywhere
  at once; the review why-chain names the bundle (provenance via
  `asg[plant].packKeys`). Global persona gets ⚡ whole-cluster select chips
  (per company) in the plant picker and the pack builder.
- **User Center** (index.html tab 1) — the person registry everything drives
  from: `PEOPLE` (5 seeds + add-person), directory with KPIs/search/filters,
  person profile = the per-plant assignment editor bound to that record
  (`cur`; `ASG`/`grant` are views onto `cur.asg`/`cur.grant`), save writes
  back to the registry + `AUDIT`. Access review reads `PEOPLE` directly
  (`reviewPeople()===PEOPLE`, no fork); the smart preview's "Selected person"
  preset renders whoever is open. New people start with zero access.
- **Access Review tab** (index.html tab 2) — the reviewer cross-check surface
  demanded by PRD §8 #1 / PM-brief US-5 / the owner: person lens (capability ×
  plant matrix, 5 cell states: ✓ default · ✚ added · ⊘ removed · ▢ capped ·
  − off) with a click-through **why-chain** sentence per cell; plant lens
  (roster, "who can do X here?" capability query that respects the module
  ceiling, changed-recently audit list). Seeded people incl. the live
  configurator state. Amber ALWAYS means deviation; grey ALWAYS means module
  not licensed.

## Hard-won decisions (do not regress)

1. **Plant visibility (readplant) is standard for EVERY plant-touching role**,
   not just Non-op. L1 sees dashboards. Non-op's distinction is having ONLY that set.
2. **121/121 production permissions are mapped** — `coverage-map.csv` is the
   authoritative old-tag → new-home table. 14 gap fixes came from that audit
   (maintenance, check-in, my-shift, assign-tasks, plant layout/digital twin,
   insights/events views, diagnostic flows, plant setup, PLC/HMI/IoT, site
   templates, AI widget generator, skills, groups/workspaces, data-correction
   merge). Never invent permissions; extend from the CSV.
3. **Deliberate retirements** (document, don't "fix"): free-form role creation
   (GroupRole_Manage) replaced by fixed roles + overrides; legacy Visualisation
   Workspace superseded; forget-password and video tutorials are platform
   baseline, not permissions. (Stores/Inventory was deferred here until
   2026-07 — now shipped as the `inv` product module, see above.)
4. **Approval permissions are net-new to the backend** — nothing in the legacy
   121 expresses approve/force-close/reopen. New sub-feature needed (e.g. APPR).
5. **Smart preview is rule-driven, not per-role mockups** — every tab/button/banner
   derives from permission state (see `computeTabs`, `landingTab`, `bodyFor`).
   Landing priority: approvals → issues → portfolio → dashboard → admin.
   These rules ARE the frontend visibility spec.
6. **Migration**: default down, promote up. 490 users migrate by script, 236 get
   safe defaults + one promotion question, 27 on HOLD (orphaned roleId
   67000a18659b9e13b8f9afbc — deleted role, identify from backup first).
   **Numbers pinned 2026-07-14 against fresh production exports** (data/,
   local-only; full record in internal/NUMBER-PINS.md): users = 753 final,
   1:1 with the worksheet; roles = 56 docs / 46 live / 44 live-and-assigned
   names; orphan confirmed exactly (160 rows, 27 users); 1,494 (user, plant)
   pairs matching the worksheet with zero mismatches; TRUE mixed-capacity
   multi-plant users = 11 (per-plant resolution: internal/split-resolution.csv).
   Known traps: Operator Administrative Role's name lies (it's dashboard-only);
   Client Role carries manual-ticket write perms despite mapping to read-only.

## Files

- `index.html` — Role Studio: brand-book navy sidenav shell (Manage: People,
  Plants & modules · Verify: Access review, UI previews · personas at the
  bottom of the rail; People is the landing screen) · plants & modules
  record · User Center (people directory with a needs-attention queue that
  counts down to ✓ → per-plant assignment editor with progressive
  disclosure, a profile progress meter and a save button that counts
  remaining reasons → peak-end save confirmation with the payload behind a
  "For engineers" disclosure) · Access Review · smart UI preview engine. Single self-contained file,
  vanilla JS, no build step.
  Brand Book v7 tokens (owner ruling 2026-07-14): navy #002454, teal
  #95CFD3/#5AABB0 (dark-teal #1F6B71 for AA text), warn/err from the
  severity ladder (#FFF8E1/#B45309, #B80000), Figtree + IBM Plex Mono.
  No purple, no sage, no rust in product surfaces.
- `coverage-map.csv` — all 121 legacy permission tags → v2 home + status.
- `README.md` — GitHub Pages deploy steps (repo: github.com/mihirsethiDP/Roles;
  Pages had a transient deploy failure; Netlify Drop is the fallback).
- `data/` (add locally if present) — production exports: Roles.json,
  userGroup-user-role.json, userGroup-workspace-asset-user-role.json,
  permissions/features/modules/subfeatures JSON. Never commit real user data
  to the public repo.

## Conventions

- Plain language over jargon in all user-facing copy ("does the work", not "EXECUTE").
- Visual hierarchy over dense text; progressive disclosure by default.
- Operator-facing screens must work for low-literacy users: big single actions,
  worst-first ordering, icons + short labels. Multilingual (EN/HI/TA/MR) eventually.
- Keep index.html dependency-free and deployable as a static file.

## Likely next tasks

- Split index.html into modules only if it grows further; keep static hosting.
- Add notification-preset preview (bell mock per role/severity).
- Phase 2 of IMPROVEMENT-PLAN.md (local, gitignored — internal): PM-brief
  one-pagers (cluster tree with (node, tier) rows / add-only Exception Packs /
  stamp cloning / shielded templates), migration script spec, worksheet rev-2
  (inventory routing + per-plant splits for the 74 mixed-capacity users),
  SETS↔CAPS reconciliation, request roles-permissions.md + GAP-ANALYSIS.md
  from Alex.
- Generate backend spec: Mongo schema for roles/bundles/assignments/overrides,
  new APPR permissions, route→permission map completion (165 routes unmapped
  in the legacy Routes Permission sheet; 17 mapped tags are invalid).
- Fold ops-lead answers (L1 vs L3 per Operator Asset user) into the migration
  worksheet when they arrive.
