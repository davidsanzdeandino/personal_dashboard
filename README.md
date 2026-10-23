# Panel: personal dashboard

A local-first personal dashboard that keeps finances, training, calendar and goals in one place. It runs in the browser, keeps its state in `localStorage` and syncs it to Supabase, so the same data shows up on phone and desktop.

**Live demo:** https://personal-dashboard-nine-rouge.vercel.app (click **"Ver demo"**; no sign-up, sample data only)

**The user interface is in Spanish.** Code comments are mostly in Spanish too; this README uses the Spanish labels where it refers to the interface.

Three runtime dependencies (`react`, `react-dom`, `@supabase/supabase-js`), and the only table is protected by row-level security.

## The problem

Personal data usually ends up split across a banking app, a spreadsheet, a training log and a calendar. Panel puts the day in one screen: today's agenda and habits, money (accounts, movements, net worth), training sessions and goals. Requirements:

- instant UI, also on a flaky connection;
- the same data on every device;
- no backend server of my own to run;
- secret keys (such as a Stripe key) never in the browser.

## What it does

- **Overview** (*Resumen*): greeting, today's agenda, habits, finance and training figures, and goal progress.
- **Calendar** (*Calendario*): events by type (training, work, personal) in month and agenda views.
- **Training** (*Entrenamiento*): session logging (strength with sets, reps and weight; cardio with distance, duration or rounds), reusable routines, metrics and adherence, history, bodyweight and optional progress photos.
- **Finances** (*Finanzas*): accounts (cash and assets), movements (income, expenses, transfers, pending items and reimbursements), monthly summary with cash flow and categories, a per-business panel and estimated recurring income.
- **Goals** (*Objetivos*): finance, fitness and habit goals with progress.
- **Appearance**: light and dark themes, accent colours, fonts, density.
- **Demo mode**: one-click anonymous session with generated sample data.

Two integrations are optional and off by default: **Stripe** (subscriptions, balance and payouts of your own account) and a **read-only on-chain wallet** view (Morpho vault positions plus BTC and ETH prices).

## How it works

```
Browser (React 19 + Vite)
  store.js   one state object in localStorage (key pd_state_v8)
  sync.js    debounced upsert 1.5 s after a change; pull on load, focus and reconnect
     |
     | supabase-js, publishable key + user session
     v
Supabase
  Auth            email + password; optional anonymous sign-in for the demo
  Postgres        public.app_state: one jsonb row per user, protected by RLS
  Storage         optional private bucket "progress" (one folder per user)
  Edge Functions  optional: stripe-stats, wallet-stats (secrets stay server-side)
```

- **Local-first state.** Every view reads and writes one object through a small store built on `useSyncExternalStore`. Writes hit `localStorage` first, so the UI never waits for the network.
- **Sync.** After a change, the whole state (without photos) is upserted to `app_state` after a 1.5 s debounce. On start, on window focus and when the connection comes back, the app pulls the remote row. It compares `updated_at` with its own sync metadata: remote wins if it is newer and there are no unsynced local edits; unsynced local edits win otherwise (last write wins, whole document).
- **Row Level Security.** `supabase/schema.sql` creates `app_state` and four policies (select, insert, update, delete) that all require `auth.uid() = user_id`. That is why the publishable key can live in the browser.
- **Derived balances.** Account balances are not stored: each one is computed as the opening balance plus the realised movements that touch it. Pending income and expenses do not count towards net worth until they are realised.
- **Server-side secrets.** The Stripe secret key is a Supabase secret read inside the `stripe-stats` Edge Function. The browser only calls the function with its session token.

## Run it locally

Requirements: Node.js 20.19+ or 22.12+ (required by Vite 8) and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/davidsanzdeandino/personal_dashboard.git
cd personal_dashboard
npm ci
cp .env.example .env    # then fill in the two values below
npm run dev
```

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both values are in the Supabase dashboard (**Connect**, or **Settings > API Keys**). Then set up the project:

1. **Database.** In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates `app_state` and its RLS policies, and can be run again safely.
2. **Auth.** Under **Authentication > Providers**, enable **Email**. Enable **Anonymous sign-ins** only if you want the demo button to work (see Limitations first).
3. **Users.** There is no public sign-up form. Create accounts in **Authentication > Users > Add user**, or add a form that calls `supabase.auth.signUp()`.
4. **Progress photos (optional).** Create a private Storage bucket named `progress`, or uncomment the block at the end of `schema.sql`.

```bash
npm run dev       # development server
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

### Deploy

