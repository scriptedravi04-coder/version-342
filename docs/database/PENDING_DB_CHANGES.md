# Pending database (Supabase) changes

**End of session 41: everything below that has SQL is APPLIED** (13 files, run by Ravi's Supabase-connected Claude, no errors). Nothing is pending right now. New needs → add an entry here.

**Ravi, session 41:** right now we only fix the app's bugs and errors. **No new Supabase table, column,
bucket or SQL file** until one dedicated "database session". Every planned change is written here
(what, why, when, which code needs it). In that session we read this list together and do it all in
one day.

Rule for every session and every AI tool: need a new table / column / SQL? **Do not create it.** Add an
entry below, build nothing that depends on it, and tell Ravi.

---

## 1. What's new popup — `whats_new`, `whats_new_seen`
- **Status: BUILT in v261 — Ravi approved ("now start working").** Run `scripts/sql/session41.sql`.
- **Why:** admin writes an update ("Express is now free"), every creator / brand sees it once.
- **Tables:** `whats_new` (id, title, points jsonb, audience all/creator/brand, cta_label, cta_url,
  published, published_at, created_at) · `whats_new_seen` (user_id, item_id, seen_at; key user_id+item_id).
- **Code waiting for it:** `backend/whats_new_routes.ts`, `src/components/whatsNew/WhatsNewPopup.jsx`,
  `src/components/admin/WhatsNewManager.jsx`.
- **Before the SQL is run:** the popup never shows; Admin → What's new says "Could not save".

## 2. Push notifications (app closed) — `push_subscriptions` (+ promo pushes)
- **Status: BUILT in v261 — Ravi approved building it now (exception to the "no new tables" rule).**
  Run `scripts/sql/session41.sql` (push_subscriptions, push_campaigns, push_log) and add the VAPID keys.
  Ravi's decisions (session 41, final — do not ask again):
  - **Deal pushes:** new message, invite, application, counter offer, contract to sign, UGC submitted /
    revision, payment released, KYC approved / rejected.
  - **Promo pushes in Phase 1 too** — Zomato / Swiggy style: short, funny, a bit emotional. (Promo
    *emails* stay Phase 2.) **Admin writes every promo push** in the admin panel — any language
    (English, Hinglish, emojis); the app's "English only" rule does not apply to these. We build the
    system, not the messages.
  - **Admin push screen (to build):** title + message + optional page to open on tap; audience (all /
    creators / brands, later niche / city); send now or schedule; preview of how it looks on a phone;
    history with how many it was sent to. Deal pushes are automatic (no admin step).
  - **No on/off setting in the app.** (People can still switch notifications off from phone settings.)
  - **Ask permission at the start**, with our own screen first (like the Sticker.ly screen Ravi sent):
    a sticker, an emotional + funny line, one big "Allow" button → only then the phone's real popup.
    Our own original sticker — not Sticker.ly's cat photo.
  - **Screen text chosen by Ravi:**
    - Creator: **"Brands are waiting. So is your money. 💸"** — *Turn on notifications so no deal, no
      payment, no "we loved your reel" ever slips past you.*
    - Brand: **"Your next viral creator just applied… 👀"** — *Allow notifications so great creators
      don't slip away while you're in a meeting.*
    - Button "Yes, keep me posted"; small "Not now" under it (iPhone never asks twice after "Don't Allow").
- **Tables:** `push_subscriptions` (id, user_id, endpoint unique, p256dh, auth, user_agent, created_at,
  last_used_at) · `push_campaigns` for promo pushes (id, title, body, audience all/creator/brand,
  url, send_at, sent_at, sent_count, created_by) · optional `push_log` (who got what, for limits).
- **Also needs:** VAPID keys in env, `web-push` package, push handler + tap-to-open in the service
  worker, the "Allow" screen, admin screen to write / schedule promo pushes, a daily limit per user
  (e.g. max 2 promo pushes a day) so people don't switch everything off.
- **Limits:** Android Chrome — works; iPhone — only when added to Home Screen, iOS 16.4+, and the
  phone's popup can only open after a tap (that is why our screen has an "Allow" button). If someone
  says "Don't allow" once, the phone never asks again — our screen comes first so fewer people say no.

## 3. Older SQL files (session 22–40) — APPLIED at the end of session 41
- All schema files in `scripts/sql/` are applied. Not run on purpose: `purge_aadhaar.sql` (no Aadhaar
  columns exist in creator_kyc; one read-only check on `verifications` left) and
  `find_wrongly_completed_briefs.sql` (report only — 15 rows, Ravi decides; advice: don't reopen).

## Session 43 (v274) — brand coupon codes at payment (NOT built: rule 91, no new table / column)
Ravi asked whether brands can apply a coupon on the "Review & pay" step. Creator codes exist
(`creator_coupons`); brand codes do not. Needs: a brand coupon store (code, type, discount, valid_until,
max uses), a server check on the escrow order route (locked flow — Ravi's written OK needed) so the
Razorpay amount is computed server-side, and a line in the Review & pay sheet. Decide with Ravi first.

## Session 43 (v278) — self-serve account deletion
Added by the Delete account flow (Settings → Account → Delete account, and /delete-account).
The flow works today with the existing `is_deleted` soft-delete (account hidden + login blocked, like
the admin bin; records kept). To enable the **30-day auto-purge + a precise "days left" countdown +
self-serve recovery**, add:

- `users.deletion_requested_at timestamptz null`  — when the user asked to delete (self-serve).
- `users.deletion_reason text null`               — e.g. "self_serve".

`backend/account_routes.ts` already best-effort writes both on confirm (wrapped in try/catch, so it is
harmless until the columns exist). After adding the columns:
1. A scheduled job (daily) should run the existing complete-wipe on accounts where
   `deletion_requested_at < now() - 30 days` and `is_deleted = true`.
2. Login can offer "Reactivate" within the 30 days (set is_deleted=false, clear deletion_requested_at)
   instead of the generic "profile no longer available" message.
No other table changes are needed — `transactions` (payment/invoice records) are intentionally kept.

## Promo popups — `promo_popups` (session 43, v289)
- **Status: BUILT in v289 — Ravi approved ("DB ka prompt likh ke de dena, main kar dunga").**
  Run `scripts/sql/session43_all.sql` — or give `docs/database/SUPABASE_PROMPT_SESSION43.md` to the Supabase-connected Claude.
- **Why:** a full-screen / card / bottom-sheet poster when the app opens (Hopr / Swiggy style), e.g.
  "Invite friends, earn ₹21". Admin uploads the designer's poster, picks layout, link, audience, dates.
- **Code waiting for it:** `backend/promo_routes.ts`, `src/components/promo/PromoPopup.jsx`,
  `src/components/admin/AdminPromoPopups.jsx`.
- **Before the SQL is run:** no popup is shown; Admin → Promo popups says the table is missing.

## Invite rewards — `referral_config` new columns, `referral_withdrawals.upi_id` (session 43, v290)
- **Status: BUILT in v290 — Ravi approved.** Same file: `scripts/sql/session43_all.sql` /
  `docs/database/SUPABASE_PROMPT_SESSION43.md`.
- **Why:** ₹21 friend reward (both sides, on 100% profile, cap ₹1,000), ₹500 brand invite (first funded
  deal ≥ ₹5,000, max 10 brands, locked until 2 own deals, 7 days Featured), wallet payout from ₹11 to UPI.
- **Before the SQL is run:** rewards still work with the default numbers (code defaults); the admin
  can't save the new numbers; withdrawals are saved without the UPI snapshot (admin list looks it up).

---

## (Session 46) Signup source tracking — ✅ DONE in Session 58 (Ravi OK: "han kro")
- Applied as migration `session58_signup_source` (`scripts/sql/session58_signup_source.sql`): users.signup_source / utm_source / utm_medium / utm_campaign.
- Browser: `src/lib/signupSource.js` (first-touch capture in index.jsx, sent once after sign-in from AuthContext). Server: `backend/signupSource.ts` POST /auth/signup-source (new accounts only, set once). Growth: `buildAcquisition` splits by source.
- (Original note below.)
- **Why:** Admin → Overview → Growth ideas → "Where signups come from" can only split *Referral* from
  *Direct / not recorded*. Ravi wants to know how many came from Instagram, Google (organic), Meta ads,
  LinkedIn, etc. No column stores that today, so the screen says so instead of guessing.
- **Change:** `users.signup_source text`, `users.utm_source text`, `users.utm_medium text`,
  `users.utm_campaign text` (all nullable). Optional: `users.signup_city text` for people who skip the profile city.
- **Code to write after it exists:** the web app reads `utm_*` from the first URL and keeps it in
  localStorage until signup; `auth_routes.ts` signup saves it (a protected-flow-free file); `adminGrowth.ts`
  `buildAcquisition` groups by `signup_source` and drops the `trackingGap` note.
- **Until then:** nothing breaks; no code depends on the columns.

---

## (Session 51) Ybex Assist for brands — 3 things that need the database — ✅ DONE in Session 52
Ravi connected Supabase and asked for it ("supabase connect kr diya hu tum khud dekhlo or kaam krlo").
Applied on the live project as migrations `session52_assist`, `session52_assist_fresh_ids`,
`session52_saved_creators_unique`; same SQL in `scripts/sql/session52_assist.sql`. Server-only tables
(RLS on, no policies). Roles stored as 'user' | 'bot'; saved searches got `fresh_ids` too.
(Original note kept below.)
The assistant works today without these (rule 91). They are the next step:
1. **Chat history** — `assist_messages (id uuid, brand_id text, role text 'brand'|'assist', text text, card jsonb, created_at timestamptz)`
   + RLS (a brand reads only its own rows). Lets the bot remember earlier chats on any phone and lets the admin
   read conversations. Code: `src/components/assist/brand/brain.js` (history), `backend/assist_routes.ts`.
2. **Shared daily limit** — `assist_usage (brand_id text, day date, count int, primary key (brand_id, day))`.
   Today the 30-a-day count lives in memory per server copy + on the phone, so a restart resets it.
3. **Saved searches with push** — `assist_saved_searches (id uuid, brand_id text, label text, filters jsonb, seen_ids text[], created_at)`.
   Today "naye creators aaye to batana" is kept on the phone and shown when the brand opens the chat;
   with this table a nightly job can send a push / email the moment a matching creator is approved.

## (Session 52) Still in server memory only — no screen uses them today
- `collab_cost_requests` (POST /creators/:id/request-collab-cost, POST /cost-requests/:id/quote) — no screen calls
  these routes; needs a new table if the feature is ever switched on.
- `message_flags` (admin chat flags) — nothing writes them; real chat moderation goes to `chat_moderation_events`.
- `deleted_user_ids / deleted_user_emails` — extra filter only; the real `is_deleted` flag is on the tables.
- `admin_logs` (UGC deadline notes) — the real admin log is `admin_activity_logs`.

## (Session 53) Launch audit — done on the live database
- `session53_notifications_id_fill`: notifications now get `id` (= notif_id) on insert. The phone-push loop skips rows
  without `id`, and NO row had one — so no notification had ever been pushed to a phone. Existing rows back-filled.
- `session53_assist_chat_id`: `assist_messages.chat_id` — Eva keeps several chats (menu ☰ → earlier chats).
- `session53_close_definer_views`: 3 views (user activity timeline, campaign_deals, ugc_orders_integrity_issues) could be
  read with the public browser key; now server-only.
- SQL copy: `scripts/sql/session53.sql`.

## (Session 53) Still open — decide after launch
- **Public read of profile contact fields:** `creator_profiles` and `brand_profiles` have a "public read" policy, so the
  browser key can read `email` (and `brand_profiles.representative_mobile`) of every profile. Fix = move the ~10
  browser reads of these two tables to server routes, then limit the policy / columns. Not done tonight: those reads
  use `select('*')`, so a column limit would break screens without a real-device test.
- `content-submissions` storage bucket is public (creators' drafts are reachable by anyone who has the exact link).
- API CORS echoes any origin; login lock-out counts per server and trusts the first X-Forwarded-For value.
- `campaigns` has no columns for targeting (languages, gender, follower range, locations, dos / donts…). Brands fill them,
  creators see defaults. Needs columns + a change in the locked `campaigns_routes.ts`.


## Session 56 (payment audit) — APPLIED (Ravi OK: "dusre vale ko bhi fix kro")
- `scripts/sql/session56.sql`, run on the live DB on 2026-10-15:
  - `chk_transactions_one_source` now also allows a brief-only row → the UGC brief deposit is saved in
    `transactions` (brief_id, brand_id, stamped with the Admin platform fee at payment time).
  - `uq_ugc_briefs_razorpay_order`: one paid order → one brief.
  - `uq_transactions_ugc_payout`: one payout row per UGC order (refund rows excluded).


## (Session 58) Eva 👍 / 👎 feedback table — DONE (Ravi: "ok", migration `session58_eva_feedback`, scripts/sql/session58_eva_feedback.sql)
- **Why:** Eva handoff §8f: "send the feedback to the backend for AI quality". Today `POST /assist/feedback`
  (backend/assist_routes.ts) only writes one JSON line to the server log (`evt: "eva_feedback"`).
- **Change:** `eva_feedback (id uuid, user_id text, role text, vote text 'up'|'down', card text, text text, created_at timestamptz)`,
  RLS on, server-only.
- **Code (done):** `POST /assist/feedback` inserts the row; `GET /admin/eva-feedback` + "Eva reply ratings" box in Admin → Help desk → Chatbot.

## (Session 58) Eva settings table — DONE (Ravi: "ok h")
- `eva_settings (user_id text pk, deals bool, money bool, lang 'en'|'hinglish'|'hi', updated_at)`, RLS on, server-only.
  Applied as migration `session58_eva_settings` (scripts/sql/session58_eva_settings.sql).
- Code: `GET / PUT /assist/settings` (backend/assist_routes.ts), synced when Eva opens and on every change
  (src/components/feedback/evaSettings.js). The phone keeps a copy so Eva still works if the server is down.

## (Session 58, round 8) — Ravi: "database ka access hai … sab bna dena"
APPLIED on the live DB (scripts/sql/session58_missing_columns.sql):
- campaigns: gender, follower_min, follower_max, locations, max_creators, collab_mode (+ dos, donts, hashtags kept empty —
  the forms only had sample text). Code saves them now (backend/campaignTargeting.ts).
- creator_profiles.youtube_avg_views (YouTube views were folded into Instagram reach).
- users.suspended_until — Suspend now really blocks the account until that date (login + every request).
- transactions.razorpay_payment_id (+ deposits now keep brand_id). transactions.payout_status default 'PAID' → 'PENDING'
  (a row inserted without it counted as paid out to the creator).
- Storage buckets content-submissions / live-proofs / ugc-assets → private (the app opens them only via /api/media).
APPLIED 2026-10-16 as migration session58_close_public_profile_reads_v2 (the tool refuses DROP, so the same policies
were switched off with ALTER POLICY … TO service_role USING (false); checked: the public key now sees 0 rows).
Original DROP version, for reference:
- scripts/sql/session58_close_public_reads.sql — removes the public read of brand_profiles / creator_profiles /
  creator_verifications (emails, phones, DOB, KYC risk notes readable with the public key) and "authenticated may write
  anything" policies. The app no longer reads these tables from the browser (all through the server), and older app
  versions fall back to the server, so it is safe to run now.

APPLIED 2026-10-16 (v327):
- session58_risk_controls: platform_fee_config + payout_freeze_all (default false), min_campaign_budget,
  max_campaign_budget, withdrawal_fee_rate, dispute_refund_window_days. Enforced in backend/riskControls.ts.
- session58_sessions_30_days: existing user_sessions.expires_at set to now() + 30 days (logins now last 30 days, renewed).

## (Session 58, v334) — App Store 1.2: block a user — DONE in v337 (Session 59)
APPLIED 2026-10-16 as migration `session59_blocked_users` (scripts/sql/session59_blocked_users.sql): table `blocked_users`
(blocker_id, blocked_id, created_at, primary key both, blocker ≠ blocked, index on blocked_id), RLS on, no policies →
server only. Code: backend/blockUsers.ts. Original plan below, for reference:
- What: table `blocked_users (blocker_id text, blocked_id text, created_at timestamptz default now(), primary key
  (blocker_id, blocked_id))` + service-role-only access.
- Why: Apple guideline 1.2 (apps with chat / user profiles) asks for a way to block abusive users. v334 added
  "Report this profile" (existing POST /reports) but no block.
- Code after the table exists: `POST/DELETE /users/:id/block` (new route file, not a locked one), hide the blocked
  person's chats / invites / applications for the blocker, a "Block" button next to "Report this profile"
  (`src/components/safety/ReportUserLink.jsx`) and in the chat menu (chat screen files are locked — server calls in
  them need Ravi's OK). See docs/setup/APP_STORE_CHECKLIST.md Part D.


## Session 62 (v349) — explore hide + Instagram — APPLIED 19 Oct 2026 (Ravi: "Haan, kar do")
`scripts/sql/session62_explore_instagram.sql`: creator_profiles.hidden_from_explore, instagram_verified_at,
instagram_verify_method, instagram_synced_at, instagram_stats; table instagram_connections (RLS on, server only).

## v357 — creator_profiles.profile_status default (OPTIONAL, needs Ravi's OK — NOT applied)
- Now: `profile_status` column default is `'approved'`, so any new creator row without a status looks approved.
- v357 code already handles it without a DB change (backend/exploreGate.ts approvedByAdmin: a self-registered
  profile made after 10 Oct counts as approved only with `reviewed_at`; backend/creatorReviewGate.ts sets new rows to
  under_review). Extra safety if Ravi says OK:
  `alter table creator_profiles alter column profile_status set default 'under_review';`
- Unclaimed form profiles set their own status ("approved" + reviewed_at on admin approval), so they are unaffected.

## v363 (Session 64, 21 Oct 2026) — waitlist Instagram numbers — APPLIED 21 Oct 2026 (Ravi: "Hn new database bna lo abhi")
Migration `waitlist_instagram_fetch_columns` (live): `waitlist.ig_followers integer`, `instagram_stats jsonb`,
`instagram_synced_at timestamptz`, `instagram_fetch_error text` (all nullable, nothing else touched, 66 rows kept).
Why: Admin → Waitlist → "Fetch Instagram for everyone" had nowhere to keep the fetched numbers next to what the form said.
Code: backend/instagramConnect.ts (POST /admin/creators/instagram-bulk/step), backend/admin_waitlist_routes.ts (list),
backend/creatorApplication.ts (approval uses the fetched numbers), src/components/admin/WaitlistManager.jsx.

## v363 — still OPTIONAL (not applied)
- Portfolio covers need no new column: items stay JSON inside `creator_profiles.portfolio` (text[]) with `cover`
  pointing to our own copy in the `avatars` bucket (`portfolio/<user>/<id>`).
- (v366: DONE — see below) `creator_profiles` has no `dob` / `date_of_birth` / `experience` / `experience_years` columns: the locked
  `creators_routes.ts` profile save tries to write them after every save → one harmless 400 in the logs each time
  (the values live in rate_card). Either add the 4 columns or (with Ravi's OK to touch the locked file) drop that write.

## v364 (21 Oct 2026) — split fee — APPLIED (migration `v364_split_platform_fee`, Ravi: "databse mai bhi bana dena")
- platform_fee_config: `fee_model` ('legacy' | 'split'), `creator_fee_pct`, `brand_fee_pct`; live row set to split / 0 / 8.
- transactions: `brand_fee_pct`, `brand_fee_amount`, `brand_fee_gst`, `brand_paid_amount`, `coupon_code`.
- Brand-fee coupons use the existing coupons table (`applies_to = 'brand_fee'`); no new column.
- Not done (optional, needs Ravi): a brand GST invoice line for the service fee (gst_invoices has no brand-fee column);
  refunds still return the deal amount (gross) — whether the service fee is refunded too is Ravi's call.

## v364 — split fee — APPLIED 21 Oct 2026 (Ravi's fee decision)
Migration `v364_split_platform_fee`: platform_fee_config.fee_model / creator_fee_pct / brand_fee_pct (live: split, 0, 8);
transactions.brand_fee_pct / brand_fee_amount / brand_fee_gst / brand_paid_amount / coupon_code.

## v365 — APPLIED 21 Oct 2026
- `v365_waitlist_email_optional`: waitlist.email nullable (unique when present).
- `v365_coupons_applies_to_brand_fee`: coupons.applies_to CHECK allows brand, creator, brand_fee, all.

## v366 — APPLIED 21 Oct 2026
- `v366_creator_profiles_dob_experience`: creator_profiles.dob, date_of_birth, experience, experience_years (text, nullable).
  The locked creators_routes.ts profile save already writes them after every save — the harmless 400 is gone. Additive only.

## v366 — coupon reservations (atomic brand-fee coupon use) — APPLIED 2026-10-21
Ravi: "ye dono bhi fix karo, baaki jo pending hai unhe bhi work karo" + "haan, locked files mein ye fee change kar do".
Migration `v366_coupon_reservations` (same SQL in `scripts/sql/v366_coupon_reservations.sql`), additive only:
- **Table `coupon_reservations`** (id, coupon_id → coupons ON DELETE CASCADE, brand_id, order_id UNIQUE, status
  reserved/confirmed/released, discount, deal_id, ugc_order_id, campaign_id, expires_at, created_at, confirmed_at).
  RLS on, no policies (server only).
- **Functions** (SECURITY DEFINER; EXECUTE revoked from public/anon/authenticated, granted to service_role only):
  `claim_coupon(p_coupon_id, p_brand_id, p_order_id, p_ttl_minutes, p_discount)` — locks the coupon row (FOR UPDATE),
  checks status / dates / total limit incl. live holds / per-brand limit, holds one use for this order;
  `confirm_coupon(p_order_id, …)` — idempotent; marks the hold confirmed, `used_count + 1`, writes coupon_redemptions;
  `release_coupon(p_order_id)`.
- **Code:** `backend/brandFee.ts` claimBrandCoupon / confirmBrandCoupon (falls back to the old recordBrandCoupon when
  the functions are missing), `backend/payment_routes.ts` create-order + persist, `backend/ugc_routes.ts` brief deposit.
- No new columns. "No per-brand limit" on a coupon is stored as `per_user_limit = 0` (the column is NOT NULL).
- Admin service-fee refunds for UGC briefs use the existing `ugc_refunds` table (slots 0, reason starts with
  "[service-fee refund]") — nothing new.

## v367 · Diwali Creator Challenge — NO database change
- **Status: nothing to run.** Entries and winners are signed stamps inside the existing portfolio item JSON
  (`creator_profiles.portfolio`), see `backend/challenge_routes.ts`.
- **Later (optional, after Diwali):** if challenges become a regular thing, a `challenge_entries` table
  (user_id, item_id, reel_url, entered_at, rank) would make the admin list faster than reading every profile.
  Not needed for this challenge (one read per minute, cached).

## v372 · found in the live logs (22 Oct) — optional, the code already works around both
- **`creator_profiles.email` is NOT NULL live**, but v365 (handle-only waitlist rows) and the tests expect it nullable.
  Live result: approving a handle-only waitlist row / admin-editing an e-mail-less account failed with
  `null value in column "email" of relation "creator_profiles" violates not-null constraint` (14:37 UTC, twice).
  v372 code fix: falls back to the account's never-mailed placeholder (`unclaimed_<id>@ybex.io` / `noemail_<id>@ybex.io`).
  Clean fix in the DB session: `alter table creator_profiles alter column email drop not null;` (only relaxes a rule).
- **`column creator_profiles.id does not exist`** (~20× today) comes from `backend/creators_routes.ts` isMyInvite
  (LOCKED file — not changed). Harmless (falls back to user id), only log noise. Needs Ravi's OK to touch.

## v375 · Brand Instagram username — DONE (applied live 23 Oct 2026, Ravi's OK in chat)
- `alter table public.brand_profiles add column if not exists instagram_handle text;` (migration
  `v375_brand_instagram_handle`, additive — old code ignores it).
- Brand onboarding saves the username there (`backend/auth_routes.ts` brand branch). Logo / name come from Instagram
  when the fetch works, otherwise the brand adds them by hand as before (no background job for brands).
