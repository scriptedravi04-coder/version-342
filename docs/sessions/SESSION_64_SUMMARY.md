# Session 64 — v363 → v366 (21 Oct 2026)
(Before this: docs/sessions/SESSION_59_SUMMARY.md = v337 → v362, plus the detailed v363–v366 notes appended there.)
Deploy **v366** only — it contains v363, v364 and v365.

## Live database changes (all applied, all additive — nothing deleted)
| Migration | What |
|---|---|
| `waitlist_instagram_fetch_columns` | waitlist.ig_followers, instagram_stats, instagram_synced_at, instagram_fetch_error |
| `v364_split_platform_fee` | platform_fee_config.fee_model / creator_fee_pct / brand_fee_pct (live: split, 0, 8); transactions.brand_fee_pct / brand_fee_amount / brand_fee_gst / brand_paid_amount / coupon_code |
| `v365_waitlist_email_optional` | waitlist.email nullable (still unique when present) |
| `v365_coupons_applies_to_brand_fee` | coupons.applies_to allows brand, creator, brand_fee, all |
| `v366_coupon_reservations` | table coupon_reservations + functions claim_coupon / confirm_coupon / release_coupon (row lock, service_role only) |
| `v366_creator_profiles_dob_experience` | creator_profiles.dob, date_of_birth, experience, experience_years |
Old code ignores every new column, so nothing changed live before the deploy.

## 1. Money — fee till Diwali (8 Nov 2026)
- **Creator 0%** (gets the full deal amount), **brand 8% on top**, coupon can lower the brand fee (new %, ₹ off, or 0) —
  campaign deals AND UGC. ₹10,000 deal → brand pays ₹10,800 (₹10,400 with a 4% coupon) → creator ₹10,000 → Ybex ₹800.
- Admin → Fees: "Split / Old tiered" switch, Creator fee % and Brand fee % boxes with a live example (change after Diwali here).
- Admin → Coupons: Applies to → Brand fee; limits, per-brand limit (empty = none), dates, min deal value, active, used count.
- Server decides every amount: POST /payments/quote → create-order charges the quote → payment recorded only if paid ≥ total.
  Instant UGC orders now also priced on the server. Old orders made before v364 still work.
- Coupon use is atomic in the DB (no double use of the last slot); counted once even if verify + webhook both arrive.
- 2% rate-card markup switched off in split mode (no 2% + 8% double). Already-paid deals keep their stamped fee.
- Brand Review & pay = Ravi's new checkout: amount card, UPI app tiles (GPay / PhonePe / Paytm / BHIM / Amazon Pay /
  UPI ID), card / net banking, sticky "Pay ₹X | via PhonePe", Razorpay handoff screen, "Escrow funded" success with
  Razorpay ID + receipt. Razorpay opens on the chosen app (normal sheet if it refuses). Approve-in-app step = Razorpay's own window.
- Refunds (admin, manual amount + reason): shows Brand paid / Service fee / Coupon, quick fills, further refunds up to
  what's left, never more than the brand paid; a fee-only refund never touches the creator's payout. Same in Admin → UGC Refunds.
- Brand invoice (screen + PDF): "Convenience fee (8%)" line + coupon; total = what the brand paid. Not a GST invoice.
- Locked files changed with Ravi's OK, logged via `npm run protect:update` (docs/code/PROTECTED_CHANGES.md).

## 2. Waitlist + CSV
- "Fetch Instagram for everyone" works on Cloud Run now (admin screen drives it step by step, waitlist first; keep the page open).
  Live followers shown next to the form's number ("form said 9,500"); fetch errors shown; approval uses the live numbers.
- CSV import: email optional when there's an Instagram handle; duplicates by handle; re-upload completes rows.
  Approve without email → one unclaimed profile, no "Claim your profile" email, re-approve never duplicates.

