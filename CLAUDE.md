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
  `MODULES`: core (always included), ops (Issue Resolution), tasks (Tasks &
  Shifts — maintenance deleted 2026-07-22), data (Data/Lab/Logbook), analytics (Dashboards & Analytics),
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
- **10 permission sets** — see `SETS` in index.html.
  Sets: work, approve, oversight, remote, readplant, portfolio, people, tech, templates, flags.
  **Everyday work lives in the baseline kitty (owner ruling 2026-07-21):**
  routine tasks/shifts (`readplant.tasks`/`myshift`, `mod:tasks`) AND data
  entry (`readplant.data`, `mod:data`) sit in `readplant` alongside dashboards
  & insights — so EVERY plant-touching role incl. Non-op viewers keeps them
  (module-gated), matching the current product: there is NO view/execute split
  (owner ruling 2026-07-22 — whoever can view the task/data pages can act).
  (`readplant.maintenance` and `readplant.checkin` were REMOVED 2026-07-22:
  the owner deleted the Plant Maintenance and Check-in features outright;
  equipment history narrows to task/data history. The `tasks` module is now
  named "Tasks & Shifts".) `work` is now
  the issue-resolution lifecycle (sessions, rc, media, raise, handoff =
  `mod:ops`) plus stock (`work.inventory`, `mod:inv`). Net effect: deferring the
  CloseTheLoop/Issue-Resolution feature = the `ops` module stays unlicensed →
  the issue lines go dark for everyone, while dashboards/insights/tasks/data keep
  working. (Data was promoted to baseline 2026-07-21; inventory stays
  operator-level because it isn't relevant to every plant/user in the current
  system — owner ruling.)
  **Exception flags (owner rulings 2026-07-15 + 2026-07-22): `impersonate`
  (view-as, preq people) and `sensorhealth` (sensor health dashboard,
  `mod:iot`) — both per-person exception grants, never a role default.**
  Back-dated entry retired from flags entirely (one-time MERGE into normal
  data work). Data correction is `approve.datacorrect` (net-new like APPR,
  `mod:data`, L3+ · Technical Admin+ — owner ruling 2026-07-22 supersedes
  canonical §6's L1+-with-co-sign).
  **IoT remote control is its own dedicated sensitive set (owner ruling
  2026-07-15): `remote` set, one perm `remote.actuate` (`mod:iot`),
  `sensitive:true`.** It is in NO base role's std composition, so it is never
  granted by default; it can only be added deliberately per person (with a
  reason, capped by the IoT module). Because it's sensitive it is
  **excluded from every bulk path** — skipped by the plant-wide permission
  edit (`bulkEditPerm` filters `setById[k].sensitive`), and since custom roles
  were removed outright (ruling 2026-08-13) there is no template channel
  either — so it can never be handed to a plant/cluster roster at once. Seed Satyadev Singh shows the intended path: +remote.actuate at Essentia STP
  with a certification reason. (Supersedes the brief `approve.remote` placement;
  still consistent with canonical L3-actuation since remote requires acting
  authority in practice, but the grant is now always explicit, never a tier default.)
- **5 base roles** = default set compositions (see `ROLES`):
  L1 = work + readplant · L3 = L1 + approve · L4 = L3 + oversight + portfolio ·
  Regular Non-op = readplant · Senior Non-op = readplant + portfolio.
- **4 admin grants** (orthogonal, max one per user per site): People, Technical,
  Full Site (= People + Technical), Global (= Full Site anywhere + templates).
  **Global Admin = SUPERUSER (owner ruling 2026-07-22): implicit holder of
  anything and everything — all 10 sets at every plant INCLUDING the exception
  flags (remote.actuate, impersonate, sensorhealth).** Docs and migration
  outputs must never show a permission as out of Global reach; the per-person
  exception process applies to everyone else.
- **Flexibility = per-user overrides** at set or individual-permission level.
  Guardrails (all implemented in index.html, keep them): dependency cascades
  (approve→work, oversight→approve, portfolio→readplant, templates→people+tech,
  flags→prerequisite set on: impersonate needs people), mandatory reason for any deviation, visible
  drift count. Overrides are exceptions with a shelf life — flags expire on
  role change; recurring identical overrides signal the role standard should change.
- **Assignment scope (owner ruling 2026-07-13, per ADR-002): no containers.**
  Company is a LABEL on the plant record (`PLANTCO`/`COMPANIES`), never an
  entity — "Company is actually the Plant." People are assigned directly to
  plants; pickers group plants by company label. The word "workspace" is
  retired from all UI (per-permission labels included).
- **ONE ROLE PER USER, account-wide (ruling 2026-07-30 — Mansi/CEO + Alex +
  owner; SUPERSEDES the 2026-07-13 per-plant-tier ruling).** A role is a
  capability level of the PERSON ("either the user has decision-making
  ability or doesn't"), not a per-plant attribute. Plant assignments remain
  per person as an ACCESS LIST (which plants they can see/act at), and the
  module ceiling still applies per plant — but the tier is one field on the
  user. Per-person-per-plant exception grants (remote.actuate etc.) survive
  unchanged; whether general per-plant overrides survive is an open design
  question (lean: keep, they are the flexibility valve). Empirical basis:
  the 11 "true mixed-capacity" users all resolve as operators who held
  legacy Client viewer roles at other plants for VISIBILITY — misconfigured
  stacking, not mixed authority (internal/single-role-resolution.md). Day-one
  risk of flattening ≈ nil (ops module unlicensed; L1-everywhere ≈ viewer +
  stock at inv plants); the per-plant ops-enablement review catches the rest.
  **Implemented 2026-07-30 across prototype + PRD:** index.html's profile
  editor has ONE account-wide role picker (`p.role`/`setRole`; `ASG[plant].tier`
  stays as storage but always mirrors the person's role; changing the role
  resets every plant to the new standard — old-role exceptions are cleared),
  the save payload moved tier out of assignments[] (see next bullet), seeds
  flattened (Asha = l3 everywhere), directory/review/previews show the role
  once with plants as an access list, and `bulkSetTier` was re-scoped to
  `bulkAddToPlant` (see Plant-wide bulk actions). PRD Steps 3/5/9/13 + GUIDE
  updated to match. Overrides and their mandatory reason are scoped
  per plant; drift is counted per plant; guardrail cascades run per
  assignment. Grant stays account-level (max one per user per site). The old
  "split vs edit the group assignment" open question is dissolved — you edit
  rows.
- **Save payload shape v2** (backend contract — see `save()` in index.html;
  reshaped for the 2026-07-30 single-role ruling — role is top-level, no tier
  on assignment rows):
  `{userId, role, grant, assignments:[{plant, company, overrides:{add[],remove[]}, reason, drift}], entitlementContext:{modulesByPlant, cappedByPlant}}`
  Override keys are `set.permission` strings, e.g. `approve.forceclose`.
  `entitlementContext` is informational — the runtime permission check at a
  plant is always `user permission AND plant module`; entitlements live on the
  plant/contract record, not the user.
- **Product name (owner ruling 2026-07-13): "User Center — Roles &
  Permissions".** "CloseTheLoop" stays only as the internal project codename
  in docs — it must not appear in any UI string of either prototype.
- **Personas** (index.html sidenav toggle, three admin altitudes): 🌐
  DigitalPaani admin (Global) sees everything and edits module flags; 🏢
  Cluster admin (Vedanta, `CLUSTER_CO`) manages the 2 Vedanta plants; 🏭
  Plant admin (Essentia STP, `SITE_SCOPE`) manages one plant. Cluster
  and plant admins: read-only module matrix (ADR-003 gating), Global grant
  chip locked, whole-cluster chips only at cluster level and above. All
  scoping flows through `inScope`/`scopedPlants`/`scopedPeople`; every
  bulk action is scope-checked in the function, not just hidden in UI.
- **Plant-wide bulk actions** (`bulkAddToPlant`/`bulkEditPerm`, panel in the
  User Center): add selected people to a plant's access list in one audited
  action — they join at their ACCOUNT-WIDE role (2026-07-30 ruling; the old
  `bulkSetTier` was deliberately NOT kept as an account-level role change:
  a role change is account-wide, so from a plant-scoped bulk surface it
  would reach plants outside the acting admin's scope — roles change on the
  person record only, never in bulk). Or add/remove specific permissions for
  a selected set of users — written as per-person per-plant reasoned
  exceptions (stamped, NOT live-linked; there is no template layer — custom
  roles were removed 2026-08-13). Module ceiling and flag prerequisites
  enforced per person; reason mandatory; skips are counted in the audit line.
- **Custom roles: REMOVED ENTIRELY (owner ruling 2026-08-13 — SUPERSEDES the
  2026-07-16 custom-roles ruling).** None will ever be created, and no admin —
  **People Admins included** — gets any create-or-apply capability. The whole
  subsystem was deleted from index.html (`PACKS`, `createCustomRole`,
  `applyCustomRole`, `applyPreview`, `customPalette`, `retirePack`, the
  builder/apply UI); do not resurrect it. The fixed 9 (5 base roles + 4
  grants) are the complete, permanent role vocabulary. Flexibility =
  per-person per-plant reasoned overrides (profile editor) or the plant-wide
  bulk permission edit — both stamped per person, audited, module-capped.
  Role library (tab 4, `renderLibrary`) shows the fixed catalog with live
  holder counts plus a panel recording this decision. PRD: top-level
  "simplification" section added, Step 8 is a do-not-build tombstone, §5
  rule 6 = "the role catalog is closed"; GUIDE recipe removed;
  tests/verify-usercenter.js asserts the absence.
- **Detail modals** (`roleModal`/`grantModal`/`moduleModal`) — clicking any
  base-role, grant, or module card opens a modal with the full brief (every
  permission it grants, holder counts, per-plant licensing, notes).
- **Control panel** (index.html tab 5, `renderControlPanel`) — the scoped home
  for cluster/plant admins only (hidden + explained for Global; a Global admin
  landing on it is bounced to People): scope KPIs, quick actions (plant-wide
  action, role library), a "who can do X here?" capability lookup, and the
  scoped roster with jump-to-manage. Everything scoped via `inScope`.
- **People directory is a table** (no user avatars — icons removed per owner
  ruling): name/title/company, one role chip, plant-access chips, grant,
  status; row-click opens the profile.
- **User Center** (index.html tab 1) — the person registry everything drives
- **User Center** (index.html tab 1) — the person registry everything drives
  from: `PEOPLE` (5 seeds + add-person), directory with KPIs/search/filters,
  person profile = the role + plant-access editor bound to that record
  (`cur`; `ASG`/`grant`/`role` are views onto `cur.asg`/`cur.grant`/`cur.role`), save writes
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
   Workspace superseded (incl. its Configuration perm — deleted 2026-07-22);
   forget-password is platform baseline, not a permission (video tutorials were
   also baseline until the 2026-07-22 ruling deleted the feature outright).
   (Stores/Inventory was deferred here until 2026-07 — now shipped as the
   `inv` product module, see above.) **Owner deletions 2026-07-22** (from the
   permission-catalog review, recorded in
   internal/EcoInnovision-permissions-decisions-reviewed.xlsx): Plant
   Maintenance (all 3 perms), Check-in, Data Breaks view, AI widget generator,
   HMI (PLC stays), Video Tutorials, both legacy visualisation views. The two
   gap-fix perms these had seeded (readplant.maintenance, readplant.checkin)
   are removed from the model; tech.ai is retired with its feature.
3b. **Permission-catalog rulings 2026-07-22** (all 121 rows decided — see the
   reviewed workbook): Bi-Direction_Usage_W RE-MAPPED to readplant.layout (it
   gates viewing the NEW visualization, not actuation — real bi-directional
   control must ship as a new remote.actuate perm; RemoteControl_Usage stays
   the only actuation grant). Net-new lines: `approve.datacorrect` (mod:data),
   `tech.stores` (mod:inv), `flags.sensorhealth` (mod:iot, exception flag).
   Recorded audience deviations: sensor LIST config = Global-only safety
   exception (sensor DETAILS config stays Technical); System-scope
   templates/triggers/workflows = Technical Admin+ (deviation from
   templates=Global); task/insight create-assign = L3+ plus Full Site/Global
   only; Skills & Permissions-list = People AND Technical families;
   manual-ticket creation = L3+ (tickets are assigned). **Deprecation
   mechanism: platform-level legacy flags** — one global boolean per sunset
   group (L-DASH, L-GROUPS, L-WS, L-ROLES, L-TICKETS, L-TASKCFG, L-OLDDATA,
   L-OLDCFG, L-OLDLAYOUT), Global-Admin-only, one audited flip, default-ON
   wherever the feature is used today; NOT the per-plant module ceiling
   (deprecated perms share live homes/modules with kept ones). PlantLayout
   old view = Keep+Deprecate under L-OLDLAYOUT (dies when the new
   visualization covers it); back-dated entry = one-time MERGE, not a flag.
4. **Approval permissions are net-new to the backend** — nothing in the legacy
   121 expresses approve/force-close/reopen. New sub-feature needed (e.g. APPR).
5. **Smart preview is rule-driven, not per-role mockups** — every tab/button/banner
   derives from permission state (see `computeTabs`, `landingTab`, `bodyFor`).
   Landing priority: approvals → issues → portfolio → dashboard → admin.
   These rules ARE the frontend visibility spec.
6. **Migration**: default down, promote up. 517 users migrate fully
   automatically, 236 get safe defaults + one follow-up question, **zero
   holds** (owner rulings 2026-07-22: the orphaned roleId
   67000a18659b9e13b8f9afbc is treated as never granted, and the 27 ex-HOLD
   users — profile ORPHAN + Operator Administrative + Unified Dashboard
   Controls — migrate as **L1 Operator with no admin grants**; no backup
   recovery needed). Archived roles (`isArchived:true`, 10 of 56 — all
   test/demo, zero holders) are excluded from migration by rule. **7 Full Site
   Admin grants applied 2026-07-22** (owner instruction, from the
   permission-parity analysis): 3 roster managers held Technical (+People
   composes to Full Site), 4 unified-dashboard owners held People
   (+Technical composes) — list in internal/admin-grants-applied.xlsx; full
   per-user old→new mapping in internal/migration-final-mapping.xlsx.
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
  Plants, Role library, Product modules · Verify: Access review, UI previews ·
  personas at the bottom of the rail; People is the landing screen) · Plants
  tab (registry grouped by company, KPIs, plant-record modal with an
  "Edit on Product modules" jump-link and an inline add/remove-roster editor,
  add-plant for Global = 3-step onboarding wizard `startAddPlant`/`renderNP`/
  `npFinish`: details → product modules → people, commit-on-finish only,
  one audited action; onboarding is the one sanctioned licensing moment
  outside the matrix) · Product modules (the one write surface for module
  licensing after onboarding, per ADR-003) · User Center (people directory with a needs-attention queue that
  counts down to ✓ → role + plant-access editor (one account-wide role,
  per-plant customize rows) with progressive
  disclosure, a profile progress meter and a save button that counts
  remaining reasons → peak-end save confirmation with the payload behind a
  "For engineers" disclosure) · Access Review · smart UI preview engine ("App
  preview" tab). Single self-contained file, vanilla JS, no build step.
  **Demo data swapped to real clients 2026-08-14 (owner request, for client
  demos):** 6 plants across 4 cluster labels — Essentia STP (Adern),
  Vedanta- 200 KLD (WTP) + Vedanta- 50KLD (Gas Holder) (Vedanta), EMS (EMS),
  Amazon DEL-4 + DEL-5 (Amazon) — and 5 real users (Satyadev Singh l3 w/
  remote exception @ Essentia, Garvit Kumar l3+tech, Mohit Joshi l1,
  Piyush Negi senior, Mandeep Dagar l1). Personas: cluster = Vedanta,
  site = Essentia STP. Same copy pass shortened every helper text, trimmed
  preview presets to 7, dropped the capped KPI/filter, and removed internal
  jargon (ruling dates, DP/Wapp) from UI strings. Names are real people/
  clients and the repo is public — owner accepted this for demo purposes.
  Brand Book v7 tokens (owner ruling 2026-07-14): navy #002454, teal
  #95CFD3/#5AABB0 (dark-teal #1F6B71 for AA text), warn/err from the
  severity ladder (#FFF8E1/#B45309, #B80000), Figtree + IBM Plex Mono.
  No purple, no sage, no rust in product surfaces.
- `coverage-map.csv` — all 121 legacy permission tags → v2 home + status.
- `reference/module-feature-permission-map.xlsx` — the dev lookup workbook
  (added 2026-08-13): module → feature → v2 permission tags (with legacy
  sources), role × permission and grant × permission matrices, and the
  legacy-tag audit that flags every DB tag not carried into v2. Generated
  from `SETS`/`ROLES`/`GRANTS` + coverage-map.csv + data/Permissions.json;
  regenerate rather than hand-edit if the model changes.
- `tests/` — five dependency-free node suites (verify, verify-add, verify-inv,
  verify-floc, verify-usercenter) asserting the model rules against both
  prototypes: `node tests/verify-usercenter.js` (env `ROLES_ROOT` overrides
  the repo root). Moved INTO the repo 2026-08-13 after the scratchpad copies
  were lost to temp cleanup — keep them here.
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
  one-pagers, migration script spec, SETS↔CAPS reconciliation, request
  roles-permissions.md + GAP-ANALYSIS.md from Alex. (The Exception-Packs /
  stamp-cloning / shielded-templates items are DEAD — they were custom-role
  machinery, removed by the 2026-08-13 ruling; per-plant splits are moot
  under the 2026-07-30 single-role ruling.)
- Generate backend spec: Mongo schema for roles/bundles/assignments/overrides,
  new APPR permissions, route→permission map completion (165 routes unmapped
  in the legacy Routes Permission sheet; 17 mapped tags are invalid).
- Fold ops-lead answers (L1 vs L3 per Operator Asset user) into the migration
  worksheet when they arrive.
