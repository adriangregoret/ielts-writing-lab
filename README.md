# IELTS Writing Lab — with AI correction

Static dashboard (`index.html`) + one Vercel serverless function (`api/evaluate.js`)
that sends your writing to **Claude Sonnet 5** and returns a real examiner-style
evaluation: the 4 band scores, a list of mistakes with corrections, a Band 8+
rewrite, and 3 things to practise next — all saved automatically to your log.

The Anthropic API key lives **only on the server** (a Vercel environment variable).
It is never exposed to the browser.

---

## What you need

1. An **Anthropic API key** (separate from your Claude Code subscription).
2. A **Vercel account** (free Hobby plan is enough).
3. A **GitHub account** (easiest way to deploy) — optional if you use the Vercel CLI.

---

## Step 1 — Get your Anthropic API key

1. Go to <https://console.anthropic.com> and sign in / create an account.
2. Open **Billing** and add a small credit (US$5 lasts a long time — each
   correction costs roughly **1–2 US cents** on Sonnet 5).
3. Open **API Keys → Create Key**, name it (e.g. `ielts`), and copy the value.
   It starts with `sk-ant-...`. Keep it safe — you only see it once.

## Step 2 — Deploy to Vercel

### Option A — via GitHub (recommended)

1. Create a new GitHub repo and push this `ielts-web` folder to it.
2. In Vercel, click **Add New → Project** and import that repo.
3. **Framework Preset:** choose **Other** (it's a static site + `/api` function).
   Leave Build Command and Output Directory empty.
4. Before deploying, open **Environment Variables** and add:
   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key |
   | `APP_PASSWORD` | any password you choose (protects the AI button) |
5. Click **Deploy**. When it finishes you get a URL like
   `https://your-project.vercel.app`.

### Option B — via the Vercel CLI

```bash
npm i -g vercel
cd ielts-web
vercel               # follow the prompts, choose "Other"
vercel env add ANTHROPIC_API_KEY   # paste your key
vercel env add APP_PASSWORD        # choose a password
vercel --prod        # deploy to production
```

## Step 3 — Use it

1. Open your Vercel URL.
2. Go to **Task 1** or **Task 2**, write your answer, and press
   **🤖 Correct with AI (real Band 8)**.
3. The first time, it asks for the password you set in `APP_PASSWORD`.
4. You get the 4 band scores, your mistakes with corrections, a Band 8+ rewrite,
   and practice tips. Everything is saved in **Mistakes & Tips**.

The offline auto-checker and games keep working with no key needed — only the
🤖 button uses the API.

---

## Notes

- **Cost control:** each AI correction is ~1–2¢. Set a monthly spend limit in the
  Anthropic Console (Billing → Limits) if you want a hard cap.
- **Password:** `APP_PASSWORD` stops strangers from spending your credit if they
  find the URL. If you leave it unset, anyone with the URL can use the AI button.
- **Model:** change `claude-sonnet-5` in `api/evaluate.js` to `claude-opus-4-8`
  for maximum quality (about 3× the cost) or `claude-haiku-4-5` for the cheapest.
- **Local testing:** `vercel dev` runs the whole thing locally (needs the env
  vars set); opening `index.html` directly will show the dashboard but the AI
  button won't work without the serverless function running.