## 3. Onboarding, profile, design
- Onboarding never traps anyone: "Exit → Log out" before basics, "Finish later" after; brand screen-1 Back opens it
  (Ankit's bug). Logo upload / publish errors say why; logo + city/state saved by the server.
- Ravi's Instagram auto-fetch design: username → photo, name, numbers (creator + brand; brand also bio + website),
  "Is this you?" confirm before saving (fixes @narendramodi numbers), one Instagram card on Social platforms,
  live strip on the profile hub, new portfolio (Select / Paste / Upload → tag brand → brand stacks, covers copied to our
  storage so previews don't vanish), photo-led public profile with adaptive colour, desktop portfolio covers.
- Home footer: same city art in light grey (Hopr style), smaller, new taglines for creators / brands.
- Real logos everywhere (SocialLogo.jsx, PaymentLogo.jsx from Ravi's logo files).
- Promo popup "Tap opens": every page incl. profile sub-screens + search.
- Eva: bio rule shown (40+ chars), refreshes after any save. Admin creator-edit no longer fails silently.
- Age: 14+ everywhere (sign-up, onboarding, Terms, Privacy). No guardian flow (Ravi). Terms version not bumped.

## 4. Reliability + apps
- Server down / deploying: app shows "Ybex is updating" with saved screens, keeps login; profile-type saves wait on the
  phone and sync later; money / chat / deals never queued.
- Admin speed: session lookup cached 30 s, pending-counts cached 20 s, badge poll 60 s only while visible.
- Android app with screens inside (android-app/, Capacitor 7, version 1.0.4 / code 5, same signing key → Play update),
  live updates via /api/app/android-update, Back never traps, Firebase push ready (backend/fcm.ts, needs FCM_SERVICE_ACCOUNT_JSON).
- Meta Pixel 965515649959745 (loads once, funnel events), Privacy policy mentions Pixel + GA. Version label v366.

## Tests
`npm run verify`: 232 test files / 2282 pass, 0 fail (tsc + crash guard OK). `npm run build` OK. Repo 971 files (< 1,000).
Deep black-box + white-box tests on the money flow: real routers + fake Supabase with the live columns + fake Razorpay.

## Needs Ravi
1. Deploy v366, then one small real test payment (brand sees ₹X + 8%, creator payout = full deal).
2. Admin → Waitlist → "Fetch Instagram for everyone" (page open) → approve the 44; then send the 2,500-creator file.
3. Delete the 3 half-made brand accounts: run the SQL from chat in Supabase → SQL Editor.
4. Make brand-fee coupons in Admin → Coupons.
5. Firebase project (google-services.json + FCM_SERVICE_ACCOUNT_JSON); give Mac access → Claude builds the Android app.
6. Ankit: Chrome → Site settings → ybexapp.ai.studio → Delete data, then log in again.

---

# v367 — Diwali Creator Challenge (21 Oct 2026)
Deploy **v367** only (it contains v363–v366). **No database change** — nothing to run in Supabase.

## How an entry works
Creator posts a reel about Ybex on Instagram (@ybex.in + #YbexDiwaliChallenge) → Ybex app → Profile → Portfolio → Add →
picks the reel → "Tag the brand" = **Ybex** (or any brand, if the caption has the hashtag / mention) → the
**"🪔 Submit to Diwali Challenge"** toggle shows, **ON by default** → saved = entry → "Entry #N is in! 🎉" sheet.
- Server checks every entry: entries open (till **2 Nov 2026, 11:59 PM IST**), creator role, onboarding complete,
  only instagram.com/reel or /p links, **max 3 per creator**, same reel never twice.
- Stored as a **signed stamp inside the portfolio item JSON** (`creator_profiles.portfolio`: challenge, challenge_at,
  challenge_sig). Winners the same way (challenge_rank + signature). A creator can't fake an entry or a prize.
- The locked portfolio save (`creators_routes.ts`) is unchanged. New: `backend/challenge_routes.ts`.

## Screens (brief points)
1. **/challenge** — public, no login (use it in ads + Instagram bio). Saffron hero, prizes, 4 steps, reel ideas, rules,
   live countdown from **server time**, pinned Join: logged out → sign up · onboarding not done → onboarding · done →
   Portfolio → Add opens straight away. From **5 Nov** it shows the winners. Meta Pixel event `ViewChallenge`.
2. **Tag the brand toggle** — default ON, off after 2 Nov; tells why it can't enter (profile not finished, not an
   Instagram reel/post link, 3 entries used).
3. **Entry done sheet** — "Entry #N is in! 🎉", reel thumbnail, "Tell your friends" (share / copy the challenge link).
   Pixel event `ChallengeEntry`.
4. **Creator Home card** — my entry (thumbnail, views, likes, days left) or "Make a reel about Ybex, win big" → /challenge.
   Not on the Profile hub.
5. **Home festive header** — Diwali lights + "Happy Diwali 🪔" (22 Oct → 8 Nov). **Poster banner = Admin → Banners**:
   upload `Diwali_banner_1200x400.jpg`, link `/challenge`.
6. **Launch popup = Admin → Promo popups** (existing system): layout Full screen, upload
   `Diwali_popup_1080x2340.jpg`, link `/challenge`, audience Creators, how often Once, end date 2 Nov 23:59.
7. **"🪔 Entry" ribbon** on the reel in my Portfolio and on the public profile (shows "1st prize" etc. after marking).
8. **Admin → Challenge entries** — creator, @handle, reel + thumbnail, views, likes, date; sort Most views / Most likes /
   Newest / Oldest; search; Winners only; Export CSV; **Mark winner** 1st / 2nd / 3rd / Top 20 (full admin only).

## Change before announcing
`src/lib/diwaliChallenge.ts`: `PRIZES` (all "To be announced" now) and `SPONSORS` (empty = "Powered by" hidden).
Dates are in the same file. All copy is English (app rule).

## Not done (as asked)
No Founding Creator badge, no badge on public profile / Explore, no bio line change, no card on the Profile hub.
Desktop: the challenge flow is the phone Portfolio screen; the old desktop portfolio editor has no toggle.

## Files
New: `src/lib/diwaliChallenge.ts`, `src/lib/challengeApi.js`, `backend/challenge_routes.ts`,
`src/components/challenge/ChallengeUi.jsx`, `src/pages/ChallengePage.jsx`, `src/components/admin/AdminChallengeEntries.jsx`,
`public/challenge-hero.webp`. Removed (unused): `src/unique_features.js`, `src/pages/creator/profileScreens/portfolioLinkInfo.js`.
Tests: `backend/v367Challenge.test.ts`, `src/components/challenge/challengeUi.test.jsx` (packed in dev/tests.tgz).

## Needs Ravi
1. Deploy v367. Open `/challenge` logged out (countdown, Join → sign up).
2. Test entry: post a test reel with #YbexDiwaliChallenge → Portfolio → Add → tag Ybex → toggle ON → "Entry #1".
   Check Admin → Challenge entries. Remove the test reel from your portfolio afterwards (that removes the entry).
3. Upload the banner (Admin → Banners) and the popup (Admin → Promo popups), both link `/challenge`.
4. Send prize / sponsor names when confirmed → I fill `PRIZES` / `SPONSORS`.
5. 5 Nov: Admin → Challenge entries → sort by views → Mark winner. /challenge shows them right away.

# v367 + launch screen fix (22 Oct 2026)
Same version label (v367); this zip replaces the earlier v367 zip. No database change.

## What changed
- **Android app 1.0.4:** opening the app shows only plain #7E00DC purple for a moment (no logo box — that box came
  from the old PWABuilder app 1.0.2), then the app's own animation (camera → flash → "Ybex." → shine) starts.
  A native launch-screen animation was tried and dropped (Ravi: didn't look right).
- **Shine repeat (all installed apps):** if the app is still loading after the intro, the shine sweeps "Ybex."
  again every 1.4 s until the screen is ready (index.html splash script).
- Android build targets API 36; launch images are plain #7E00DC (`android-app/scripts/mac-prepare-android.sh` step 4b).

`npm run verify`: 234 test files / 2301 pass, 0 fail.

## Order
1. Deploy this v367.
2. Test Ybex-1.0.4.apk on a phone, then upload Ybex-1.0.4.aab to Play → Closed testing.

---

# v368 — v367 deep test + fixes, Sponsors & prizes in Admin (22 Oct 2026)
Deploy **v368** only (contains v363–v367 and Ravi's launch-screen v367). **No new table or column.** Uses the
existing server-only table `ybex_ephemeral` (scripts/sql/ybex_ephemeral.sql, Session 22) — if it is missing, saving
sponsors says so and the challenge still works from the portfolio stamps.

## New: Admin → Challenge entries → "Sponsors & prizes"
One place: brand **name + logo upload + reel scripts** (up to 8 brands × 10 scripts) and the **prizes**. "Save everywhere"
→ /challenge "Powered by" logos, "Brand scripts" section (Copy button), Prize cards, the creator Home card
("Powered by …") and the Tag-the-brand toggle (tagging a sponsor brand also shows "Submit to Diwali Challenge").
Logos are shrunk in the browser (max 320×160 WebP). Only a full admin can save. Banner / popup images are pictures:
change those in Admin → Banners / Promo popups.

## Deep test (white-box + black-box) — found and fixed
1. Entry could silently vanish when a later save (old screen, second phone, desktop editor) dropped the stamp →
   server ledger keeps every entry; it counts while the reel is in the portfolio.
2. A marked prize could be wiped by the creator's own save → prizes live in the server ledger.
3. Anyone could type "1st prize" into their portfolio and show it on their public profile → ribbon shows only "🪔 Entry".
4. Rank visible to the creator before 5 Nov → hidden till results.
5. "Entry #…" instead of the number right after saving / on another server instance → own entries read fresh.
6. Desktop "Join" opened the Profile tab (no picker, no toggle) → phone Portfolio opens in a panel; button on desktop Portfolio tab.
7. Desktop edit of a portfolio item dropped its cover, views, likes and stamp (old bug) → fields kept.
8. "Finish later" creators were sent to Portfolio and then blocked → Join sends them to onboarding.
9. No way for existing users to log in from /challenge → "Already on Ybex? Log in" (comes back to /challenge).
10. "Add collabs" reopened on every visit after Join (?add=1 stayed) → cleared on close.
11. Many Home opens at once each scanned all creator profiles → one shared load per instance; only entrants read.
12. Stamp request link length unchecked → max 500 characters.
Checked OK: Ravi's splash shine loop, 2 Nov cut-off, 3-entry limit, forged stamps, sub-admin can't mark winners,
wrong phone clock (countdown uses server time).

Tests added: `backend/v367ChallengeBlackbox.test.ts` (real router over HTTP + fake Supabase), 
`src/components/challenge/challengeFlow.test.jsx` (taps end to end), more in `challengeUi.test.jsx`.

## Needs Ravi
1. Deploy v368. 2. Admin → Challenge entries → Sponsors & prizes → add brands, logos, scripts, prizes → Save everywhere
→ Preview /challenge. If it says "needs the table ybex_ephemeral": Supabase → SQL Editor → run scripts/sql/ybex_ephemeral.sql once.
3. Test entry as in v367. 4. Banner + popup as in v367 (those images don't change by themselves).

## v368 (same zip) — Offer links for banners and popups
- New stable link **`/offer`** = the current offer page (now the Diwali Creator Challenge; `/challenge` still works).
  Link banners / popups / ads to `/offer` and they keep working when the next offer (e.g. Christmas) replaces this one.
- Admin → **Promo popups** page picker: new group **Offers** ("Offer page", "Offer → Add my reel & enter").
- Admin → **Banners**: "Click-Through URL" now has the same page picker (was a typing box only). A pasted
  https://ybexapp.ai.studio/… link is turned into the app page, so it opens inside the app, not a browser tab.
- Next offer (after Diwali): the screens + entry rules are in `src/lib/diwaliChallenge.ts` and `src/pages/ChallengePage.jsx`;
  sponsors / scripts / prizes already come from Admin. A new offer = new look + its id / dates / hashtag (one build).

---

# v369 — Challenge dates set from Admin (22 Oct 2026)
Deploy **v369** only (contains everything up to v368). No database change.
- **Admin → Challenge entries → Sponsors & prizes → Dates:** "Entries close on" (that day, 11:59 PM IST) and
  "Winners shown from" (that day, 12:00 AM), plus quick buttons "Close in 7 / 10 / 14 / 21 days". Shows "N days from today".
  Save everywhere → the server, /challenge (countdown, deadline line, rules, pinned bar), Entry done sheet, creator
  Home card, the Tag-the-brand toggle and the Admin header all follow the new dates within a minute.
- Default until saved: **entries close 15 Nov 2026, 11:59 PM; winners 18 Nov.** Checks: close after the start and within
  120 days; results on/after close. Making the close date earlier removes entries made after the new close time.
- Diwali lights + "Happy Diwali" on Home stay fixed till Diwali (8 Nov); the challenge card / page stay on till a week after results.
- Banner + popup images no longer print a date ("Limited time", "1 reel = 1 entry") — upload the new ones.

---

# v370 — Website uses the app's sign-in (22 Oct 2026)
Deploy **v370** only (contains everything up to v369). No database change. **Deploy after the 23 Oct announce.**
- `/login` and `/signup` (and every "Sign In" / "Get Ybex" / "Sign up" link) now open the app's sign-in on the website:
  role cards (Creator / Brand) → **one email box** → the app checks the account:
  existing + password → password box, "Log in with OTP instead" below, "Forgot password?" · existing without password → email code ·
  other side → offer that side · admin email → "Open admin panel" · **new email → name, mobile, password (required), Terms →
  one email verification code → onboarding.** "Continue with Google" below (iPhone: Apple too) → straight to onboarding.
- Links keep working: `?role=creator|brand` (ads, blog CTAs) skips the role cards; `next` (e.g. /challenge), `utm_*`, `ref`, `email` stay.
  `/login?demo=1` keeps the old form (test server).
- "Not a brand? Continue as a Creator" (and the other way) under the email box — for a creator who taps a brand ad.
- On a computer the screens sit in a phone-sized card in the middle (they were made for phones).
- Meta Pixel `ViewSignupPage` now fires on /app and /app/continue/creator|brand (one view per visit, not two).
- Ads: give every ad link a role + its own UTM, e.g. `/signup?role=brand&utm_source=meta&utm_campaign=brand_diwali_ad1`.
Tests: `src/pages/app/webAuthV370.test.jsx` (links, ?next return, side switch, password required, Google on the web).

---

# v371 — Example reels on the offer page (22 Oct 2026)
Deploy **v371** only (contains everything up to v370). No database change (saved with the sponsors / prizes settings).
- **Admin → Challenge entries → Sponsors & prizes → Example reels:** upload up to **3 videos** (MP4 / MOV, under 30 MB each —
  the server takes about 32 MB per upload). The cover is made from the first frame. Caption (optional), Move, Remove.
  Stored in our own storage (bucket `banners`), full quality as uploaded. **Save everywhere** to show them.
- **/offer:** new "See an example" section (above Reel ideas): vertical reels that play **muted on a loop only while on
  screen** (saves people's data), cover first, tap or the speaker button for sound.
- Best export: vertical 1080×1920, 30–60 s, H.264 MP4, ~8–20 MB.
- **₹1,00,000 prize pool · 50 winners** (default, editable in Admin): 1st ₹20,000 · 2nd ₹12,000 · 3rd ₹8,000 ·
  ranks 4–10 ₹3,000 each · 11–20 ₹1,500 each · 21–50 ₹800 each. "Mark winner" now has 1st / 2nd / 3rd / Ranks 4–10 /
  11–20 / 21–50. Headline chips on /offer: prize pool · 50 winners · No joining fee (texts editable in Admin).
- **"Everyone who enters wins" box** (text editable in Admin — only promise what every valid entry really gets).
- **Trust:** "How you get paid" (bank within 7 working days of results after KYC · winners listed publicly · run by
  the Ybex team, support@ybexmedia.in), a **Questions** section (free? followers? payment? judging? more reels?),
  rules rewritten in plain English incl. "subject to applicable taxes, paid after KYC". ⚠️ Keep the 7-day promise.
- **Social proof:** entry / creator counts show only from 50; until then "No joining fee · Free for Instagram creators".
- **Join → "Is your reel ready?"** — "Yes, add my reel" (Portfolio → Add) or "Not yet — remind me" (saved; Home card
  says "Your reel is waiting"). Admin → Challenge entries → **Reminder list** CSV (name, email, phone, Instagram) of
  people who asked and haven't entered — use it for WhatsApp / email / push before the close date.
- **Entry without full onboarding:** a name + email or phone is enough; if the profile has no Instagram username, the
  toggle asks for it (saved with the entry). No name / contact → onboarding first.
- **Instagram / Facebook in-app browser** (where ads open): "Continue with Google" is hidden there (Google blocks it)
  with a line "tap ⋯ → Open in browser"; email sign-in shown first.

---

# v372 — Bugs from Ravi's screen recording + screenshots (22 Oct 2026)
Deploy **v372** only (contains everything up to v371). **No database change.** Found by watching the 73-sec
recording frame by frame + the live database logs.

## Fixed
| # | What Ravi saw | Cause | Fix |
|---|---|---|---|
| 1 | Admin: "Couldn't create the creator profile: null value in column email…" | live `creator_profiles.email` is NOT NULL; handle-only approvals / e-mail-less accounts sent null | falls back to the never-mailed `…@ybex.io` placeholder (approve + admin edit) |
| 2 | Profile showed "Category not set", "Add your city", no Instagram, Rate cards "Not set" | profile still loading / load failed → empty defaults shown as real | grey loading bars, red "Couldn't load · Retry"; **a save before the profile loads is refused** (every save sends the whole profile — it would have wiped category / city / Instagram) |
| 3 | Brand sheet: closed half-way → "Nothing added — those weren't brand collabs", tagged reel lost | X dropped everything already tagged | X now saves what's tagged |
| 4 | "Saving…" for long, X during save → old portfolio, "1 added" popped on Home later | covers + challenge stamp ran one after another; screen could close mid-save | both at the same time; X disabled while saving |
| 5 | Grid text showing through the tag sheet, the bottom bar ("Re0 selected"), the Entry #1 sheet, the brand sheet | 85–90% see-through + iPhone can't blur inside a blurred layer | sheets solid, bottom bar 95% |
| 6 | Keyboard pushed the tag sheet's top off screen | sheet taller than the space above the keyboard | preview hides while typing, height follows the visible screen |
| 7 | Photo post said "1 selected reel", "Tag 1 reel as Trek", "Instagram reel" | always "reel" | /p/ links say post |
| 8 | "Other work" card with empty purple cover | older onboarding picker saved no brand / cover | cover copied from Instagram once and saved; stack says "Tap to add the brand name", sheet opens straight in rename |
| 9 | Home: "24 days left" cut off under the shortcuts card | Quick Bar's -22px overlap slid over the challenge card | card moved below the Quick Bar |
| 10 | Home challenge card: heart with "—" | likes not given for that reel | unknown numbers hidden |
| 11 | @elite_ravi: "Couldn't find that account" + "Couldn't refresh" | every failure (no internet / server updating) showed "not found" | real reason: "Couldn't reach Ybex…", "not found" only for a real 404 |
| 12 | "Synced 2 days ago · refreshes daily" | hourly timer job doesn't run on Cloud Run (CPU paused between requests) | opening Social platforms refreshes numbers older than a day (≤ 6 s, once per 30 min) |
| 13 | "NOT VERIFIED YET" with no way to verify | DM / Instagram-login verify not switched on | shows "Live from Instagram" then |
| 14 | Bell kept "4" after opening notifications | list never marked seen | opening the list clears the bell (items stay highlighted on screen) |
| 16 | Admin → Waitlist: "Fetch failed" on every row (144) | Meta: "Cannot call API for app 913426198373843 on behalf of user …" — **Ybex's own IG_GRAPH_TOKEN was revoked**, not the creators | message says so; the run stops at once instead of marking every row; list shows "Ybex token expired" |
| 15 | Eva: "Psst… new campaigns are live" / "Your profile could shine more" to everyone | fixed lines | lines offer help instead of claiming |

`npm run verify`: 240 test files, 0 fail. `npm run build` OK. Repo 982 files (< 1,000).

## Not code (Ravi)
- **Renew IG_GRAPH_TOKEN (most important):** Meta stopped accepting Ybex's token (password change / app removed / permission
  revoked). Make a new long-lived token for the Facebook Page linked to Ybex's Instagram (instagram_basic +
  pages_read_engagement), put it in Cloud Run env, redeploy, then Admin → Waitlist → Fetch Instagram for everyone.
  Until then no Instagram fetch works (connect, refresh, portfolio picker, waitlist).
- "Complete your profile — Brands Find You" Home banner shows to complete profiles too: it's an image in Admin → Banners.
- DB session (optional): `alter table creator_profiles alter column email drop not null;` — see PENDING_DB_CHANGES.md.

## Diwali Home + opening poster (Ravi: "design wala Diwali dashboard app mein kyu nahi", "brand panel bhi",
## "Hopr jaisi opening screen", "footer bhi theme ke saath", "banner admin se hi rahe, powered by admin se")
Till Diwali night (8 Nov); after that everything goes back by itself.
- **Creator Home (design 2b) + Brand Home (2n):** saffron → magenta header, light rays, sparkles, string lights,
  "HAPPY DIWALI" + name in white, glass bell; big **"Diwali Dhamaka"** (Rye). Creator line "ZERO COMMISSION · KEEP 100%"
  (true: creators pay 0%). Brand line "FESTIVE COLLABS · VERIFIED CREATORS" — brands pay 8%, so no zero-commission
  promise (if Admin → Fees brand fee = 0, change `BRAND_LINE` in DiwaliHome.jsx).
- **Banner slot = Admin → Banners, unchanged** (nothing hardcoded) — it only gets a yellow festive frame. Upload the
  Diwali banner there (audience Creators / Brands).
- **Powered by** under the creator banner = Admin → Challenge entries → Sponsors & prizes (same list as /challenge):
  logo shown in white on the orange; a sponsor without logo shows its name. Change it in Admin, it changes here.
- Quick actions = cream festive tiles; arch with three diyas into a cream page.
- **Footer** (city art) turns warm: cream → peach ground, saffron city, "🪔 Happy Diwali from Ybex".
- **Opening poster (design 2l, Hopr-style):** right after the Ybex splash, once per app open, creators only, while
  entries are open: "Diwali · Creator Challenge" sign, "Win up to ₹1,00,000", "1st prize: …" (from Admin prizes),
  creators art, bottom panel with live countdown (server dates), Join Challenge → /challenge, Powered by (Admin).
  Closes by itself after 5 s (white time bar on top), or X. Promo popups wait while it shows.
- Files: new `src/components/challenge/DiwaliHome.jsx`, `src/components/challenge/DiwaliEntryScreen.jsx`,
  `public/diwali-entry-group.webp`; `CreatorHomeMobile.jsx`, `BrandHomeMobile.jsx`, `HomeCityFooter.jsx`, `App.jsx`
  (style switches + one mount — no server call changed).
- Not built (needs Ravi): points / +50 bio bonus / Founding badge.

## Portfolio flow (Ravi's "Ybex Portfolio Flow" design 4a / 3b / 3c + "alag alag size, collage jaisa")
- **4a Bento wall:** every piece on one wall. Pinned big = the Diwali entry (else the most viewed), "Pinned · top
  collab"; the rest in a mixed-size collage (tall / wide / small / big, packed dense). Brand chips on top filter the wall
  (All · Ybex media 2 · Sony 1 …). Tiles: "DIWALI ENTRY" pill, ▸ views / ♥ likes, brand initial + name; tap → brand
  sheet (rename / remove) as before. Dashed "Add a collab · N found on @handle" tile. Diwali strip at the bottom
  "Diwali entries · 1 of 3 · Ends <close date> · win up to ₹1,00,000 · Add entry" while entries are open.
  (The old stacks / grid switch is gone — the wall replaces both.)
- **3b Tag sheet:** compact reel row (thumb, "1 reel selected", views · posted date, X), "Which brand is this reel
  for?", search box, pick list (caption brand, "N reels already in your portfolio" ✓, other matches, "Create new brand
  “X”"), marigold Diwali strip "Submit as Diwali entry · Entry 2 of 3 · win up to ₹1,00,000" with an orange toggle,
  then "Not a brand collab" (left) + "Tag & enter" (right).
- **3c Entry confirmed:** festive header (rays, marigolds, sparkles, tilted reel cover, blue "ENTRY #2" badge),
  "You're in, Ravi!", three slots (Entry 1 ✓ In · Entry 2 ✓ In · + Entry 3 1 left), checklist (caption tags, keep
  public), Tell your friends, See prizes & rules.
- Files: `PortfolioViews.jsx` (PortfolioStacks = bento wall), `TagBrandSheet.jsx`, `ChallengeUi.jsx` (EntryDoneSheet),
  new `src/components/challenge/Festive.jsx` (marigolds, diya tile, sparkle), `PortfolioScreen.jsx` (props only).
  No server call changed.

Tests: `src/components/portfolio/v372Portfolio.test.jsx`, `backend/v372ApprovalEmail.test.ts`,
`src/components/challenge/diwaliHome.test.jsx` (packed in dev/tests.tgz).

## Website sign-in on a computer (Ravi: "web app ko app jaisa kaha tha, desktop ko nahi")
v370 put the app's sign-in in a phone-sized card on computers. Now (Ravi's canvas "Ybex Desktop Sign-in"):
- **≥1024px:** a real desktop page — site top bar (Ybex · Live Campaigns · Explore Creators · UGC Orders · Sign In ·
  Get Ybex), the app's purple carousel on the left (same 4 slides, auto-sliding, dots; creator side starts on the creator
  slide), and the same sign-in screens in a big white card on the right. Role screen gets "How will you use Ybex?".
  768–1023px keeps the phone card; phones unchanged. File: new `src/components/app/DesktopAuthFrame.jsx`;
  `AppLoginScreen.jsx` carousel moved into an exported `HeroCarousel` (same slides, same timing, same test ids).
- **Email → password in place (phone + computer):** an account with a password no longer jumps to another screen —
  the email box locks with "✓ Verified · Change", the password box slides open below, "Forgot password?" under it,
  "Log in with password", and right under it "Log in with OTP instead" (for anyone without a password).
  Accounts with no password still go to the code screen. Same server calls as before.

# v372 + Android app fixes (23 Oct 2026)
Same version label (v372); this zip replaces the earlier v372 zip. No database change.

## 1. Web updates never reached the installed apps (server fix — no app release needed)
- The live-update plugin (@capgo/capacitor-updater 7.x) refuses a bundle without its SHA-256 checksum
  ("Checksum required"), and the server didn't send one — so Android (and iPhone) apps stayed on their built-in screens.
- `scripts/ota-bundle.mjs` now writes `checksum` (SHA-256 of the zip) into ota/latest.json; `backend/appUpdate.ts`
  sends it with the update. After this deploy every installed app (1.0.4+) downloads new screens on open and shows them
  on the next open.

## 2. Android 1.0.4 crashed on open ("Ybex closed because this app has a bug")
- On phones where notifications were already allowed, the app asked Firebase for a push token at start; Firebase isn't
  set up yet (no google-services.json) and the push plugin's error closes the whole app.
- `src/lib/nativePush.js`: Android push stays off (`ANDROID_FCM_READY = false`) until Firebase is added — then set it to
  true in the same Android release that carries google-services.json.

## 3. Home-screen icon became the default blue Capacitor icon (Android 8+)
- The adaptive icon layers were never made. Now purple gradient + white "Ybex." (`android-app/icon/`, copied by
  `mac-prepare-android.sh` before `npm run assets`). Script also sets minSdk 24 (Play protection needs it).

## Play Store
- 1.0.4 (code 5) went out with the crash; 1.0.5 (code 6, crash fix) sent for review 22 Oct.
- **1.0.6 (code 7) = crash fix + icon**, built from this zip — upload to Closed testing.
- `mac-prepare-android.sh` still says 1.0.4 / code 5 (a test pins it); the next Mac build must use 1.0.7 / code 8+.

`npm run verify`: 240 test files / 2372 pass, 0 fail (tsc + crash guard OK).

## Needs Ravi
1. Deploy this v372.
2. Open the Android app twice → new screens should show.
3. Play Console → Closed testing → new release → upload Ybex-1.0.6.aab.

# v373 — Deep black-box + white-box test, Diwali Challenge first (23 Oct 2026)
No database change. Ravi: "deep testing, ek ek chij as a user chalao, chote se chota bug fix, Diwali campaign priority".

## How it was tested
- **Black-box on the real server**: `dist/server.cjs` (production build) run against an in-memory Supabase stand-in
  (PostgREST + Storage, 1,000-row page limit like Supabase). 30 API checks over HTTP: logged out / brand / no-name
  creator refused, bad link, duplicate reel, 3-entry limit, forged stamp, stamp dropped by a later save (ledger keeps it),
  winners (full admin only, hidden before results), sponsors/prizes/dates config, reminders. All pass.
- **In a real browser** (Chromium, 360×640, 360×740, 390×844 phones + 1366 desktop), as each user: the whole entry flow
  (/challenge → Join → "Is your reel ready?" → Add collabs → paste link → tag Ybex → Entry #1 sheet), entering a reel
  already in the portfolio, creator + brand Diwali Home, Admin → Challenge entries / mark winner / Sponsors & prizes,
  and a crawl of 70 screens (logged out, creator, brand, every admin tab): no crash, no page error, no 5xx.

## Diwali Challenge fixes
1. **Opening poster popped up over "Add collabs"** right after "Yes, add my reel" on /challenge and sent the creator back
   to /challenge. Not shown any more once the offer page was opened this session, or on an `?add=1` screen.
2. **Poster on small phones**: the creators art covered "Win up to ₹1,00,000" on 360×640. The art now takes only the
   space left (gone on very short screens); text sits above it.
3. **A reel already in the portfolio could never be entered** (added before the challenge, toggle off, or the entry
   failed) — Add collabs hides it as a duplicate. Brand sheet → each such Ybex / sponsor / hashtag reel has **🪔 Enter**
   (asks the Instagram username there if missing). Old items with an id the server refuses get a clean id first.
4. **No username → saved but not entered** (v371 rule kept, a test pins it) was silent; the sheet now says it under the
   username box.
5. **Views / likes were frozen at the day the reel was added** (nothing refreshed them) and winners are picked on them.
   Admin → Challenge entries → **Refresh numbers** (`POST /admin/challenge/refresh-stats`, 5 creators per call, step by
   step) reads each entrant's last 25 Instagram posts: live views / likes into the ledger (by shortcode), plus a
   **Hashtag** column (✓ in caption / ✗ missing / reel not found) and both in the CSV. Needs IG_GRAPH_TOKEN working
   (renew it — v372 note); stops with a clear message on a token / rate-limit error. Creator card no longer says "Views
   update daily". The purple button is now "Reload list" (it sat next to "Refresh numbers").
6. **Ledger past 1,000 rows**: Supabase returns max 1,000 rows per request, so with more entrants + reminders the rest
   (and their prizes) were silently skipped. Read in pages now.
7. **4th entry by double tap / two phones**: two stamp requests at once each saw "2 left". One stamp request at a time
   per creator, and stamps handed out in the last 15 min that aren't saved yet hold their slot.
8. App open asked `/challenge/public` 3× (poster, Home, page) — one shared answer for 20 s (server time kept moving).
9. Removing a Diwali entry now says it leaves the challenge. Entry slots: "2 left" once, then "Open". Poster retries
   if the page changed while the splash was on. Tag sheet: "Pasted link" (not "From your Instagram"), "N already in
   your portfolio" (no "reels" for posts), 1-letter usernames allowed like the server.

## Landing page
The v373 change to the brand fee lines on the landing was **undone** (Ravi: "brands ko 0 hi dikhana hai — fees mere
according kam kar dunga"). The landing is exactly as in v372 again ("Zero platform fee for brands", savings box
"Ybex fee (0%) ₹0"). Ravi sets the brand fee in Admin → Fees so checkout matches.

## Not changed (needs Ravi)
- Logged-out **Join** still opens `/signup?role=creator` (a test pins it). An existing creator who logs in there lands on
  Home, not back on /challenge. Say OK to add `&next=/challenge`.
- Sub-admins see Challenge entries only with the "manage_users" permission (by design, v367).

New tests: backend/v373ChallengeDeep.test.ts, src/components/challenge/v373ChallengeDeep.test.jsx,
src/components/challenge/v373Poster.test.jsx (in dev/tests.tgz).

# v374 — Automatic emails redesigned (23 Oct 2026)
No database change. Ravi: redesign the automatic emails, subjects that say the point first (plain English), keep the
"Wanted to personally reach out" welcome as it is, keep the current sender (noreply), stop the admin email on every
sign-up, and no Diwali Challenge emails in code (he sends them himself).

## What changed
- **New look for every automatic email** (`backend/helpers.ts` → `buildEmailHtml`, same arguments): deep-purple band,
  big heading, dark button, Help / Privacy footer and why the person got it; optional inbox preview line, top label,
  icon, fact rows (`emailFactsHtml`). The old look lives on as `buildLegacyEmailHtml`, used only by the personal
  welcome (text, subject and sender unchanged).
- **Campaign invite button opened "undefined"** (locked creators_routes passes `button.url`): the builder reads
  `url` too, so the button works without touching the locked file.
- **Notice emails** (`activityEmailCopy` in notificationService.ts): a rejected campaign got the "Content revision
  requested" email with a deals button → its own email to My campaigns. Campaign live, payment held, refunds, refund
  account needed, deal settled, admin reminders and messages got "New activity on Ybex Media" + a Home button → each
  has its own subject and the right page (KYC → /kyc, payout → /earnings, profile approved → /profile …). Subjects
  without emoji (admin "💸 Payout request waiting" kept — a test pins it).
- **Support reply sent 2 emails** → one, and its button opens that ticket (/support/tickets/<id>).
- **No admin email per sign-up** (it used the daily email limit OTP codes need). The admin bell notice stays.
- **Waitlist approval** (single + bulk): "Riya, brands in Fashion are waiting. Claim your Ybex profile." — niche from
  the application, Instagram / followers / avg views, button to sign-up with the e-mail already filled in, 3 next
  steps. Reject email: "Your Ybex application: what to fix before you apply again". CSV-imported rows still get no
  email (session 36 rule). Bulk approve waits 550 ms between emails (`BULK_EMAIL_GAP_MS`) — Resend takes ~2 a second.
- **Pitch email**: button used `url` (dead) and the old /auth/register; fallback domain was ybex.club → fixed;
  "<Brand> wants to pay you ₹… for a collab"; typed text escaped.
- Onboarding reminders and UGC deadline emails: new subjects (no emoji, the point first).

## Not changed
Sender addresses; locked files (campaign invite subject, signing email, payment / UGC refund emails keep their text —
they get the new look through the builder); Diwali emails (none in code).
New test: backend/v373Emails.test.ts.

## v374 (same zip) — New tagline (text only)
- Main line **"Influence, without the middleman."** · creators **"Create. Get found. Get paid."** · descriptor
  **"India's 0% fee creator marketplace."**
- Where: page title (index.html + Landing.jsx runtime title, keeps "India's creator marketplace" for search), meta /
  og / twitter title + description, og:image:alt, PWA name + description (short_name stays "Ybex"), landing hero
  heading + line (mobile + desktop, same 3-line spans, no animation change), the "I'm a creator" heading, email footer.
- The OG share picture itself is an image — make a new one if it shows old text.

## v374 (same zip) — Waitlist: live on top, filters, smarter Instagram fetch, sign-up password eye
- **Order** (creators tab): pending + Instagram live (most followers first) → pending not fetched → pending private /
  failed → approved → rejected. Approving moves the row down at once.
- **Filters**: new "Instagram" (live / private-failed / not fetched, with counts) and "Contact" (username only / has
  email / has mobile) next to Status, Platform and Category; all combine.
- **Fetch Instagram for everyone** now fetches only usernames never fetched before (pending waitlist first). Tick
  "Also refresh ones fetched 7+ days ago" for a full refresh.
- **Hourly budget kept for sign-ups**: bulk fetch and auto refresh use at most 100 of the 180 calls an hour
  (`IG_SIGNUP_RESERVE`, default 80 kept) and stop when Meta's usage header says 70 %. So onboarding lookups don't get
  "Instagram is busy" because of a bulk run.
- **Auto refresh** (new usernames first — e.g. sign-ups whose lookup was busy — then anyone fetched 7+ days ago):
  `POST /api/internal/cron/instagram-refresh`, header `x-cron-secret: <CRON_SECRET>`. **Ravi: add a Cloud Scheduler
  job** (Google Cloud → Cloud Scheduler → Create job → every hour `0 * * * *`, Asia/Kolkata → Target HTTP, POST, the
  URL above on the live domain, header `x-cron-secret` = the CRON_SECRET value). Same as the onboarding-reminders job.
- Sign-up password ("Create a password") has the show / hide eye like the login one.
New test: backend/v374Waitlist.test.ts.

# v375 — Search title, brand onboarding "Instagram first", brand names in Admin (23 Oct 2026)
Contains everything up to v374, including the Android fixes (live-update checksum, push crash guard, adaptive icon files).

## Database (applied live 23 Oct, Ravi's OK in chat)
- `alter table brand_profiles add column if not exists instagram_handle text;` (migration
  `v375_brand_instagram_handle`, additive — old code ignores it). Back-filled from onboarding answers (1 brand: Ghost).

## 1. Google title + description
- Title (index.html `<title>`, og:title, twitter:title, landing runtime title):
  **"Ybex | Find Influencers & Get Brand Deals — 0% Fee"**.
- Description (meta / og / twitter): "Brands hire verified Instagram creators directly, creators get paid brand deals.
  India's 0% fee creator marketplace." ("Influence, without the middleman." stays only as the landing hero line.)

## 2. Brand onboarding step 1 — Instagram first (Ravi's design, on ONE page)
- "What's your brand's Instagram?" + one box. The answer shows right under it:
  - found → **"Is this your brand?"** card (photo, name, @handle · followers, bio, last posts) →
    **Yes, that's us** / **Not us, change username** (clears the box);
  - Instagram busy / no answer in 4 s → one small line "Instagram is busy right now. Tap Continue and add your logo and
    name yourself" + **Continue**; retries by itself **once** after 12 s, then a "Try again" link;
  - private / personal / typo → calm line + **Continue without Instagram**;
  - **No Instagram? Set up manually** always works; Instagram fetch switched off → Find my brand goes straight on.
- Details page: logo, company name, agency (+ website only when Instagram gave one). Pre-filled after "Yes, that's us"
  (logo = our stored copy, name only if empty); typed by hand otherwise, as before. No background job for brands.
- The brand's Instagram **username is saved** in `brand_profiles.instagram_handle` (`backend/auth_routes.ts`,
  `brandIgHandle`; a DB without the column still saves the rest).
- The 4 brands stuck on the old step 1 (Deepak Kumar, DEEPAK SHARMA, Ankit tomar, Synkraft) never typed a company name —
  this screen no longer blocks them.
- IgHandleField: new optional props quiet / onResult / fetchSignal / onConfig / autoFocus (other screens unchanged).
- Desktop brand onboarding unchanged.

## 3. Admin → Users → Brands shows the brand's name
- Brand rows show the company name, the person who signed up underneath ("by Ravi"). Not finished setup → the name
  typed in onboarding (from onboarding_progress) or the person's name + a "Setup not finished" tag. Search finds company
  names. (`backend/admin_users_enforcement_routes.ts` → `brand_setup`, `src/components/admin/AdminUsersTab.jsx`)

## 4. One secret instead of many: YBEX_ENV
- New `backend/envBundle.ts`, imported FIRST in `server.ts`: a hosting secret **YBEX_ENV** holding a .env-style block
  (`NAME=value` per line, `#` comments) fills every missing setting at start-up. A setting set on its own always wins;
  values are never logged (only the names). Keys stay out of the code / GitHub.
- Ravi got a ready template (YBEX_ENV_template.txt, NOT in the repo) with every setting the server reads: App, Supabase,
  Razorpay, Resend, Google, VAPID, server secrets, Instagram / Meta, Gemini, FCM. VITE_* stay as build settings.

## 5. Payment screen
- **No UPI (Paytm / PhonePe / UPI ID) in the Play Store app's Razorpay sheet**: UPI IS activated on the Razorpay
  live account (Ravi's screenshots) and the website in phone Chrome shows all UPI apps. Inside the Android app the
  checkout runs in a WebView, where Razorpay hides UPI apps unless `webview_intent: true` is set → added to
  `src/lib/razorpay.js` (LOCKED) with Ravi's written OK ("razorpay.js mein webview_intent OK"), logged. Tapping an app
  opens it through a `upi://` link, which the Capacitor app already hands to Android. Reaches the app with the web
  deploy; if UPI still doesn't open in the app, the next Play build (1.0.7) gets a look. "Enter UPI ID" (collect) is
  being phased out by Razorpay/NPCI, so the box may not come back — the UPI apps are the way.
- **Razorpay header**: the real Ybex logo (`public/pwa-512x512.png`, absolute address so it also works in the Android
  app) instead of the "Y" letter box, no "Ybex" text. `src/lib/razorpay.js` (LOCKED) changed with Ravi's written OK,
  logged via `npm run protect:update`. The person icon top-right is Razorpay's own button (can't show the user's name);
  the "Your campaign starts soon!" strip is not in our code — Razorpay Dashboard checkout settings.
- **"You're offline" on the Play app's pay screen while online**: inside the Android app the WebView's online flag is no
  longer trusted for actions — the request is sent, and only a real network failure shows the offline line
  (`src/lib/api.js`). The payment total (`BrandFeeSummary.jsx`) asks again once online / after 4 s and has a Retry link.

## 6. Earnings page stuck on "Your earnings are safe"
- Live logs: every Earnings open → database 400 on `deals?select=*,campaigns(title),transactions(*)`. `deals.campaign_id`
  has no foreign key to `campaigns`, so the join is refused, `/creator/payout-eligible-deals` answered 503 and the page
  showed the retry card to every creator with a brand-approved deal. Fix in `backend/payment_routes.ts` (LOCKED, Ravi's
  written OK "payment_routes.ts earnings fix OK", logged): deals read with `transactions(*)` only, campaign titles
  looked up separately (a missing title never blocks the page). Money logic unchanged. No DB change.

## Play Store
- 1.0.6 (code 7, crash fix + Ybex icon) sent for review in Closed testing on 23 Oct (built from this code).
- `mac-prepare-android.sh` still says 1.0.4 / code 5 (a test pins it); the next Mac build must use 1.0.7 / code 8+.

New tests: backend/v375BrandIgFirst.test.ts (real page render, fake network), backend/v375EnvBundle.test.ts,
backend/v375PayFixes.test.ts.
`npm run verify`: 248 test files / 2420 pass, 0 fail (tsc + crash guard OK).

## Needs Ravi
1. Optional: Razorpay Dashboard → remove the "Your campaign starts soon!" checkout strip.
2. Optional: AI Studio → Secrets → YBEX_ENV = the filled template (the separate secrets can stay too).
3. Deploy v375.
4. After deploy: open the Android app twice → new screens; testers log in once after the 1.0.6 update.

## Next chat — start here (23 Oct night)
- **Live:** v375 deployed by Ravi (23 Oct). Last zip: `ybex-v375.zip` (folder inside: `ybex-v375`).
- **Play Store (Closed testing / Alpha):** 1.0.4 (code 5) crashed · 1.0.5 (code 6) crash fix · **1.0.6 (code 7)** icon +
  crash fix, sent for review 23 Oct. 12 testers opted in → production apply possible about **4 Nov**.
  Account "Melting Eve Studios", app id 4975973704419362721.
- **Next Android build must be 1.0.7 / code 8 or higher.** Signing key = the one in Ravi's "Ybex - Google Play package"
  zip (alias `my-key-alias`) — never put it in the code zip. minSdk 24, target 36. Web changes reach the app by itself
  (OTA, open the app twice); a new AAB is only needed for native changes.
- **Push in the Android app is off** (`ANDROID_FCM_READY=false`) until Firebase + `google-services.json` exist.
- **Check after deploy:** UPI apps inside the Play app's Razorpay sheet (`webview_intent`); Earnings page opens for
  creators with approved deals.

# v376 — Live test of ybexmedia.in as a real user (24 Oct 2026)
Deploy **v376** only (contains everything up to v375). **No database change.** Tested on the live site in a browser
(phone 375px + desktop 1366px): landing, /offer, sign-up (role → email → new-account form, stopped before creating),
desktop sign-in, Campaigns, Explore creators, a public creator profile, Blog, Help, Terms, Privacy, Refunds,
Delete account, Apply, UGC orders, 404, robots.txt, sitemap.xml, the public APIs.

## Fixed in code
1. **Google saw the wrong domain**: robots.txt, sitemap.xml and every blog canonical said `https://ybexapp.ai.studio`
   (APP_URL). `backend/blogSeo.ts` → `siteUrlFor`: SITE_URL first; an *.ai.studio / *.run.app APP_URL is never the
   public site → `https://ybexmedia.in`.
2. **Header "Sign In" / "Get Ybex" wrapped onto two lines** on 375px phones (Campaigns, Explore, Blog, profiles):
   `whitespace-nowrap` (`Layout.jsx`).
3. **Public creator profile → "Sign in to collaborate"** lost the creator: now `/login?role=brand&next=/creator/<id>`.
4. /offer screen-reader line read a raw ISO date → "15 Nov, 11:59 PM (IST)".
Version label v376. Test: `backend/v376SiteUrl.test.ts` (in dev/tests.tgz). `npm run verify`: 248 files / 2420 pass.

## Needs Ravi (not code)
1. 🔴 **DEMO_LOGIN is ON on the live server** (`/api/auth/demo-enabled` → true, "Demo access (test server)" link on
   the sign-in page). With it on, the token `dev_bypass_admin` is a Super Admin with no password. AI Studio →
   Secrets (and inside YBEX_ENV if pasted there): remove DEMO_LOGIN or set it to `false`. Also check
   PAYMENTS_TEST_MODE is `false` and OTP_ECHO / DEMO_SEED are empty (local.env has the Mac test values — never paste it).
2. Optional: SITE_URL = `https://ybexmedia.in` (same result as fix 1).
3. index.html og:image / og:url still say ybexapp.ai.studio (a test pins it — say OK to change).
4. Landing claims to check: testimonials from boAt / Noise / Nykaa with numbers, "All reviews are from active creators
   and brands registered on Ybex", "Available on the Play Store and the App Store" (both buttons open /signup), brand
   logos (Titan, cult.fit, Fevicol, Beardo…) on sign-in / apply pages. Keep only what is true.
5. Landing / Terms say ₹0 fee for brands while checkout adds the Admin brand fee (8% unless changed) — set it to 0 in
   Admin → Fees or show it.
6. 0 live campaigns and 0 UGC briefs right now — "Live Campaigns" link shows an empty page to ad traffic.
7. Challenge results date is 16 Nov 00:00 (1 second after close) — fine if winners are marked fast, else move it.

## v376 (same zip) — Easy sign-up + demo login off on live (24 Oct 2026)
Ravi: "ads se 111 log signup page pe aaye, sirf 3 ne account banaya — signup easy karo". No database change
(checked live: users.phone is `+91XXXXXXXXXX`, no unique index → the code looks the number up first).

1. **Sign-up screen** (`src/pages/app/AppContinue.jsx`): big **Continue with Google** on top → "or" → creators:
   **Instagram username + mobile → "Get OTP on SMS"** → 6-digit code → done. "Use email instead" below.
   Inside the Instagram / Facebook app browser (where ads open) Google is refused by Google: Android opens the page
   in Chrome, iPhone shows "tap ⋯ → Open in browser" and the mobile option.
2. **Mobile + SMS code** (`backend/auth_routes.ts` → /auth/phone/config|send|verify, `backend/smsOtp.ts`): new account
   with a never-mailed `phone-91XXXXXXXXXX@ybex.io` email, no password, name = @instagram; same number later = log
   in; a waitlist "unclaimed" profile with that number is claimed; admin / banned / other-side refused. Codes in
   ybex_ephemeral (10 min, 3 SMS / 15 min per number, 10 per IP). **Hidden until an SMS key is set** (see Needs Ravi).
3. **No password at sign-up**: a new email gets the code at once (no name / mobile / password form). Password later
   in Settings → Account → Password (already there, emailed code).
4. **Creators skip onboarding**: after any sign-in a creator lands on Home (same switch as "Finish later");
   "Complete your profile" on Home brings them back. The Instagram username from sign-up pre-fills onboarding and the
   challenge username box. Brands still go to brand onboarding (company details).
5. **Offer page → sign-up → back to /challenge?joined=1** with an "Add your reel" card on top (new creators who
   opened /offer or /challenge on that phone in the last 3 days). Logged-in creators' button says "Add your reel".
6. **Meta CompleteRegistration** fires the moment the account is made (email code, SMS code, Google / Apple), once per
   account (`src/lib/signupSource.js` → `trackRegistration`); the old one-hour check stays as a fallback.
7. **Demo login / OTP echo can't be on on the live server** (`backend/liveServer.ts`): live Razorpay key, or
   APP_URL / SITE_URL = ybexmedia.in / ybexapp.ai.studio → DEMO_LOGIN and OTP echo are off whatever the secrets say.
Tests: `backend/v376EasySignup.test.ts` (phone sign-up over HTTP with a fake SMS provider). Old tests that pinned
"password required at sign-up" (v291 / v370 / v374) updated to Ravi's new rule. `npm run verify`: 250 files, 2435 pass.

### Needs Ravi
1. Deploy v376.
2. **SMS for the mobile option** — pick one, put the key in AI Studio → Secrets (or YBEX_ENV), redeploy:
   - Fast2SMS (fastest): fast2sms.com → sign up → recharge (₹100+) → Dev API → copy key → `FAST2SMS_API_KEY`.
     The OTP route needs "website verification" once in their dashboard (ybexmedia.in).
   - or MSG91: `MSG91_AUTH_KEY` + `MSG91_OTP_TEMPLATE_ID` (needs a DLT-approved OTP template).
   Until then the screen shows Google + email (no password) — already much shorter.
3. Still remove DEMO_LOGIN from the secrets (the code now blocks it on live anyway) and check PAYMENTS_TEST_MODE=false.

## v376 (same zip) — Creators join on ONE screen, no code / no password; one YBEX_ENV secret (24 Oct 2026)
Ravi: "Join Now pe sirf ek screen … saare creators ke liye, brands ka purana". No database change.
- **Creator sign-up screen** (`AppContinue.jsx`, creator side): big Continue with Google → or → **Instagram username +
  Email + WhatsApp number → "Join Ybex"** → in straight away (POST `/auth/quick-join`: account + session, no password,
  email `verified=false`). "Already on Ybex? Log in" opens the usual email-code / password login. An email that already
  has an account is NEVER opened without proof: the app moves to the email-code (or password) login; a waitlist /
  unfinished email gets the 6-digit code. Brands: unchanged email-code sign-up (v376 part 2).
- **Email confirmed later by a link**: "Confirm your email for Ybex" (signed link → `GET /api/auth/verify-link` →
  verified, opens /dashboard). Until then a password login is refused (old rule) and full onboarding asks the email code.
- **Google / Apple sign-up**: new creators see "One last step" (`/app/details`, `AppQuickDetails.jsx`): Instagram +
  WhatsApp → `POST /auth/quick-profile` → Home (or the challenge). "Skip for now" below.
- **Instagram numbers fetched at once** (followers / reach / photo, same as the waitlist — `/creator/instagram/lookup`
  on the new profile row). Needs IG_GRAPH_TOKEN working (renew it — v372 note); if not, the profile just has the username.
- Offer-page creators → `/challenge?joined=1` ("Add your reel"); everyone else → Home with "Complete your profile";
  the onboarding reminder emails (1 and 3 days) already run from Cloud Scheduler. Pixel CompleteRegistration on join.
- **One secret**: `.env.example` (what AI Studio asks for) now lists only `YBEX_ENV` (+ GEMINI_API_KEY, which AI Studio
  gives). Full fill-in list: `docs/setup/YBEX_ENV_template.txt` (Supabase, Razorpay, Google client id + secret,
  Cloudflare PROXY_SHARED_SECRET, VAPID, Resend, Instagram, Firebase, Apple, …). The website build also reads its
  VITE_* lines from YBEX_ENV (`vite.config.js`).
Tests: + creators' join over HTTP in `backend/v376EasySignup.test.ts`. `npm run verify`: 250 files / 2440 pass.

### Needs Ravi (replaces the list above)
1. AI Studio → Secrets → `YBEX_ENV` = `docs/setup/YBEX_ENV_template.txt` with your values (copy them from the old
   separate secrets once). Remove `DEMO_LOGIN`. Then deploy v376.
2. After deploy: open ybexmedia.in/offer on a phone → Join → fill the 3 boxes → you should land on the challenge page.
3. Renew IG_GRAPH_TOKEN (Instagram numbers on sign-up need it).

## v376 (same zip) — FINAL creator join: email code first, then Instagram + WhatsApp; offer page tweaks (24 Oct 2026)
Ravi: "account bina email verify ke mat banao … email daalte hi neeche OTP khule, verify ke baad username + mobile, phir
dashboard. Google ke baad username + WhatsApp zaroor poocho." This REPLACES the "no code" join above.
- Creator screen: Continue with Google on top → or → **email → Continue → the 6-digit code box opens under the email**
  (email locks, "Change") → code right → "✓ Verified" → **Instagram username + WhatsApp open under it** → **Join Ybex**
  → account made (verified) → Home / challenge. `POST /auth/join/send-code`, `/auth/join/verify-code` (30-min signed
  proof), `/auth/quick-join` (refuses without the proof). No account exists until the last step. Existing email →
  normal login (password slides open / email code). Waitlist email → claimed after the code.
- Google: "One last step" (Instagram + WhatsApp) is REQUIRED now (no skip).
- Offer page: "Reel ideas" section removed. Admin → Sponsors & prizes: scripts can be saved with NO name / logo
  (they show as "Reel scripts" / under the brand scripts without a brand line; `config.scripts`). Small line at the top of
  the scripts: "✨ Or make your own reel about Ybex, your way. If it's good, it can win too." (above "T&C Apply*").
  Tip: the sponsor you named "T&C Apply*" can now have an empty name.
`npm run verify`: 250 files / 2441 pass.

### v376 last change (Ravi's screenshot): join screen layout
Email + Instagram username + WhatsApp are all on the screen from the start. The email code goes out BY ITSELF (when the
email box is left, or 1.5 s after typing stops). ONE simple code box drops down under the email (like the password box,
with "Resend" inside it); the right code folds it back up and the email shows "✓ Verified". Then "Join Ybex".

---

# v377 — Emails: Ravi's approved round-3 look (24 Oct 2026)
Deploy **v377** only (contains v376). No database change. Sender stays `noreply@ybexmedia.in` (verified on Resend).
- `buildEmailHtml` (backend/helpers.ts, same arguments): **lighter purple band** (#5B21B6 → #7C3AED → #A78BFA — reads
  well when Gmail turns on dark mode), darker footer text (#4F4966), footer links Help · Privacy · **ybexmedia.in**.
- New optional `hero` argument: Ybex's own creator illustrations in a **purple duotone** (made from the Diwali design
  files) — `backend/emailArt.ts`, served as PNG at `GET /api/email-art/<group|phone|camera|laptop|duo>.png`
  (30-day cache; mail apps block data: images). One new file only (998 files).
- Pictures **only on happy emails**: waitlist "Claim your profile" (group), profile approved (phone), campaign live
  (duo). Money, payouts, refunds, deadlines, rejections, codes keep the small icon so the amount / date is at the top.
- Kept as Ravi decided in v374: the personal welcome email, the sender, and no Diwali Challenge emails in code.
Tests: `backend/v377EmailLook.test.ts` (band, footer, hero vs icon, which notices get a picture, the PNG route).
After deploy: open https://ybexmedia.in/api/email-art/phone.png — the picture should show.
