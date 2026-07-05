# CloseTheLoop · Role Studio (prototype)

Interactive prototype for the v2 roles & permissions model:

- **Product modules per plant** — we sell product modules to companies; each module unlocks a
  set of permissions (still mapped to role types like "work execution") and is licensed per
  plant. An editable plant × module entitlement matrix is the ceiling everything else works
  inside: effective access at a plant = user permission ∧ plant module.
- **Configure a user** — pick a base role, optionally an admin grant, then toggle capability
  bundles (the old roles, clubbed) per user. Guardrails: dependency enforcement, a mandatory
  reason for any deviation, a visible drift count, and module locks (🔒) on abilities the
  selected plants aren't licensed for. "Save" shows the exact JSON that would be stored on
  the user record.
- **UI previews per role** — wireframe screens showing what each role type sees and why:
  L1 / L3 / L4, People / Technical / Full Site / Global Admin, Regular / Senior Non-op — with
  a plant-context selector that applies that plant's module ceiling to the rendered UI.

Single self-contained `index.html` — no build step, no dependencies (Google Fonts only).

## Deploy to GitHub Pages

From a terminal, inside this folder:

```bash
git init
git add .
git commit -m "Role Studio prototype"
git branch -M main
git remote add origin https://github.com/mihirsethiDP/Roles.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: main, folder: / (root) → Save.**

The site goes live in ~1 minute at:

**https://mihirsethidp.github.io/Roles/**

## Data model demonstrated

```
plant     = licensed product modules       (the ceiling — what exists at this plant)
role      = default bundle set             (L3 = exec + approve)
user      = role + grant + overrides       (add/remove bundles, each with a reason)
flags     = per-user exceptions            (back-dated entry, remote control, view-as)
drift     = |overrides| + |flags|          (visible to People Admins)
effective = user permission ∧ plant module (checked per plant at runtime)
```

Modules: Platform Core (always included) · Issue Resolution · Tasks, Shifts & Maintenance ·
Data, Lab & Logbook · Dashboards & Analytics · IoT & Remote Control. A capped permission stays
on the user's profile and activates automatically if the plant's plan is upgraded.
