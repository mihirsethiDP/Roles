# CloseTheLoop · Role Studio (prototype)

Interactive prototype for the v2 roles & permissions model:

- **Configure a user** — pick a base role, optionally an admin grant, then toggle capability
  bundles (the old roles, clubbed) per user. Guardrails: dependency enforcement, a mandatory
  reason for any deviation, and a visible drift count. "Save" shows the exact JSON that would
  be stored on the user record.
- **UI previews per role** — wireframe screens showing what each role type sees and why:
  L1 / L3 / L4, People / Technical / Full Site / Global Admin, Regular / Senior Non-op, QR public.

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
role  = default bundle set          (L3 = exec + approve)
user  = role + grant + overrides    (add/remove bundles, each with a reason)
flags = per-user exceptions         (back-dated entry, remote control, view-as)
drift = |overrides| + |flags|       (visible to People Admins)
```
