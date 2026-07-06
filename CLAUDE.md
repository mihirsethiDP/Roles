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
- **Assignment scope**: workspace → multi-select plants. One tier per user per
  plant; at most one grant per user per site.
- **Save payload shape** (backend contract — see `save()` in index.html):
  `{userId, scope:{workspace, plants[]}, baseRole, grant, overrides:{add[],remove[]}, reason, drift, entitlementContext:{modulesByPlant, cappedBySelectedPlants[]}}`
  Override keys are `set.permission` strings, e.g. `approve.forceclose`.
  `entitlementContext` is informational — the runtime permission check at a
  plant is always `user permission AND plant module`; entitlements live on the
  plant/contract record, not the user.

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
   Known traps: Operator Administrative Role's name lies (it's dashboard-only);
   Client Role carries manual-ticket write perms despite mapping to read-only.

## Files

- `index.html` — Role Studio: progressive-disclosure configurator (role → summary
  → customize; set master toggles with partial state; per-permission toggles) +
  smart UI preview engine. Single self-contained file, vanilla JS, no build step.
  DigitalPaani navy #193458, ops teal #0E7C66, admin purple #5548C8.
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
- Prototype the edit flow: user has same tier on 4 plants, needs a different
  tier on one — split vs edit the group assignment (open design question).
- Generate backend spec: Mongo schema for roles/bundles/assignments/overrides,
  new APPR permissions, route→permission map completion (165 routes unmapped
  in the legacy Routes Permission sheet; 17 mapped tags are invalid).
- Fold ops-lead answers (L1 vs L3 per Operator Asset user) into the migration
  worksheet when they arrive.
