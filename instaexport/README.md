# InstaExport — Instagram Comment Export SaaS

Full-stack SaaS: Instagram OAuth → Comment export (CSV/PDF) → Stripe payments.

## Stack
- **Frontend:** Next.js 14 (App Router) → Vercel
- **Backend:** Node.js + Express → Railway
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe
- **Queue:** pg-boss (Postgres-backed job queue, no Redis needed)

## Monetization
- **Free tier:** Export up to 500 comments per post
- **Pro tier ($9/mo or $2 per post):** Unlimited comments, PDF archive, bulk export

---

## Quick Start

### 1. Clone & install
```bash
git clone <your-repo>
cd instaexport

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Supabase setup
1. Create a project at https://supabase.com
2. Run `/backend/src/db/schema.sql` in the SQL editor
3. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 3. Meta App setup
1. Go to https://developers.facebook.com
2. Create an app → Add "Instagram Basic Display" product
3. Add OAuth redirect: `https://yourdomain.com/auth/callback`
4. Copy `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET`

### 4. Stripe setup
1. Create account at https://stripe.com
2. Create a product: "InstaExport Pro" — $9/month recurring
3. Copy `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
4. Create a one-time product: "Single Post Export" — $2

### 5. Environment variables

**Backend** (`/backend/.env`):
```env
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
INSTAGRAM_CLIENT_ID=your_meta_app_id
INSTAGRAM_CLIENT_SECRET=your_meta_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/callback
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
JWT_SECRET=your_random_32char_secret
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 6. Run locally
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## Deploy

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set root directory to `/backend`
3. Add all env vars
4. Deploy — Railway auto-detects Node.js

### Frontend → Vercel
1. Import GitHub repo to Vercel
2. Set root directory to `/frontend`
3. Add all env vars
4. Deploy

---

## Free Tier Limits (zero cost for ~10k users)
| Service | Free Limit | Our Usage |
|---------|-----------|-----------|
| Supabase | 500MB DB, 50k MAU | ~10k users |
| Vercel | 100GB bandwidth | Plenty |
| Railway | $5 credit/mo | Light usage |
| Stripe | No monthly fee | % per transaction |

---

## Monetization Flow
1. User connects Instagram → lands on dashboard
2. Clicks a post → sees first 500 comments free
3. At 500 limit → paywall modal appears
4. Options: **$9/mo Pro** (unlimited) or **$2 one-time** (this post only)
5. Stripe Checkout → webhook → unlock stored in DB
6. Export continues automatically
