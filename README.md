# Panel — your day, in order

**🌐 Language:** [Español](README.es.md) · English

A **local-first** personal dashboard to keep your **finances, training, calendar and goals** in one place. It works instantly in the browser (data lives in `localStorage`) and **syncs** to your account through Supabase, so it's identical on your phone and your desktop.

> 🔗 **Live demo:** https://personal-dashboard-nine-rouge.vercel.app/

Built with **React 19 + Vite + Supabase**. No backend of your own to maintain: the database, authentication and serverless functions are Supabase's.

---

## ✨ Features

- **Overview** — daily greeting, today's agenda, habits, finance & training KPIs, and your goals at a glance.
- **Calendar** — events by type (training, work, personal) with month and agenda views.
- **Training** — session logging (strength with sets/reps/weight, cardio with distance/duration/rounds), reusable routines, metrics & adherence, history, and bodyweight tracking with progress photos.
- **Finances** — net worth by account (cash / assets), movements (income, expenses, transfers, pending and reimbursements), monthly summary with cash flow and categories, per-business panel, and recurring income (estimated MRR).
- **Goals** — finance, fitness and habit goals with progress.
- **Theme** — light/dark, accents, typography and density.
- **PWA** — installable on mobile.

Two integrations are **optional and off by default** (see below): **Stripe** (live business metrics) and an **on-chain wallet** (Morpho positions + BTC/ETH prices).

---

## 🧱 Architecture

- **Local-first with sync.** The whole app state is a single object stored in `localStorage` and synced to Supabase (table `app_state`, one JSON row per user). The UI is instant and the cloud only backs up and replicates across devices. Conflict strategy: *last-write-wins* by `updated_at`.
- **Multi-tenant with Row Level Security.** Each user can only read and write their own row thanks to Postgres RLS policies (`auth.uid() = user_id`). The publishable key is safe in the browser precisely because of this.
- **Integrations via serverless functions.** Sensitive keys (e.g. the Stripe secret) never touch the frontend: they live as Supabase secrets and are used inside Edge Functions. The client only invokes the function with its session.

---

## 🚀 Quick start (development)

Requirements: Node 18+ and a [Supabase](https://supabase.com) account (free tier).

```bash
git clone https://github.com/davidsanzdeandino/personal_dashboard.git
cd personal_dashboard
npm install
cp .env.example .env     # fill in your Supabase values
npm run dev
```

Open the `localhost` URL Vite prints. To create your database and be able to sign in, follow the next section.

---

## 🛠️ Deploy your own

### 1) Create a Supabase project
Create a new project at [supabase.com](https://supabase.com).

> 💡 If you're going to publish a **demo**, create a **separate** project from the one with your real data. That way your personal information is never exposed.

### 2) Create the table and policies
In the **SQL Editor**, paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the `app_state` table and enables RLS.

### 3) Enable authentication
In **Authentication → Providers**:
- Enable **Email** (email + password).
- If you want to offer the **demo mode** (one-click access, no sign-up), also enable **Anonymous sign-ins**.

> Accounts are created from the Supabase dashboard (**Authentication → Users → Add user**). Open public sign-up is intentionally not included; if you want it, add a form that calls `supabase.auth.signUp(...)`.

### 4) Set the environment variables
From **Settings → API Keys** (or the project's **Connect** dialog), copy the URL and publishable key into your `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 5) Deploy to Vercel
Import the repo on [Vercel](https://vercel.com), add those two environment variables to the project, and deploy. The included `vercel.json` already rewrites routes for the SPA. (Any static host works: Netlify, Cloudflare Pages, etc.)

---

## 🎭 Demo mode

So anyone (a recruiter, for example) can try the app without configuring anything:

- The login has a **"View demo"** button that uses Supabase *Anonymous Sign-In*: each visitor gets their **own throwaway session** with realistic sample data.
- Demo data is **clearly labeled** (top banner) and **deletable**; it doesn't affect anyone.
- Self-host starts **empty**. To load examples manually: **Settings → Load demo data**. To wipe everything: **Settings → Clear all data**.

---

## 🔌 Optional integrations

They're **optional** and the app works perfectly without them. They require deploying Edge Functions with the [Supabase CLI](https://supabase.com/docs/guides/cli).

> ℹ️ Designed for **single-owner self-host**: the keys/addresses are yours. Don't expose them as-is on a multi-user instance without adding per-account authorization.

### Stripe (live business metrics)
Shows MRR, active subscriptions, balance and recent payouts.

```bash
supabase functions deploy stripe-stats
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

Then, in the app: **Finances → Businesses → edit business → enable "Connect with Stripe"**.

### On-chain wallet (Morpho + prices)
Shows your Morpho position (Ethereum and Base), APY, estimated yield and BTC/ETH prices. **Read-only**: private keys are never requested.

```bash
supabase functions deploy wallet-stats
```

Then, in the app: **Finances → Investments → paste your public `0x…` address**.

> Morpho's API schema evolves; if you don't see positions, check the query in [`supabase/functions/wallet-stats/index.ts`](supabase/functions/wallet-stats/index.ts) against the [Morpho docs](https://docs.morpho.org). Prices will keep working even if that fails.

### Progress photos (optional)
The **Training → Body** tab uploads photos to a Storage bucket named `progress` (private, one folder per user). Create it from **Storage** in the dashboard, or uncomment the matching block in `schema.sql`.

---

## 📁 Structure

```
personal_dashboard/
├─ public/                 # icon / PWA
├─ src/
│  ├─ components/          # reusable UI (Login, Settings, icons, primitives)
│  ├─ lib/                 # store, sync, theme, finance, format, integrations, demo data
│  ├─ sections/            # main views
│  │  ├─ training/         # Training sub-tabs
│  │  └─ finance/          # Finance sub-tabs
│  ├─ App.jsx              # layout, navigation and session
│  ├─ main.jsx
│  └─ styles.css
├─ supabase/
│  ├─ schema.sql           # app_state table + RLS
│  └─ functions/           # optional Edge Functions (stripe-stats, wallet-stats)
├─ .env.example
├─ index.html
├─ package.json
└─ vite.config.js
```

---

## 🧭 Scripts

```bash
npm run dev       # development
npm run build     # production build (dist/)
npm run preview   # serve the build locally
```

---

## 📄 License

[MIT](LICENSE) © David Sanz de Andino