Import the repository on [Vercel](https://vercel.com), add the two `VITE_` variables and deploy. `vercel.json` rewrites every route to `index.html` for the single-page app. Any static host works.

If you publish a demo, use a **separate Supabase project** from the one that holds your real data. The live demo above runs on its own project.

### Demo mode

The login screen has a **"Ver demo"** button. It calls `supabase.auth.signInAnonymously()`; if the new session's state is empty, the app loads generated sample data and shows a banner saying so. A self-hosted instance starts empty. **Ajustes > Cargar datos de demo** loads the sample data by hand and **Ajustes > Vaciar todos los datos** clears everything.

The sample data in [`src/lib/demoData.js`](src/lib/demoData.js) is invented. It uses a seeded random generator (mulberry32) and dates relative to today: four months of movements, about five weeks of workouts, about 60 days of bodyweight and about 24 days of habit check-ins. It describes no real person or business.

### Optional integrations

Both need the [Supabase CLI](https://supabase.com/docs/guides/cli) and are designed for a **single owner** (your own Stripe account, your own public address).

**Stripe** (subscriptions, estimated MRR, balance, last five payouts):

```bash
supabase functions deploy stripe-stats
supabase secrets set STRIPE_SECRET_KEY=rk_live_...   # a restricted, read-only key is enough
```

Then in the app: **Finanzas > Negocios**, open **Editar negocio** and tick **Conectar con Stripe**.

**Wallet** (Morpho vault positions on Ethereum and Base, net APY, BTC and ETH prices). Read-only: it takes a public `0x...` address and never asks for keys.

```bash
supabase functions deploy wallet-stats
```

Then in the app: **Finanzas > Inversiones**, paste a public address. If the Morpho API changes its schema, the positions come back empty and prices keep working; check the query in [`supabase/functions/wallet-stats/index.ts`](supabase/functions/wallet-stats/index.ts) against the [Morpho docs](https://docs.morpho.org).

## Project structure

```
personal_dashboard/
  public/                      icons for the web app manifest
  src/
    App.jsx                    layout, navigation, session, demo seeding
    main.jsx
    styles.css
    components/                Login, SettingsModal, icons, UI primitives
    lib/
      store.js                 state, localStorage persistence, React hook
      sync.js                  Supabase sync and sync status
      supabase.js              Supabase connection
      finance.js, format.js    balances, dates and money formatting
      theme.js                 appearance settings
      stripeStats.js, walletStats.js   calls to the Edge Functions
      demoData.js              generated sample data
    sections/
      home.jsx, calendar.jsx, goals.jsx, finance.jsx, training.jsx
      finance/                 Resumen, Movimientos, Patrimonio, Negocios, Inversiones, RecurringIncome
      training/                Session, Routines, Metrics, History, Body
  supabase/
    schema.sql                 app_state table and RLS policies
    functions/
      stripe-stats/index.ts
      wallet-stats/index.ts
  .env.example
  index.html
  manifest.webmanifest
  package.json
  vercel.json
  vite.config.js
```

## Data sources and attribution

The app stores only what its user types in. External data appears only if the optional integrations are enabled:

| Source | Used for | Terms |
|---|---|---|
| Stripe API | the owner's own subscriptions, balance and payouts | the owner's [Stripe agreement](https://stripe.com/legal); nothing is redistributed |
| [CoinGecko API](https://www.coingecko.com/en/api) | BTC and ETH prices in USD and EUR | [API Terms](https://www.coingecko.com/en/api_terms); attribution required |
| [Morpho API](https://docs.morpho.org) (public GraphQL) | vault positions for a public address | public endpoint; positions are read on request and not stored |
| [Google Fonts](https://fonts.google.com): IBM Plex Sans, IBM Plex Mono, Space Grotesk | typography | SIL Open Font License 1.1; loaded from Google's CDN, not bundled |

Price data provided by [CoinGecko](https://www.coingecko.com). The Edge Functions fetch prices and positions on each request. Nothing from these APIs is committed to this repository or cached server-side. Stripe, CoinGecko and Morpho are not affiliated with this project and do not endorse it.

## Limitations

- **Whole-document last write wins.** Sync replaces the full state; it does not merge fields. If two devices edit while one of them is offline, the device that syncs its unsynced edits last overwrites the other's changes.
- **One JSON row per user.** Fine for one person's data; a larger dataset would need proper tables, partial updates and indexes.
- **Photos are not in the synced state.** Progress photos live only in the optional Storage bucket and need it to exist.
- **No offline start.** There is a web app manifest for adding it to the home screen, but no service worker: edits made offline are kept in `localStorage`, yet opening the app without a connection fails.
- **Single-owner integrations.** Both Edge Functions only check that the caller has a valid Supabase session, and an anonymous demo session counts as one. Deploy them only to a single-user project, never to the project behind a public demo. Both answer CORS requests from any origin.
- **Anonymous users pile up.** Supabase does not delete anonymous users automatically and recommends CAPTCHA (or Cloudflare Turnstile) for anonymous sign-ins; neither is implemented here.
- **Hard-coded fallbacks.** If CoinGecko fails, `wallet-stats` converts USD to EUR at a fixed 0.92.
- **Spanish UI only.** There is no i18n layer.
- **No tests or CI.** Nothing checks the sync or balance logic automatically; tests for `sync.js` and `finance.js` would come first.

## License

Code under the [MIT License](LICENSE), copyright (c) 2026 David Sanz de Andino Díez. The license covers this repository's code only; third-party data and fonts keep their own terms (see above).
