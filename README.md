# Posture Tracker

Personal posture correction tracker — elevated chest (upper crossed syndrome) + anterior pelvic tilt.

Built on evidence-based exercises from PubMed systematic reviews. Syncs to Supabase so data persists across devices.

## Setup

### 1. Supabase (free, no card required)

Go to [supabase.com](https://supabase.com) → create a new project → open the **SQL Editor** and run:

```sql
CREATE TABLE posture_data (
  user_id    TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE posture_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON posture_data
  FOR ALL USING (true) WITH CHECK (true);
```

Then go to **Project Settings → API** and copy:
- **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
- **anon / public key** — the long JWT string

### 2. GitHub Secrets

In this repo → **Settings → Secrets and variables → Actions → New repository secret** — add these three:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_KEY` | Your anon/public key |
| `POSTURE_USER_ID` | Any identifier, e.g. `velli` — use the same on all devices |

### 3. GitHub Pages

Repo → **Settings → Pages → Source → GitHub Actions**

Push to `main`. The workflow injects your secrets into the HTML and deploys automatically. Your app will be live at:

```
https://<your-username>.github.io/<repo-name>/
```

Bookmark that URL on your phone and desktop — same URL, same data everywhere.

## How it works

- Credentials are **never stored in the repo** — only in GitHub's encrypted secrets store
- The GitHub Actions workflow replaces the `__SUPABASE_URL__`, `__SUPABASE_KEY__`, and `__USER_ID__` placeholders at deploy time
- Data is stored as a single JSON blob in Postgres (Supabase), keyed by your user ID
- The app also caches to `localStorage` for offline use and pushes to cloud on reconnect
- Auto-resets each Monday and archives the previous week's completion to your history

## Weekly schedule

| Day | Session |
|---|---|
| Monday | **A** — Upper / chest & posture |
| Tuesday | Rest + daily habits |
| Wednesday | **B** — Lower / pelvic tilt |
| Thursday | Rest + daily habits |
| Friday | **C** — Integration & mobility |
| Saturday | **A** — Upper / chest & posture |
| Sunday | Full rest |
