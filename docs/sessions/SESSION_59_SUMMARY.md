# Session 59 — v337
(Before this: docs/sessions/SESSION_58_SUMMARY.md = v309 → v336.)

## 1. App server address = ybexapp.ai.studio (Ravi: "ye kr do")
Why: v335/v336 sent the iPhone app and its live update to https://ybexmedia.in, which doesn't serve the app yet
(AI Studio free hosting can only take a custom domain through Cloud Run + billing) → login / data / updates would fail.
- `src/lib/native.js`: DEFAULT_ORIGIN `https://ybexapp.ai.studio`; only `VITE_API_ORIGIN` changes it (the old
  fallback to VITE_PUBLIC_SITE_URL is gone — that's the share-link address and could name a dead domain).
- At start the app calls `CapacitorUpdater.setUpdateUrl(<API_ORIGIN>/api/app/ios-update)`; config has
  `allowModifyUrl` + `persistModifyUrl`. So later moving to ybexmedia.in = set VITE_API_ORIGIN (or one line) and
  deploy → iPhones move by live update, update check follows. **No App Store release needed.** Keep ai.studio alive a
  few weeks for phones that haven't opened the app.
- `ios-app/capacitor.config.json`: updateUrl ai.studio; allowNavigation ai.studio + ybexmedia.in (+ razorpay).
  `ios-app/package.json` web build default ai.studio. README updated.
- Android (Play/TWA): host stays ybexapp.ai.studio (no change). Moving Android to the new domain later = one Play
  update (new APK with new host + assetlinks) — any time, not urgent.
- `.env.example` / docs/setup/ENV_KEYS.md: APP_URL / SITE_URL / VITE_PUBLIC_SITE_URL = ai.studio until the domain
  opens the app (emails, Google sign-in return, share links would otherwise point at a dead address). New keys:
  VITE_API_ORIGIN (optional), PROXY_SHARED_SECRET.
- CORS already allowed ybexapp.ai.studio + capacitor://localhost — no change.

## 2. ybexmedia.in via Cloudflare (free jugad) — Ravi does the clicks
- Guide (Hinglish, step-by-step): `docs/setup/DOMAIN_CLOUDFLARE.md` — Cloudflare free account → check / copy email
  (Resend MX/TXT) records → GoDaddy nameservers → secret → Worker → custom domains → test → switch APP_URL etc. + Google
  redirect URI.
- Worker code: `cloudflare/ybex-proxy-worker.js` — forwards everything to ybexapp.ai.studio (websocket too),
  www → apex, rewrites ai.studio redirects, sends visitor IP + PROXY_SHARED_SECRET.
- Server: new `backend/domainProxy.ts` (first middleware in backend/server.ts). Only with the right secret (20+ chars)
  the visitor's real IP is appended to X-Forwarded-For, so the existing login / OTP rate limits see each person
  (otherwise everyone behind the Worker shares one IP and one lock). Wrong / missing secret → headers dropped.
- Cost: ₹0 up to 1,00,000 requests/day; then Workers Paid $5/mo or own hosting (Hostinger VPS KVM 1 ≈ ₹599–999/mo).

## 3. Block a user (Apple 1.2) — DB change OK'd ("hn kr do")
- Live migration `session59_blocked_users` (scripts/sql/session59_blocked_users.sql): `blocked_users`
  (blocker_id, blocked_id, created_at; pk both; blocker ≠ blocked; index on blocked_id), RLS on, no policies (server only).
  docs/database/PENDING_DB_CHANGES.md marked DONE.
- `backend/blockUsers.ts` (not locked), registered before chat / creators / campaign routes:
  `GET /blocks`, `GET|POST|DELETE /users/:id/block`. Brand team members block for the parent brand. Admins can't be
  blocked. Each block also writes a `reports` row (`target_type user_block`, optional reason) → Admin → System reports.
- Both directions: chat send → 403 BLOCKED ("You blocked X. Unblock them from their profile…" / blocked side just
  "You can't send messages in this chat."); brand invite → refused; creator apply → refused.
- Lists filtered on the way out (locked handlers untouched): inbox hides blocked chats — a chat with payment already
  held stays (marked `blocked`) so the deal can finish, messages stay off; creator invitations; campaign applicants.
- UI: new `src/components/safety/BlockUserButton.jsx` — "Block" next to "Report this profile" on public creator and
  brand pages, "Block <name>" in the chat ☰ menu (BurgerMenuSupport.jsx, not locked; all API calls in the new
  component, so screen call groups unchanged), confirm sheet with what happens + optional reason, Unblock toggle.
  `BlockedPeopleList` under every Help & support card (phone Help screens, desktop settings, /help when logged in).
  Report sheet now points to Block. docs/setup/APP_STORE_CHECKLIST.md Part D updated (reviewer note).
- Not filtered (small, later if wanted): /chat/v2/threads/count badge, Explore lists, notifications already sent.

## 4. Files organised + clean-up (Ravi: "kachre ko saaf kro")
- Root now: README.md (folder map), AGENTS.md + GEMINI.md (AI agent rules — must stay in root), config files.
- `docs/` (index `docs/README.md`): `setup/` (ENV_KEYS, DOMAIN_CLOUDFLARE, APP_STORE_CHECKLIST, OFFLINE_AND_APP_STORE),
  `code/` (CODE_MAP, ARCHITECTURE, PROTECTED_CHANGES, CONTRIBUTING, UNIQUE_FEATURES), `database/` (PENDING_DB_CHANGES +
  all Supabase prompts), `sessions/` (58, 59) + `sessions/archive/` (21–57; merged into one file in v338), `archive/` (old brand mobile audit).
- All references updated (code comments, tests, scripts/protectedFlows.mjs now logs to docs/code/PROTECTED_CHANGES.md).
  Test path pins moved (requirement change): loadingStates, session49, session43V290Invite. Locked files untouched
  (one comment rewrite in directInvites.ts was put back).
- Deleted: 7 unused code files (nothing imported them: backend/services/deliveredMetrics.ts, TrustBadge, ActivityFeed,
  PaymentMethodCard, shared/GeminiIcon, lib/typography.ts, platformTools/ReferralSettingsCard), empty bun.lock,
  docs/eva_part1_preview.jpg, empty docs/prompts/.
- Kept on purpose: db_mock.json (server's local fallback DB), metadata.json + firebase-applet-config.json + .aistudio/
  (AI Studio platform files), scripts/sql history.
- Zip folder is now `ybex-v337` (was still named ybex-v296).

## Tests
New `backend/v337BlocksDomain.test.ts` (10 pass). Full suite (bun, no npm here): 795 pass; the failures are the same
106 as the v336 baseline in this environment (missing packages), 0 new. protectedFlows 9/9. Every changed file compiles;
whole web app bundles (only the usual /landing/fonts URL notes). npm still blocked → run `npm run verify` + `npm run build`
once on the deploy machine.

## Needs Ravi
- Deploy v337, then follow docs/setup/DOMAIN_CLOUDFLARE.md (secret in BOTH AI Studio + Worker).
- Hosting secrets: keep APP_URL / SITE_URL / VITE_PUBLIC_SITE_URL = https://ybexapp.ai.studio until ybexmedia.in opens the app.
- APNs .p8 key + Key ID + Team ID on the server; Mac iPhone build (ios-app/README.md).
- Test Block: block from a profile and from the chat menu, try messaging / inviting / applying from both accounts,
  check Help → Blocked people → Unblock, check Admin → System reports shows the block.

---
# v338 (same session) — AI Studio GitHub import: "1000 files imported, 130 skipped"
AI Studio imports at most 1,000 files from GitHub; v337 had 1,133, so 130+ files were silently missing (broken deploy).
- All 187 test files packed into ONE file `dev/tests.tgz` (same paths inside). `npm run tests:unpack` puts them back,
  `npm run tests:pack` packs them again and removes the loose copies; `npm run verify` / `protect:check` unpack first.
  Loose `*.test.*` / `*.spec.*` are in .gitignore. New `scripts/tests-archive.mjs`. AGENTS.md + GEMINI.md explain it.
- Old summaries 21–57 merged into `docs/sessions/SESSIONS_21_to_57.md` (text unchanged); session49 test pin moved
  (requirement change, commented).
- Repo now **913 files** (87 under the limit). No app code changed.
- Tests: unpacked → bun suite 796 pass / same 106 environment failures as before, 0 new; packed again.
- Ravi: the GitHub repo must be REPLACED (old files deleted), not uploaded on top — otherwise the old test files stay
  and the count is still over 1,000. Keep new files under ~950 in future (big file sets → one archive).

---
# v339 (same session) — no app code change; notes from the deploy / Mac / APK / teaser work
Deploy (AI Studio secrets) — what Ravi fills now:
- Required: SUPABASE_URL + VITE_SUPABASE_URL (https://mzcovvzkwzjvzskjqwwy.supabase.co), SUPABASE_ANON_KEY + VITE_SUPABASE_ANON_KEY
  (legacy anon JWT), SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY, ADMIN_EMAIL / ADMIN_ALERT_EMAIL, RAZORPAY_KEY_ID /
  _KEY_SECRET / _WEBHOOK_SECRET, GOOGLE_CLIENT_ID / _SECRET, VAPID pair (keep old values if they already exist),
  APP_URL / SITE_URL / VITE_PUBLIC_SITE_URL = https://ybexapp.ai.studio, PAYMENTS_TEST_MODE=false, OTP_ECHO=off, NODE_ENV=production.
- Must stay EMPTY: DEMO_LOGIN, DEMO_SEED, SEO_NOINDEX, YBEX_SYNC_BLOB, RESEND_ALLOW_FALLBACK, IOS_OTA_OFF, IOS_OTA_MIN_BUILD,
  VITE_API_ORIGIN, CORS_ORIGINS, ADMIN_QUICK_PIN.
- Later: SESSION/OAUTH_STATE/MEDIA_KEY/EMAIL_LINK/CRON secrets (code falls back to the service key), PROXY_SHARED_SECRET
  (Cloudflare step), APNS_* + APPLE_CLIENT_ID (iPhone), VITE_PLAY_STORE_URL (after Play is live), WhatsApp, limits.
Razorpay webhook (Live mode): URL https://ybexapp.ai.studio/api/payments/razorpay/webhook, own secret (= RAZORPAY_WEBHOOK_SECRET),
  events payment.captured + order.paid only (the server reads just these two).
GitHub → AI Studio: replace the repo with v338/v339 (delete old files) — the 1,000-file import limit.
Mac (linked): Xcode is NOT installed → iPhone build waits. Ravi installs Xcode from the App Store (~15 GB), then double-clicks
  Desktop/Ybex-Mac-Check.command (read-only check → Desktop/ybex-mac-check.txt). Claude can't type in Terminal/Xcode (click only),
  so setup will be double-click .command files + Ravi's Apple ID steps. APNs .p8 key: developer.apple.com → Keys.
Android APK: not live on Play yet → new signing key is fine. Plan: PWABuilder (Ravi in Chrome; the built-in browser blocked it):
  package com.ybex.app, host ybexapp.ai.studio, start /app, version 1.0.2 / code 3, colours #7E00DC, new key. Then send the zip →
  Claude puts the new SHA-256 into public/.well-known/assetlinks.json (+ Play App Signing fingerprint after upload).
  Keep signing.keystore + signing-key-info.txt safe (Drive + pen drive). Plain-purple Android 12 splash needs a Bubblewrap build.
Teaser video (separate file: ybex-teaser-kit.zip — not inside the app repo):
- Final: Ybex_ComingSoon_16x9_v4.mp4, 20 s, 1080p, no sound. Light lavender + purple glows, Eva part mint/lime, fast kinetic
  text (Zelios-style reference), straight iPhone mockup (Ravi's), screens rebuilt from the real app UI (brand home, creator home,
  Eva chat, deal chat offer → signed, Review & pay → success), Instagram/YouTube/Facebook tiles, Razorpay at payment, original
  ₹ notes, ends on iPhone home screen (Ybex icon shine) + "Coming soon." + App Store / Google Play badges.
- Logo = real app icon (white "Ybex." incl. white dot — no lime on the logo). Lime only for Eva.
- Not done: Reel 9:16 render, sound/voiceover (Ravi adds in CapCut or sends SFX/music to sync), separate longer intro video.

---
# v340 (same session) — Android package from PWABuilder
- PWABuilder (Google Play): package com.ybex.app, host ybexapp.ai.studio, start /app, version 1.0.2 / code 3, all colours
  #7E00DC, NEW signing key (alias my-key-alias, CN Ybex Admin, C=IN). Report: 0 errors.
- `public/.well-known/assetlinks.json`: old fingerprint (14:6D:…:18:A9) replaced with the new key
  32:66:47:E9:44:3A:74:13:9F:41:D9:8A:72:0E:4C:52:89:9D:EE:B2:70:BC:36:44:FC:14:F2:32:45:E6:C6:41 (checked against the APK cert).
- After the first AAB upload, add Play Console → App integrity → App signing key SHA-256 as a 2nd fingerprint
  (Play re-signs installs from the store; without it the app shows a browser bar).
- signing.keystore + signing-key-info.txt are NOT in the repo — Ravi keeps them (Drive + pen drive).
- No app code change.

---
# v341 (same session) — Google Play: app created, all forms done, closed test sent for review
App code: no change. Only `public/.well-known/assetlinks.json` + this summary changed.

## assetlinks.json (needs deploy)
Both SHA-256 fingerprints for com.ybex.app:
- Play App Signing key (installs from Play): 65:B7:E6:F3:7C:02:0F:E5:BA:ED:AA:7E:C1:21:8F:FA:DE:5F:92:AC:38:09:5F:E1:DB:48:2D:17:A7:DB:1B:FA
- Upload key (PWABuilder, signing.keystore): 32:66:47:E9:44:3A:74:13:9F:41:D9:8A:72:0E:4C:52:89:9D:EE:B2:70:BC:36:44:FC:14:F2:32:45:E6:C6:41
Live site still had only the upload key on Oct 17 → deploy v341, else the Play-installed app shows a browser bar.

## Android package (PWABuilder)
com.ybex.app, host ybexapp.ai.studio, start /app, version 1.0.2 / code 3, colours #7E00DC, new key (alias my-key-alias,
CN Ybex Admin, C=IN). Ravi keeps signing.keystore + signing-key-info.txt (NOT in repo). Next update = version code 4+.

## Play Console
- Account: "Melting Eve Studios" (personal, same as Gutargoo+), Chrome profile u/1. App "Ybex", Free, App.
- Internal testing: release 3 (1.0.2) live, no testers.
- Closed testing - Alpha: release 3 (1.0.2), India only, email list "Ybex testers" (15 Gmail IDs), feedback admin@ybexmedia.in.
  SENT FOR REVIEW 17 Oct 2026 (14 changes, managed publishing OFF → goes live to testers as soon as approved).
- Personal account rule: 12+ testers opted-in for 14 days in a row → then "Apply for production" on the Dashboard.
- App content (all done): privacy policy https://ybexapp.ai.studio/privacy-policy; Ads No; Sign-in details = 2 reviewer
  accounts (review.creator@ / review.brand@ybexmedia.in, password login, no OTP — password with Ravi); Content rating:
  All other app types, UGC + chat + block + report Yes, cash rewards Yes (referral UPI cash), wagering No → mostly 18+;
  Target audience 18+; Data safety per docs/setup/APP_STORE_CHECKLIST.md (16 types, encrypted, delete URL
  https://ybexapp.ai.studio/delete-account); Advertising ID No (AAB has no AD_ID permission); Government No; Financial
  features "none" (Razorpay handles money — change if CA says otherwise); Health none.
- Store listing: name Ybex; short "Brands & creators: campaigns, UGC, chat and safe payments in one app"; full description
  (brands / creators / Eva / safety / 18+); icon = pwa-maskable-512; feature graphic 1024x500 (labelled AI-made);
  8 phone screenshots 1080x1920 (Claude Design, real app screens, Android frame, fictional brand "Nova Tech"; not AI-labelled);
  category Business; contact admin@ybexmedia.in, website https://ybexapp.ai.studio.
- Store assets are in the separate zip ybex-play-store-assets.zip (not in the repo — file limit).

## Server secrets (AI Studio)
Filled Oct 17: ADMIN_ALERT_EMAIL, SESSION/OAUTH_STATE/MEDIA_KEY/EMAIL_LINK/CRON secrets (new random values, Ravi has them).
Pending: RAZORPAY_WEBHOOK_SECRET (after Live webhook), PROXY_SHARED_SECRET (with Cloudflare, same value in Worker + AI Studio).
Must stay empty: DEMO_LOGIN, DEMO_SEED, SEO_NOINDEX, YBEX_SYNC_BLOB, RESEND_ALLOW_FALLBACK, IOS_OTA_OFF, IOS_OTA_MIN_BUILD,
VITE_API_ORIGIN, CORS_ORIGINS, ADMIN_QUICK_PIN.

## Cloudflare (ybexmedia.in) — not started
Ravi: Cloudflare account (admin@ybexmedia.in) → add ybexmedia.in (Free) → send DNS screenshot (keep Resend MX/TXT!) →
GoDaddy nameservers. Then Worker (cloudflare/ybex-proxy-worker.js) + custom domains — docs/setup/DOMAIN_CLOUDFLARE.md.
Claude in Chrome can't drive dash.cloudflare.com or claude.ai pages (extension blocked there).

## Next
1. Deploy v341 (replace GitHub repo, then Republish) + PROXY_SHARED_SECRET when Cloudflare is ready.
2. When closed test is approved: copy the opt-in link (Closed testing → Testers → "How testers join") → send to all 15.
3. After 14 days with 12+ testers: Dashboard → Apply for production (answers about the test) → production release.
4. Later: VITE_PLAY_STORE_URL after Play is live; Razorpay Live webhook secret; iPhone build (Xcode, APNs).

---
# v342 (Session 60, 18 Oct 2026) — Cloudflare done + landing fixes
## Cloudflare (ybexmedia.in) — Cloudflare side DONE (Ravi + Cloudflare's own dashboard agent)
- Account: Google login ravimarketing.com@gmail.com. Zone ybexmedia.in, Free plan.
  Nameservers: hunts.ns.cloudflare.com + tori.ns.cloudflare.com — Ravi changed them in GoDaddy on 18 Oct.
- DNS (15 records, all DNS only / grey): Google MX ×5, SPF on @ + `dc-aa8e722993._spfm` TXT (GoDaddy SPF macro, was
  missing from the quick scan — added), 2 google-site-verification, zoho-verification, resend._domainkey,
  google._domainkey, _dmarc, Resend `send` MX + TXT. Deleted: GoDaddy parking A ×2 (15.197.148.33 / 3.33.130.190),
  www CNAME, _domainconnect CNAME.
- Worker `ybex-proxy` = cloudflare/ybex-proxy-worker.js; custom domains ybexmedia.in + www.ybexmedia.in;
  secret PROXY_SHARED_SECRET set in the Worker (NEW value, Ravi has it — use THIS one in AI Studio, not the older one).
- Still to do: PROXY_SHARED_SECRET in AI Studio (with the v342 deploy) → wait for "active" → test /api/health, /app,
  www redirect → then DOMAIN_CLOUDFLARE.md step 8 (APP_URL / SITE_URL / VITE_PUBLIC_SITE_URL = https://ybexmedia.in,
  Google OAuth redirect URI).
## Blogs / SEO (Ravi asked)
- Already built in v295 (backend/blogSeo.ts): robots.txt, sitemap.xml, per-post title/description/OG/JSON-LD + text,
  real 404. Advice: write drafts now; publish + Google Search Console (DNS TXT in Cloudflare) + submit sitemap AFTER
  SITE_URL = ybexmedia.in, so Google indexes the final address. SEO_NOINDEX must stay empty.
## Landing page fixes (Ravi: "fat raha hai", screenshots of the Eva tools row and the newspaper)
- Desktop "Ask in plain words. Eva opens the right screen.": the 6 dashed lines to Eva were invisible — the design
  export wrote `<lineargradient>` (lowercase); SVG needs `<linearGradient>`, so `stroke="url(#evaLine)"` painted nothing
  and left a big empty gap. Fixed (LandingDesktopView.jsx).
- Newspaper (desktop + mobile): its headline/columns/stamp looped every 10 s and emptied the page for ~3–4 s each cycle
  ("UGC \" half-typed in Ravi's screenshot). Now it waits (paused at the first frame) until 25 % of it is on screen,
  prints once (~4 s) and then stays complete. 8 keyframes in landingDesktop.css / landingMobile.css end on the full page;
  `.np-wait` pauses until an IntersectionObserver sets `npPlay`.
- Checked against Ravi's design HTML (Ybex_Landing_Desktop/Mobile_offline): all other sections match. Not a bug: the
  "Loved by Creators" reviews section shows only when Admin has reviews (v333 rule — no sample quotes).
- No horizontal overflow at 360–1920 px.
## Tests
New backend/v342LandingFix.test.ts (2 pass); session55Landing + protectedFlows pass; `vite build` OK.
## Deploy note
v342 = v341 (assetlinks) + landing fixes — one deploy covers both. Add PROXY_SHARED_SECRET in the same deploy.

---
# v343 (Session 61, 19 Oct 2026) — UI bug hunt from Ravi's phone screenshots + landing fixes
## Deploy of v342 (done 19 Oct)
- Live: assetlinks.json has BOTH keys (Play 65:B7:… + upload 32:66:…) → Play-installed app opens full screen after
  friends clear app data / reinstall. Site went "Page not found" for a few minutes during the redeploy, then came back.
- Closed test (Alpha) was approved + published 17 Oct. Opt-in links: https://play.google.com/apps/testing/com.ybex.app
  (web, this one opts in) + https://play.google.com/store/apps/details?id=com.ybex.app (install).
## Popups under the bottom bar / page text (brand "Schedule Call" screenshot)
- Root cause: the route wrapper <Page> (App.jsx) faded in with framer-motion; its leftover inline opacity / will-change
  made every page one stacking layer, so popups inside a page (z 9999) stayed UNDER the page footer headline (z 10),
  the bottom nav (z 50) and the Eva bubble. Now the same fade is plain CSS (`.yb-page-in`, fill-mode backwards) →
  nothing stays on the wrapper. Fixes every in-page sheet at once (Explore, campaign detail, UGC explainer…).
- ScheduleCallModal also portals to <body>; its date box no longer runs off the right edge (iPhone). Global CSS: date /
  time inputs min-width 0. Footer headline lost its own z-10.
## Wrong footer copy
- /dashboard is the brand home too → brand now sees "Where Brands Meet Exceptional Creators." (was "Built For Creators.").
- Brand on a creator profile: phone = no footer (the page has its own Save / Invite bar); desktop = "Find Creators Who Fit
  Your Brand." (was "This is how brands see you."). /creators (brand search) copy now talks to brands. /campaigns for a
  brand → brand campaigns copy.
## Creator profile (brand view, phone): the big empty gap under the price list is gone (min-h-screen + pb-32 + pb-28).
## Promo popup ("Meet Ybex Eva" poster)
- Only for signed-in people (it showed on the login screen). Centre card: ✕ now floats above the card's corner instead
  of covering the poster (it hid the "BETA" tag).
## Creators on home screen (Ravi: "kitne bhi select kar sakta hu")
- backend/creatorHomePicks.ts: no "Only 4… Untick one first" limit any more. GET /creators/home-picks returns up to 30.
- NEW public GET /landing-creators: the creators the admin ticked ("Show on creator home"), approved + with a photo, card
  fields only (name, photo, category, city). Nobody ticked → the best approved creators. Cached 5 min.
- Landing creator wall (phone + desktop) shows those creators; the grey "Creator · Fashion · Mumbai" placeholder tiles are
  gone. Fewer than 9 → the list repeats, never the same face side by side / above each other. Admin label:
  "Show on creator home + landing page". Brand home "Meet our top creators" still uses the Explore list (not changed).
## Landing page (phone)
- Newspaper "hand phat raha hai": the photo's right hand was a broken cut-out (see-through fingers, faded palm) plus a
  separate low-res hand PNG on top. New image public/landing/np-reader-v343.webp: hand removed, clean straight paper
  edge (phone + desktop use it). Old c3cbd7c6.webp / 9dcc5c66.webp / 57832b0e.png deleted.
- "Edges smooth": the Payment-hold card's green / purple glows showed square corners on iPhone → glows now in their own
  layer clipped to the 30px rounded corners.
- Scroll "stuck, screen moves up": the page box was 100vh (taller than the visible iPhone screen) so the browser page
  scrolled too and the two fought (also the white strip under the hero). Now: box = visible height, browser page locked
  (html/body overflow hidden while the landing is open), the scroll box has overscroll-behavior contain, and the
  ticker / steps / Eva-demo timers pause while a swipe is happening (they re-rendered the whole page every 0.65–3.5 s).
## Tests
- New backend/v343UiFixes.test.ts (15 pass). Full vitest (node_modules installed this time with bun): 1668 pass, the same
  7 failures as untouched v342 (checked side by side), 0 new. protectedFlows pass. tsc: only the old session58Launch
  test-file errors. `vite build` OK. Screenshots of the landing at iPhone size checked (newspaper, payment card, wall).
## Needs Ravi
- Deploy v343 (one deploy). Then: friends with the Play app → clear Ybex data once.
- Admin → Users → creator → tick "Show on creator home" for the best creators (any number) — they show on the creator
  home AND the landing wall. Only creators with a profile photo appear on the landing.
- Not from Ybex: the "BARTER CAMPAIGN ALERT – WowNews" banner in the screenshot is another app's notification.

---
# v344 (Session 61, 19 Oct 2026) — full-app bug hunt (Ravi: "find more bugs and glitches in complete app")
Three read-only audits (creator side, brand side, shared/backend) → ~50 verified bugs → fixed. Every fix has a `// v344:` comment.
No locked LOGIC_FILE changed; screen files' server calls unchanged (protectedFlows pass).
## Creator side
- Mobile Creator info lost added languages ("English, Hindi" was one chip; only the first was saved) → chips + saved as "a, b".
- Every profile save wrote made-up sub-categories "Reels, Stories" → only real ones.
- Rate card: typing then Back used to get saved later with any other save → local draft, only Save saves.
- Earnings "In hold" counted payments that never went through (FAILED / INITIATED / CANCELLED) → excluded.
- "% match" on Campaigns list / detail showed 100%/0% from one data point → shown only with 2+ parts (same as Home).
- Home: expired campaigns in "Best matches"; profile % wrong when there were no campaigns; KYC "pending" while Profile said
  "Under review" (SUBMITTED / ESCALATED); "My orders" badge (UGC) opened campaign deals; active-deal rows now open that chat.
- Deals tabs keep the URL (Back returns to the right tab). Onboarding 18+ gate can't be skipped with a blank / impossible DOB.
- UGC: a failed KYC load no longer sends approved creators to fill KYC again; "Sign it on desktop" copy fixed; content no
  longer under the submit bar on notched iPhones. Platforms Back loop fixed. Location + portfolio fields 16px (no iPhone zoom);
  dead call to /api/locations/save removed. Closed tab: "Your quote". "1 day" plural. No fake "Instagram" platform row.
- Brands opening /campaigns/:id (mobile + desktop) no longer get the creator Apply / creator KYC prompt; owner → Manage applicants.
## Brand side
- Editing a LIVE campaign: "Save draft" silently took it offline → hidden for live campaigns; edit publish says "Changes sent
  for review"; header "Edit campaign"; no fake "0 Applications".
- Budget: negative / zero / min > max blocked with clear messages (no silent ₹1000). Creators needed 1–500 (no silent 0→10).
- UGC: payout release asked twice → once; "Manage Orders" filter now visible + clearable; Back from post form at /brand/ugc/post
  restores the bottom nav; cancelled / expired / refunded orders show "Closed" (no SLA timer, no "Payment Hold").
- Applicants: a failed load shows "Couldn't load · Retry" (not "No pitches yet"); no fake "Draft" chip.
- Brand home: "N new applicants pitched" was a lifetime total stuck in Needs-your-action → neutral "N applicants so far" row;
  using a template asks before replacing a half-written draft.
- Invite sheets: failed campaigns load → "Couldn't load your campaigns · Retry" (not "no live campaigns"). "(1 review)".
- Page behind sheets no longer scrolls (campaign create sheets, UGC preview / applicants, pitch player). Campaigns "New" menu
  above the bottom nav. KYC "Edit & resubmit" opens the form. Brand profile campaigns via campaigns?mine=true (team members).
  Onboarding "Skip niches & publish" really skips.
## Shared / backend
- Uploads (KYC photos, UGC videos, profile photos) and Eva / AI calls died at 30 s — the longer timeouts never applied (api.js).
- The user object was replaced every 60 s → ~24 screens refetched and the KYC form reset what the creator was typing → kept
  when nothing changed. Login now stores media_key (iPhone app: private images / videos worked only after a reload).
- Creator red "pending work" dot flickered (two pollers overwrote each other) → two states.
- Admin "send to all" / role broadcasts never showed live → accepted. iPhone crash in the popup when `Notification` is missing.
  Toast cooldown timer leak; bell guard before listeners.
- Notifications read / ack now return an error if the DB write fails. POST /tags/create needs login + clean 40-char tags.
  Promo view / click events need login. Profile banner cache per account. Nav photo retries after a new upload.
## Tests
- 7 stale tests updated (the app was right; files had been split / copy changed), 2 more stale assertions (confirm moved,
  link regex), duplicate imports in session58Launch.test.ts (tsc). New: backend/v344Creator / v344Brand / v344Shared tests.
- Full vitest: 1715 pass, 0 fail. tsc: clean. check-crashes: clean. vite build OK. Smoke test of /, /app, /login, /signup,
  /privacy-policy, /help at iPhone size: no runtime errors.
## Needs Ravi
- Deploy v344 (includes v343). Quick phone test: campaign create (budget), edit a live campaign, UGC payout approve (one
  confirm), creator profile languages + rates, Earnings "In hold".

---
# v345 (Session 61, 19 Oct 2026) — Eva fixes from tester Ankit's feedback
- "I need to know about UGC" started the UGC brief builder → questions ("know about / what is / kya hai / samjhao / tell me
  about / how does … work") are now ANSWERED (brand + creator Eva), unless the person also says make / post / order or gives an
  amount. assistKnowledge QUESTION also counts "know about / learn about / info / samjhao / jaanna" — before, that sentence
  was saved as a ticket for the team ("Got it — this just went to the Ybex team").
- "Show it again" on an old chat re-sent the last answer ("Skip") → "Could you tell me a little more?". Brief cards now
  come back from the saved draft (currentDraft); other cards re-ask only when that message was a real request (2+ words).
- A UGC brief finished with Eva is saved as the UGC draft right away (never over a brief written by hand), and UGC → My
  briefs now shows a "Draft · not posted yet · made with Eva" card with Resume / Discard (before: only behind the + button,
  and only if "Review & Pay now" was tapped). Cleared after payment.
- Tests: backend/v345Eva.test.ts (7). Full suite green; build OK.
- Open: Ankit's payment message was cut off ("Google Pay selected tha to …") — need the rest / a screenshot.

---
# v346 (Session 61, 19 Oct 2026) — black-box + white-box testing (Ravi: "blackbox and white box testing")
## How it was tested
- BLACK BOX: the app ran here (dev server + a fake Supabase in memory — there is no offline DB mode; Razorpay / Google /
  push not reachable) at iPhone 13 size. Journeys: creator signup → onboarding → profile → campaigns → apply → UGC →
  earnings → KYC → help; brand signup → onboarding → campaign create / edit → applicants → explore → invite → UGC brief to
  payment (test mode) → profile / KYC; creator ↔ brand apply → shortlist → chat; admin "Show on creator home". Live site
  NOT tested this time (the Chrome connection was down).
- WHITE BOX: code coverage with vitest v8 + 170 new tests on money / state logic (backend/wb*.test.ts).
  Branch coverage 62.5% → 65.3%; feeCalculator 100%, dealState 100% (statements), ugcOrderStage / dealFlow ~100%.
## Fixed (unlocked files)
- HIGH: Edit Profile wiped the bio (and cover photo) on save. HIGH: creator phone was public inside rate_card.extras
  (privacy strip now recursive). HIGH: campaign pitch showed email / phone to the brand → masked on screen (new
  src/utils/maskContact.js; the server apply route is locked).
- Chat filter now catches mixed numbers ("nine eight 76 5…"). Finish-later creators get the bottom nav. A published
  campaign no longer comes back as a local "draft". Rates: whole ₹0–10,00,000 only. Home picks: only approved creators
  with a photo, never yourself; admin gets a warning when a ticked creator can't show yet. Landing ticker = true product
  statements (no "Ananya selected for Nykaa"). No sample boAt / Nike / Mamaearth banners. Emoji names → correct initials.
  Quick-action sheet: once per session after ✕. Brand name / website / UGC sample URL checks; UGC budget below minimum
  shows an error (no silent ₹1). ?role=brand on signup, long titles clamped, logout → clean /login, creator KYC says why
  Submit is off. Landing content loaded in dev (StrictMode).
- Money: referral monthly cap now really stops over-cap rewards; a free deal is charged to the block live at that time;
  free deals fail CLOSED if the DB read fails; a creator can request the rest of a payout after a part refund; admin
  Escrow / Release modal show + pay "after ₹X refund" (not the full net). IST age (18th birthday early morning),
  "N/A" → "—", deadline reminders ("1 minute", no "Invalid Date", no crash on a bad deadline).
- NOT changed on purpose: creators' generated campaign "views / N+ applied" (Ravi's Session 38 decision) — ask Ravi.
## Bugs found in LOCKED files — need Ravi's OK (npm run protect:update) before fixing
 1. chat_routes.ts:523 — any user can post lifecycle messages (payout_released, payment_funded, content_approved,
    order_cancelled…) that the app trusts → fake "paid / completed / cancelled". Fix: non-staff may send only text / file
    types. (SECURITY — most important)
 2. directInvites.ts:20 + invitationUtils.js:27 — invite budget "15000 + 18% GST" becomes ₹15,00,018 and goes into the deal.
 3. payment_routes.ts:691 / 815 — escrow overview + payout record use the full net after a part refund (UI now corrected;
    server record can still say "Payout ₹19,000" when ₹0 is owed).
 4. payment_routes.ts:1391/1413 — unknown amount + Razorpay fetch failure → payment recorded as funded for ₹1.
 5. deals_chat_routes.ts:390/421 — UGC pay callback accepts refunded rows; falls back to an invented ₹5,000.
 6. feeCalculator.ts:63 — an "offer" fee can be HIGHER than the normal fee; :83 negative / non-numeric coupon → higher fee / NaN.
 7. agreementTerms.js:68 — UGC agreement doesn't mention the convenience fee that is deducted.
 8. creators_routes.ts:1604 — "Invite to campaign" after the creator applied → two deal threads (brand could pay twice).
 9. campaigns_routes.ts (apply) — pitch text not filtered on the server (masked on screen now).
 Product decision: adminMoney.netAfterPartialRefund takes the whole refund from the creator while Ybex keeps the full fee.
## Also open (not fixed): Eva bubble can cover "Finish" / "View all" on creator home; Earnings asks for a payout
  account even after KYC UPI; brand KYC form lost on refresh; editing a live campaign sends it back to review.
## Tests: 200 files, 1933 pass, 0 fail (9 it.fails document the locked bugs above). tsc clean, crash guard clean, build OK,
  public pages smoke-tested at iPhone size with no errors.

---
# v347 (Session 61, 19 Oct 2026) — locked-file bugs fixed (Ravi: "Haan, locked bugs fix karo") + 2 owner bugs
Re-signed with protect:update (reason logged in docs/code/PROTECTED_CHANGES.md): 9 logic files + invite screen calls.
1. chat_routes.ts — SECURITY: non-staff may post only text / attachment / file / image / video; anything else (payout_released,
   payment_funded, content_approved, order_cancelled…) is saved as plain "text". Staff unchanged. Lifecycle cards come
   from the server directly, so no real flow changes.
2. directInvites.ts + invitationUtils.js — invite budget takes the first number ("15000 + 18% GST" → ₹15,000; ranges shown
   "₹10,000 – ₹15,000").
3. payment_routes.ts — escrow overview has payable_net (after part refund); releasing a payout with nothing left after a
   refund → 400 NOTHING_LEFT_AFTER_REFUND (no more "Payout ₹19,000" when ₹0 is owed).
4. payment_routes.ts — unknown amount + Razorpay fetch failure → unconfirmed (retry), never recorded as funded for ₹1.
5. deals_chat_routes.ts — UGC pay callback ignores refunded rows; no invented ₹5,000 (409 AMOUNT_UNCONFIRMED).
6. feeCalculator.ts — offer fee can never be higher than the normal fee; flat coupon ≥ 0, fee never below 0.
7. agreementTerms.js — UGC agreement discloses the convenience fee (+GST) & TDS deducted from the payout.
8. creators_routes.ts + directInvites.ts + InviteToCampaignModal — invite to a creator who already applied / is in an open
   deal for that campaign → 409 ALREADY_IN_CAMPAIGN; the sheet shows "Already applied / in a deal" + Open chat.
9. campaigns_routes.ts /campaigns/apply — pitch contact details masked on the server ("[hidden]"); never rejected.
## Owner bugs
- KYC UPI now counts as the payout account: new backend/kycPayoutMethod.ts + GET /creator/payment-methods/kyc (masked UPI,
  bank last-4, never PAN); Earnings / payout request / Eva use it when no method is saved (a saved method wins).
- Brand KYC (mobile + desktop) keeps typed text fields after refresh (per-user draft, no files / OTPs), "Draft restored"
  note, cleared after submit; a pending / approved KYC always loads from the server.
## Still waiting for Ravi: (a) creators' generated "views / N+ applied" (Session 38 choice) keep or remove? (b) part refund:
  recompute the fee on the amount left (creator gets ₹4,250 not ₹3,500 on ₹10k with ₹5k refunded)? — 1 it.fails documents it.
## Tests: 202 files, 1976 pass, 0 fail. tsc / crash guard clean, web build + server bundle OK.

---
# v348 (Session 62, 19 Oct 2026) — manual settle / refund, promo fixes, desktop OTP login, phone UI bugs
## 1. Settle / Refund by hand (Ravi: "kisko kitna dena hai wo mere upar — tu decide mat kar")
- New `backend/manualSettlement.ts` (not locked) + `src/components/admin/SettleDealModal.jsx`.
  GET / POST `/admin/settlements/:txId` (sub-admins need manage_escrow). Campaign / invite deal payments only (UGC keeps
  Admin → Escrow → UGC Refunds).
- Admin picks Ybex convenience fee (No fee / 1% / 2% / 5% / other %) and who gets the rest (All to brand / All to creator /
  Half–half) or types the 3 amounts. Nothing pre-chosen. Must add up to what the brand paid. Reason (list + text), note
  (brand + creator see it). For each side that gets money: its UPI QR with the amount filled in (or bank details), then the UTR.
  Review → Confirm & save. Brand + creator get a notification. Admin log `MANUAL_SETTLEMENT`.
- Where: phone Admin → Payouts → "Settle / Refund" on in-production deals + in the Pay sheet (was the dead "Refund brand");
  desktop Escrow → "Settle" next to Refund.
- Saved on the payment row (no DB change): refund_* = brand part, payout_* = creator part (PAID), platform_fee_amount =
  correct_fee_amount = Ybex part, gst_amount 0, creator_net_amount = creator part, `notes` = JSON of the split + the ORIGINAL
  fee / GST / net. The locked release-payout route then refuses any second payout (tests prove each case).
- Creator part needs approved KYC + payouts not frozen (same rules as normal payouts).
## 2. Promo popups
- Eva poster / any popup + desktop Eva: only for signed-in people on app pages — never landing, login, signup, legal,
  share links, blog, admin (`src/lib/inAppPage.js`).
- Popups take turns: same priority → alternate each app open; a "once" popup already seen no longer blocks the next.
  Profile banner (My Profile strip) is separate and always shows. Live DB check: Ravi's "invite" promo is saved as a
  BOTTOM SHEET popup (not Profile banner), same priority 100 as the Eva card → it was always losing; now they alternate.
- "Tap opens" = page list (Home, Chat with Ybex Eva `/dashboard?assist=new`, Refer & Earn `/refer`, Inbox, KYC, Earnings,
  Explore, New campaign, UGC…) + "Other link". A pasted https://ybexapp.ai.studio/… or ybexmedia.in link becomes the app page.
## 3. Login
- Desktop /login: "Login with OTP (email code)" (same endpoints + limits as the phone). Wrong password / no-password account →
  "Login with OTP instead" (sends the code to the typed email). No-password account message says so.
- Google: website button asks `prompt=select_account consent`. iPhone app shows the empty email page because
  SFSafariViewController (@capacitor/browser) has its own cookies — fixing it needs ASWebAuthenticationSession or native
  Google Sign-In = new iOS build.
## 4. Phone UI (Ravi's screenshots)
- Chat: no empty gap above the keyboard (home-bar padding dropped while the keyboard is open).
- Stuck unread "1" on finished deals: the admin "Payout Disbursed" card has no sender; open-chat marks read only
  `sender <> me` (NULL never matches) → never cleared. Counts now skip no-sender rows (inboxLean.ts, server.ts) + the phone
  remembers when each chat was opened (`src/lib/threadSeen.js`); home "unread" rows use the same count.
- Quick action sheet drawn on <body> above the bottom nav. Bottom nav: solid background, 58px + safe area (was 84px).
## Tests
- New backend/v348Settlement.test.ts, backend/v348UiFixes.test.ts, src/pages/auth/desktopOtpLogin.test.jsx.
  Full vitest: 205 files, 2002 pass, 0 fail. tsc clean, crash guard clean, web build + server bundle OK.
## Needs Ravi
- Deploy v348. Then Admin → Promo popups: edit the Eva card → Tap opens "Chat with Ybex Eva". If the invite poster should
  be the My Profile strip, edit it → Layout "Profile banner" + a 1080×200 poster.
- Phone check: chat keyboard gap, quick action sheet, nav bar, inbox badge; desktop OTP login; one test settlement.
- Option (b) part-refund fee question is now covered by the manual Settle tool (admin decides the fee each time).

---
# v349 (Session 62, 19 Oct 2026) — hide a creator from Explore + real Instagram numbers
DB change approved by Ravi ("Haan, kar do") and APPLIED live: scripts/sql/session62_explore_instagram.sql
(creator_profiles.hidden_from_explore / instagram_verified_at / instagram_verify_method / instagram_synced_at / instagram_stats,
table instagram_connections — RLS on, server only). Browser can't write these columns (browserDbRoutes STAFF_ONLY).
## 1. Hide from Explore (Ravi: "delete / ban ke alawa sirf hatane ka option")
- Admin → Users → creator → "Hide from Explore & Meet the Creators" (POST /admin/creators/:id/explore-hide, logged).
  Hidden = not on Explore, Meet the Creators, top creators, landing wall, home picks, Eva search. Profile link, deals,
  chats keep working. Admin list shows a "Hidden from Explore" chip.
- Logged-out Explore preview fills complete rows (no 2 empty slots before "Sign in to see more").
## 2. Instagram real data (backend/instagramConnect.ts, src/components/instagram/InstagramConnectCard.jsx)
- Username → followers, posts, avg likes / comments / reel views, engagement via Meta's official Business Discovery
  (asked by Ybex's own Instagram). Creator / Business accounts only (personal → "switch to Creator" message).
- Verify (creator picks): DM code YBX-XXXXXX to Ybex's Instagram (webhook /api/webhooks/instagram, signed) OR
  Log in with Instagram (OAuth, adds 28-day reach / views; token AES-sealed in instagram_connections, auto-refreshed).
- Daily refresh by itself (hourly job, ≤60 creators/hour). Admin → Users → creator → "Refresh from Instagram".
- Guard before the locked POST /creators/profile: synced numbers can't be typed over; a new username drops old sync.
- One Instagram can be verified by only one Ybex account.
- Shows nothing new until secrets are set → docs/setup/INSTAGRAM_SETUP.md (Ravi's Meta steps). DM code + Instagram
  Login reach the public only after Meta App Review (testers work before).
## Tests
New backend/v349Instagram.test.ts (14), backend/v349ExploreHide.test.ts (12). Full vitest 207 files / 2028 pass, 0 fail.
tsc clean, crash guard clean, web build + server bundle OK.
## Needs Ravi
- Deploy v349 (includes v348). Admin → Users → creator → Hide toggle to test.
- Instagram: follow docs/setup/INSTAGRAM_SETUP.md part A first (username fetch), then B (DM) / C (login) + App Review.

---
# v350 (Session 62, 19 Oct 2026) — landing page from Ravi's new design files
Compared Ybex_Landing_Mobile/Desktop_offline (new) with the live landing, section by section at 390 px and 1440 px
(screenshots side by side) and text / data / images programmatically.
- New: the newspaper photo `public/landing/np-reader-v350.webp` (designer's version with a clean right hand holding the
  paper). Old np-reader-v343.webp deleted (v343 test pin moved — requirement change, commented).
- Bug found while comparing: the app's global `img { max-width: 100% }` squeezed that photo by ~13 % (paper looked tilted,
  hand slid under the print) → `maxWidth: "none"` on it (phone + desktop).
- Bug: the app's global `* { font-family: DM Sans }` beat inheritance, so the newspaper headline ("UGC VIDEOS DELIVERED IN
  24 HOURS") showed in DM Sans instead of Oswald → `.ybl-root *{font-family:inherit}` in both landing CSS files.
- Kept on purpose (earlier decisions, not reverted to the design file): ticker = true product statements (v346, no
  "Ananya selected for Nykaa"); trust strip "Agreements signed with Email OTP" (Ybex doesn't use Leegality); reviews only
  from Admin (v333, the design's sample quotes never show); creator wall = admin-picked creators (v343).
- Everything else (layout, copy, other images) already matched.
- Tests: full vitest 207 files / 2028 pass. Build OK.

---
# v351 (Session 62, 19 Oct 2026) — Instagram username fetch set up live on Meta
Meta app **Ybex** (ID 913426198373843, Business type, Development mode). Instagram = **ybex.in** (IG business id
17841480473392276, 8,777 followers), linked to Facebook Page **YBEX MEDIA** (1391240684081902).
- Business Discovery kept failing with "(#10) Application does not have permission". Real cause (Meta docs): the token
  also needs **instagram_manage_insights** and **ads_read** (Page sits in Business Manager). Added both → test
  `business_discovery.username(bluebottle)` returned 518,555 followers ✅.
- Made a never-expiring **Page token** (Extend Access Token → me/accounts → YBEX MEDIA access_token). Debugger: Type Page,
  Expires Never, all 8 scopes. Data-access expiry ~3 months renews while Ravi stays active on Facebook.
- Code: `backend/instagramConnect.ts` default Graph version v21.0 → **v26.0** (Explorer only offers v26.0 now).
  ENV_KEYS.md + docs/setup/INSTAGRAM_SETUP.md part A rewritten with the exact steps that worked.
- Claude in Chrome failed on developers.facebook.com again (screenshot / find / page text) → Ravi did the clicks.
## Needs Ravi
- AI Studio secrets: `IG_GRAPH_TOKEN` (the Page token — never share it), `IG_BUSINESS_ID` = 17841480473392276,
  `IG_GRAPH_VERSION` = v26.0. Then deploy **v351** (includes v348–v350).
- Test: creator → Profile / Settings → "Live Instagram numbers" → username → Fetch.
- Next: DM-code (webhook + App Review), Instagram Login (IG_APP_ID/SECRET + App Review), System User token.

---
# v352 (Session 63, 20 Oct 2026) — "Fetch from Instagram" next to every Instagram username box
Ravi: "pure code mein jaha jaha username daalte hain wahan fetch lagao — creator form, profile settings, sab jagah".
- New `src/components/instagram/InstagramFetchButton.jsx`: one small row under a username box →
  **[⟳ Fetch from Instagram] ✅ 15,234 followers fetched**. Fills that form's own boxes (followers, avg reach/views,
  avg likes, avg comments). Hidden until the IG secrets are set, so nothing changes on screen before that.
- Placed in: public creator apply form (desktop + mobile; also fills the name if empty) · creator onboarding desktop
  (Step 1 both layouts, Step 3 Instagram details) · creator onboarding mobile (handle screen + Instagram details sheet) ·
  creator settings desktop (PlatformsPanel) · creator profile mobile (InstagramStatsForm) · Admin → creator edit ·
  Admin → waitlist edit · brand onboarding desktop (brand Instagram).
- Settings (logged-in creator) use the existing `POST /creator/instagram/lookup` → saved as live numbers, update daily.
  All other forms use new **`POST /api/instagram/preview`** → numbers only, nothing saved; the form saves as usual.
- `/instagram/preview` limits (Meta gives ~200 calls/hour): 6-hour cache per username, 6/hour per logged-out visitor
  (IP), 15/hour per user, 60/hour admin, max 80 non-admin previews/hour total. New `GET /api/instagram/config`
  tells the forms whether to show the button. Code in `backend/instagramConnect.ts` (not a locked file).
- No locked file touched. Tests: new `backend/v352InstagramFetchEverywhere.test.ts`; full vitest 208 files / 2032 pass.
  tsc + crash guard + vite build OK.
## Needs Ravi
- Same as v351: IG secrets → deploy **v352** (includes v343–v351). After deploy test Fetch in: apply form, onboarding,
  Settings → Platforms, Admin → creator edit.

---
# v353 (Session 63, 20 Oct 2026) — creator-side UI/UX bug hunt (phone first)
Ravi: "deep jaake UI/UX bugs aur glitches dhundo aur fix karo — UX easy hona chahiye". Ran the app locally at 390px with fake
data (no real server/DB touched), screenshotted every creator screen, plus a code audit of home, campaigns/UGC, chat and
profile/onboarding. Fixed (screen files only — no LOGIC_FILES, no server call added/removed):
- **Layout:** "Showcase What Makes You Different. This is how brands see you." showed under the creator's own
  Notifications / Deals pages → only on a creator's public page now.
- **Campaigns:** "based in Pan India" → "anywhere in India"; "Brand Name" placeholder → "Brand"; Apply no longer crashes
  (niche saved as a list / account with no name); no-niche creators get "Add your niche in Profile to apply" + button;
  "Pending" everywhere for a pending application.
- **Deals:** tabs showed "Ongoing0"; Completed count no longer includes rejected/declined (tab → "Past" when it has them).
- **Instant UGC:** upload box / Submit only while filming or fixing changes; delivered/completed orders show "Delivered",
  not red OVERDUE; "Upload before…" (not Re-upload) on first upload; 50 MB check right away; edited filter, pill counts,
  no made-up "30–60s"/"Authentic UGC…" text.
- **Home:** Active deals leave out finished deals; specific badges (IN REVIEW / AWAITING PAYMENT / OFFER / PENDING);
  "KYC needs a fix" / "Complete KYC"; less empty space at the bottom; no "Brand Partner" placeholder.
- **Earnings:** receipts show the real brand + creator name; unpaid payout no longer says "successfully transferred";
  rejected KYC shown right; one KYC prompt; fake "View proof" box removed; In-hold sheet labels fixed.
- **Refer:** back button + "Invite & earn" title on phone; ₹0 reward lines hidden; wallet chip = wallet balance.
- **Notifications:** proper titles (Payment update / New offer / New message); "Reupload draft" only where it belongs;
  server error now shows "Couldn't load · Retry" (was "all caught up"); welcome says "Ybex" and opens Home.
- **Chat (creator):** Accept on the first offer in "Respond to offer" opens the contract (was "no counter offer waiting");
  a second Send while sending no longer loses the text; keyboard open scrolls to newest message; status popup labels for
  real states, no "money held" claim before payment, ₹0 fee row removed; approved draft stays approved after live link;
  upload button only when due; payout card "Approved · payout next" until UTR; pinned brief cards don't squash.
- **Profile/KYC/onboarding:** typed edits no longer wiped by inline saves; picking a city keeps the state; rejected /
  "more info needed" KYC states with reason + resubmit; KYC card doesn't flash while loading; photo "saved" only on
  success; one toast per save; all languages selectable; portfolio delete asks first; 36px tap targets; barter labels;
  heart only for brands; onboarding back chevron; pasted Instagram links → handle; autosave failure toast;
  avatars use local initials (no ui-avatars.com); "KYC compliance" → "KYC verification"; "Chat with support" → "Contact support".
## Needs Ravi (LOCKED — chatStageMap.js / useChatThreadMobile.js, not changed)
- Inbox chip says "Offer received" when agreement is ready to sign; "In production" when creator must upload;
  declined-changes states say "Your turn"; ₹ in chip is gross not net; raw error text in chat toasts; brand who signed sees
  "Waiting on brand". Say OK to unlock and fix these.
- Skipped: UGC "Open brief & sign" button for unsigned orders (needs a server check), X/Threads on profile platforms.
- Tests: full vitest 208 files / 2032 pass; tsc + crash guard + vite build OK. Deploy v353 (includes v343–v352).

---
# v354 (Session 63, 20 Oct 2026) — Instagram: username once → photo, numbers, reels; smart refresh; admin bulk fetch
Ravi: "onboarding mein ek baar username maanga — photo, followers, reach, engagement sab apne aap; manual photo ho to
wahi rahe; inactive ko baar-baar fetch mat karo; admin se ek button sab creators + unclaimed + waitlist ke liye;
creator form mein 'Fetching your data' popup; portfolio mein Instagram se sirf brand-promotion reels select karo".
- **Auto fetch everywhere** (`InstagramFetchButton`): ~1 s after a new valid username is typed → popup "Fetching your
  Instagram data…" → boxes fill. A username already there when the screen opens is not re-fetched. Button = Refresh.
- **Photo:** server copies the Instagram picture to `avatars/ig/<username>` (existing bucket, no DB change). Used when
  there's no photo / Google / placeholder / our older copy (weekly refresh). Uploaded photos are never replaced (tested).
- **Apply form:** also fills photo, name (if empty) and an e-mail found in the bio (if the box is empty). Meta never
  gives the real login e-mail — not possible via any Meta setting.
- **Onboarding (mobile):** Instagram handle moved above the name; fetch fills photo, name, numbers and marks Instagram
  linked, so the Instagram-numbers sheet is skipped. Last step: "Pick from Instagram" (posts grid, "Collab" tag for
  #ad / #collab / paid partnership / use code, max 6) or "Upload manually". Picks go to the profile portfolio (what
  brands see). Fixed: the manual onboarding item went only to creator_portfolio_items, which the public profile never
  shows — it now goes to the profile portfolio too. On submit the numbers are marked "live" (cached, no extra call).
- **Onboarding (desktop) Step 4:** same picker / manual tabs. **Profile → Portfolio:** "Import brand collabs from Instagram".
- **Smart refresh:** used app in last 24 h → daily; 1–7 days → every 3 days; 7+ days / never logged in → every 10 days
  (last use read from login renewals, which are stored once a day). Max 60/hour.
- **One Meta budget** (180/hour) + 6-hour cache per username shared by preview, lookup, refresh, bulk.
- **Admin bulk:** Admin → Users (All/Creators/Unclaimed) and Waitlist → "Fetch Instagram for everyone" (all creator
  profiles + pending waitlist: numbers + photo where none uploaded). Background job, progress bar, waits for Meta's
  hourly limit. Skips profiles fetched in the last 20 h unless "Also ones updated today" is ticked. Today ≈ 32 profiles
  + 44 pending waitlist ≈ 76 calls (fits in one hour).
- Fix: mobile apply form — the Avg. reach box was pushed off the right edge.
- Tests: new `v354InstagramAutofill.test.ts` (helpers, schedule, field fallback) + `v354InstagramRoutes.test.ts`
  (preview / lookup / bulk with fake DB + Meta). Full vitest 210 files / 2046 pass; tsc + crash guard + build OK.
## Needs Ravi
- IG secrets (IG_GRAPH_TOKEN, IG_BUSINESS_ID, IG_GRAPH_VERSION=v26.0) → deploy **v354** → Admin → Waitlist →
  "Fetch Instagram for everyone" → Fetch now. Then check a few photos / numbers and approve.
- Not verified live yet: whether Business Discovery returns `thumbnail_url`/`permalink` for other accounts' posts.
  If not, numbers still work (automatic fallback) but the reel picker shows "couldn't find posts" → tell Claude.

---
# v355 (Session 63, 20 Oct 2026) — locked chat files fixed (Ravi approved: "ok h in pr bhi kaam kro")
Unlocked + logged via `npm run protect:update` (docs/code/PROTECTED_CHANGES.md). No server call changed.
- `chatStageMap.js` (inbox chips + "Needs action" quick actions):
  - Price agreed, nobody signed → "Sign contract" (was "Offer received" while the chat said SIGN AGREEMENT).
  - Later states never fall back to "Negotiating" just because a signature flag is missing.
  - Payment held → creator chip "Your turn · upload draft" (needs action); brand "In production".
  - Creator declined the changes (REVISION_DECLINED / _LINKS) → own "changes_declined" stage: creator "Waiting on brand",
    brand "Creator declined changes"; no upload action; no longer shown as a declined deal.
  - Creator's own application price → "Offer sent · waiting" (brand sees "Offer received").
  - Brand who signed → "Waiting on creator" (was "Waiting on brand").
  - Creator money chip has no gross amount ("Approved · payout next" / "Payment received"); brand keeps the amount.
    Old test pin on "₹15,000 received" moved — requirement change, commented in the test.
- `useChatThreadMobile.js`: every error toast goes through `calmError` (no "timeout of 45000ms exceeded" /
  "Network Error"); Razorpay cancel → "Payment cancelled."; accept / counter return false on failure →
  `MobileRespondOfferSheet` stays open.
- `ChatBoxMobile.jsx`: "REVISIONS DECLINED" bar → calm amber "CHANGES DECLINED · WAITING FOR BRAND", no pulse, doesn't
  open the Upload sheet.
- Tests: 5 new chip tests in chatStageMapUgc.test.js. Full vitest 210 files / 2051 pass; tsc + crash guard + build OK.

---
# v356 (Session 63, 20 Oct 2026) — new footers from Ravi's "Settings & Home" design (phone + desktop)
Ravi: "ye footer designs banaye h new, inko implement kro creator home, brand home aur settings pr, desktop + mobile dono".
- **Homes** (`src/components/footer/HomeCityFooter.jsx`, used by Layout for /dashboard + /brand/dashboard, replaces the old
  grey "Built For Creators." / "Where Brands Meet…" headline there):
  - Creator home → "From The Corner Shop To **The Tallest Tower.**" + "Brands of every size, from every city, lane and
    mohalla." with the colour city art (`public/img/footer/city-brands.svg`).
  - Brand home → "Every Kind Of Creator. From **Every Town.**" + "Metro influencers to tier 3 storytellers, every niche."
    with the creators-in-the-city art (`public/img/footer/city-creators.svg`).
  - Phone = design 1:1 (300px, text top-left, art on the right, road sits on the bottom nav; a CSS road continues the
    art's road to the left edge, dashes in step). Desktop = same art 360px high on the right, 32–46px headline on the left,
    road across the full page width.
- **Settings** (`src/components/footer/FounderNote.jsx`):
  - Phone (creator My Profile hub + brand Company Profile hub): white "Log out" card (same action; brand still asks in the
    confirm sheet — moved out of the list into its own card like the design), "Ybex v356 · © 2026 Ybex Media. All rights
    reserved.", then the founder note — "Why I built Ybex", line, signature, Ravi Sharma / Founder, Ybex, @ybex.in,
    "Crafted with ♥ in Jaipur", 3D Ravi on the right with the purple glow — ending on the bottom nav.
  - Desktop (creator + brand Settings Hub): the same note as a wide soft card under the panels + version line.
  - Phone /brand/profile no longer adds the old "Tell Creators What…" footer under the hub.
- Version label: new `src/lib/appVersion.js` (VITE_APP_VERSION wins, else "v356").
- Images from the design file: SVG metadata stripped (~25 KB each), founder + signature as WebP (24 KB / 12 KB).
- No server call, locked file or DB change. Repo +7 files.
- Checked at 390 / 360 px phone and 1024 / 1440 px desktop with fake data (screenshots).
- Tests: new `backend/v356Footers.test.ts` (4). Full vitest 211 files / 2055 pass; tsc + crash guard + vite build OK.
## Needs Ravi
- Deploy v356 (includes v343–v355) with the IG secrets from the v354/v355 notes.

---
# v357 (Session 63, 20 Oct 2026) — new sign-ups go to the waitlist, Explore only after admin approval
Ravi: "creator register karte hi Explore pe show ho jaata hai, waitlist mein nahi jaata. Pehle jaisa karo: register →
'under review' + waitlist; jisko main approve karunga wahi Explore pe."
## Cause (live DB, read only)
- `creator_profiles.profile_status` has DB default **'approved'**. A creator's first profile save (locked POST
  /creators/profile autosave, GET /creators/:id auto-create, /auth/onboard) makes the row without a status → "approved"
  at once → Explore. Only the phone onboarding's final Submit set "under_review", so anyone who hadn't finished (or had
  autosaved earlier) sat on Explore. Waitlist lists only "under_review" rows → these never showed there.
- Live on 20 Oct: 5 such profiles (approved, never reviewed): Sakshi Matta, Tanuj Sharma, jatin sharma, Babu bhaiya
  (onboarding not finished) and "Review Creator" (Play reviewer test account).
## Fix (no locked file, no DB change)
- `backend/exploreGate.ts`: `approvedByAdmin(row)` — a self-registered (claimed) profile created after 10 Oct counts as
  approved only with `reviewed_at` (set by Waitlist approve / reject and now by Admin → creator edit). Unclaimed form
  profiles and older creators unchanged. `awaitingReview(row)` = needs review. Used by: /creators/explore filter,
  landing / misc list, home picks + Eva search (`isShowableCreator`), frontend `visibleCreators` + Explore (desktop).
- Admin → Waitlist (`admin_waitlist_routes.ts`): also lists `awaitingReview` creators as Pending (approve → Explore).
- New `backend/creatorReviewGate.ts` (before the locked creators routes): a creator's FIRST POST /creators/profile →
  row set to "under_review" after the save. `/auth/onboard` new creator rows → "under_review".
- `/auth/me`: such a creator sees "under_review" (not "approved").
- Admin → creator edit: shows "Under Review" for these (saving other fields no longer approves by accident); picking
  Approved / Rejected sets reviewed_at.
- Optional DB default change noted in docs/database/PENDING_DB_CHANGES.md (needs Ravi's OK).
## Tests
New `backend/v357ReviewGate.test.ts` (6). session43Batch3 pin updated (requirement change, commented). Full vitest
212 files / 2061 pass; tsc + crash guard + vite build + server bundle OK; protectedFlows 9/9.
## Needs Ravi
- Deploy v357 (includes v343–v356). Then Admin → Waitlist: the 5 above show as Pending → approve the real ones
  (Review Creator = Play reviewer account; approve it if reviewers should see it on Explore).
- Test: new creator signs up → not on Explore, shows in Waitlist → Approve → on Explore (cache up to a few minutes).

---
# v358 (Session 63, 20 Oct 2026) — brand-side UI/UX bug hunt (phone first, then desktop)
Ravi: "creator side ho gaya, ab brand side pe deep jaake UI/UX bugs + glitches find and fix". Ran the app locally at
390 px and 1440 px with fake data (no real server / DB) + 3 read-only code audits (home/explore/profile, campaigns/
payments/KYC, Instant UGC/inbox) → ~125 findings, each checked in code → fixed in 63 screen files. Every change has a
`// v358:` comment. No LOGIC_FILE, no server call (method + path), no DB change.
## Home / Explore / profile / onboarding
- No admin banner → built-in banners are now purple TEXT cards (title, line, CTA) — they were unrelated stock photos with
  no words (empty box when the photo didn't load); no "4K footage in 48 hours" promise. Admin banner badge = its tag only
  (was the internal "Dashboard Hero Carousel").
- A failed load no longer makes an active brand look new ("Welcome / Post your first brief"); UGC-brief-only brands count
  as active; KYC "APPROVED" in capitals counts; "more info needed" KYC = amber "Action needed" + admin note + "Update KYC";
  failed KYC check = "Couldn't check · Retry" (not "KYC not done"). "Payouts" → "Payments" (brands pay).
- Explore: niche pill showed "Fashion & Lifest" cut mid-word → short name + ellipsis; filter-sheet count includes the search;
  no raw server text in toasts. Desktop multi-invite: "Sent to X of Y", failed ones stay selected, plurals, initials.
- Brand on a phone now sees a creator's "Past work"; review count = real reviews. Invite sheet inputs 16 px (iPhone zoom);
  desktop invite gets a campaign picker (same POST), ₹ icon, optional fields.
- Profile hub: phone Back no longer loops into sub-screens; a failed profile load blocks Save (no wiping real data); saved
  preferences light the right chips (alias map); logo / cover saved right after upload; Share uses the real brand page;
  public preview lists live campaigns only. Brand public page: in-review / paused campaigns no longer "Open".
- Desktop home: invented rising mini-charts → flat; ₹ amounts with L / Cr. Tour: no "4M+ creators". Invented claims removed
  (3x applications, 80+ creators, "dedicated Campaign Manager"); onboarding preview shows the real city.
- "Contact Us" makes max one support ticket per session.
## Campaigns
- Editing a LIVE campaign: no "Save as Draft" (desktop + KYC notice) — it used to take it offline; button "Send changes
  for review" + note; true toasts ("sent for review"). Edit keeps creator reach, creators-needed and all deliverables
  (were reset to Micro / 50 / first item). Desktop draft keeps its deadline. "New campaign" with a saved draft starts fresh
  (`?fresh=1`); KYC wall removed from "New" (publish still needs KYC). No pre-filled example budgets.
- Publish re-checks step 1 (brief ≥15 chars, niche) and blocks a past close date. Preview: tick only if KYC approved,
  badge "Preview". Success screen: pitches show in Campaigns (not inbox). 32 px remove buttons.
- Phone campaign page (applicants): cards touched the screen edges → padded; "Review N new applicant(s)" / "See all";
  Shortlisted stat = tab; one clear toast after shortlist + per-card busy; no "@creator" / "India" placeholders.
- Lists: "Not approved" tab, Launch busy state, end-of-day IST deadline, full budget range. Desktop header shows
  Paused / Closed; owner sees "Your campaign" (not "Apply"); owner bar works with campaign_id.
## Payments / KYC
- Approved brand resubmitting KYC gets a warning first (it goes back to review). Desktop KYC no longer resets typed fields
  every minute; failed read = Retry banner. "Reviewed by Ybex · usually within a day" (was "automated"). Solo = PAN needed.
- Held / active totals count only money really held (not pending / refunded / failed). "Released this year" (IST year).
  Escrow sheet says "Waiting for creator" until delivery. Receipt: no "Verified Brand" / "ITC eligible". "Creator Pro" → "Creator".
## Instant UGC / inbox
- Phone order screen: live-post card with "Open post ↗", declined reason, revision notes; closed orders say "Order closed"
  (no red timer / "held"); revision-requested = waiting state; 3-step bar for raw UGC; Back closes the order / wizard.
- No "Past deadline" on a draft waiting for the brand; new "Creator declined" / "Changes asked" badges; no "auto release
  if SLA runs out" promise; 24–72 h (not 24 h) everywhere; "Uploaded in the app" (not Google Drive).
- "Order help" now sends the real order (was "ORD-PENDING" + creator reasons). Pay buttons busy ("Opening checkout…");
  calm payment errors. AI Assist keeps the chosen format. "Creators (N)".
- Approved downloads open through the media link (were broken); "Paid" only after UTR; "Ybex pays the creator's bank".
- Desktop: closed orders grey "Closed"; no frozen "24h 00m 00s"; no "Product Item" / "Verified UGC Creator"; brief cards no
  fake "Admin Alerted / Expired"; total held + per-video price; header "UGC Orders".
- Chat (unlocked cards): no master download before the order is final; raw UGC "Approve & release ₹X"; escrow sheet no
  "full refund if deadline missed". Cancel brief: refund in 1–2 working days, number keypad.
- Inbox: local initials (no dicebear image); desktop empty right panel = "Select a chat" (was "No activity yet");
  brand Inbox unread badge on desktop sidebar + drawer; Back from a chat returns to the list; ?creator= links.
## Not changed (need Ravi / server)
- LOCKED chatStageMap.js: brand chips for declined UGC links / revisions and CANCELLED orders; useChatThreadMobile release
  confirm without ₹ / name; BurgerMenuSupport "system scanners" text; ChatBox.jsx copy.
- Server (locked): budget 0 → ₹2,000–5,000; edit skips the past-deadline check (screens block it now); payment_routes
  "Creator Pro" default (screens hide it). Desktop campaign Pause / Close (new calls).
## Tests
New `backend/v358BrandUx.test.ts` (7). Pins moved (requirement change, commented): v344Brand, v344Creator,
session43Batch4, brandUgcMobileSmoke, brandCampaignDetailMobile, directBrandInviteFlow. Full vitest 213 files / 2068 pass;
tsc + crash guard + vite build OK; protectedFlows pass. Screens re-checked at 390 / 1440 px.
## Needs Ravi
- Deploy v358 (includes v343–v357). Phone check: brand home banner, campaign edit (reach / creators kept, "Send changes for
  review"), applicants page, UGC order (live link card, closed order), Payments totals, KYC resubmit warning.
- Say OK if the locked chat chips (declined / cancelled UGC) should be fixed next.

---
# v359 (Session 63, 20 Oct 2026) — locked chat chips fixed (Ravi OK: "HNN")
Re-signed with protect:update (logged in docs/code/PROTECTED_CHANGES.md): dealState.js, chatStageMap.js,
useChatThreadMobile.js; ChatBoxMobile.jsx (screen group, no server call changed).
- Creator declined UGC changes / a live-link change, or declined campaign changes → the BRAND's chip is now
  "Creator declined · your call" and the chat shows in "Needs action" + quick actions (was no action, never listed).
- Cancelled deals and closed UGC orders (cancelled / expired / refunded): grey chip "Cancelled" / "Expired" / "Refunded"
  (was "In production"), never "Needs action"; chat bar "ORDER CANCELLED" / "ORDER CLOSED · …" / "DEAL CANCELLED"
  (brand saw "PAYMENT SECURED"); creator's "+" no longer offers upload. New dealState `isThreadCancelled`, `isCancelled`.
- Raw UGC "Approve" confirm now says the amount and the creator: "releases ₹4,000 … to Kabir Singh. Ybex pays it to
  their bank in 1–2 working days." Toast matches.
- Tests: new src/components/chat/mobile/v359ChatChips.test.js (4); mobileChatActions pin moved (requirement change).
  Full vitest 214 files / 2072 pass; tsc + crash guard + vite build OK; protectedFlows 9/9.
## Needs Ravi
- Deploy v359 (includes v343–v358). Check: a cancelled UGC order in Inbox (grey chip) and inside the chat (grey bar).

---
# v360 (Session 63, 20 Oct 2026) — campaign page, popups under the bottom bar, footer spacing (Ravi's phone screenshots)
Ravi: "caimpaign ka UI UX fix kro bhot bekar hai, ye popup, aur purane footers mein bahut khaali space — is baar nahi hona chahiye".
## Brand campaign page (phone, BrandCampaignDetailMobile)
- Stats ("1 Applicants · 0 New · 1 Shortlisted") and tabs ("Under review · 0 … Hired · 1") were two rows with different
  numbers, and the page opened on an empty tab ("No applicants in this category." while the only creator was hired).
  Now ONE row of tappable tiles = tabs: New · Shortlisted · Hired · Passed (selected tile black). Opens on the first tab
  that has people. Purple "Review N new pitches" only when there are new ones (and you're on another tab).
- Empty tab says what it means ("No one hired yet — a creator shows here once the payment is held", "No new pitches —
  share the brief" + Share). Predict ROI + Download report moved into one "tools" card under the list. Less bottom gap.
## Popups hidden under the bottom bar ("Cancel Brief & Request Refund" buttons)
- Phone bottom nav is z-50 = most full-screen popups → the nav painted over their buttons. `PopupBackdrop` now lifts any
  `fixed inset-0` backdrop asking for z-40/z-50 to z 1000 (all such popups app-wide).
- Cancel brief: drawn on <body>, bottom sheet on phone, buttons pinned at the bottom with safe area, equal size
  ("Keep brief" / "Cancel & refund ₹X").
## Old footers ("Built For Creators…", "Find Creators…", etc.)
- PremiumFooter on phone: 8px above (was 32+32), 12px below (was 40), headline 28px, Instagram row without the extra
  divider / padding. Pages under it no longer take a full screen height or leave 110–160px at the bottom (Layout already
  clears the bottom bar): Explore, brand Campaigns, creator Campaigns, Deals/Collabs, Payments, Earnings, campaign detail.
- Brand home's live "Built For Creators." footer is the v356 city footer once v356+ is deployed (live is still v342).
- UGC brief card "24h SLA Guarantee" → "Delivery in 24h".
## Tests
New backend/v360Footers.test.ts (3); pins moved (requirement change): brandCampaignDetailMobile.test, v358BrandUx.
Full vitest 215 files / 2075 pass; tsc + crash guard + vite build OK. Screens checked at 390 px (brand + creator).
## Needs Ravi
- Deploy v360 (includes v343–v359) — the live app is still v342, so most of what's in the screenshots is already fixed there.

---
# v361 (Session 63, 20 Oct 2026) — creator home footer line
Ravi: "mohalla Hindi ka word hai, line achhe se likho". `src/components/footer/HomeCityFooter.jsx` creator line:
"Brands of every size, from every city, lane and mohalla." → "Brands of every size, from big cities to small towns."
No other change. Deploy v361 (includes v343–v360).
## v361 also — Android (needs a NEW Android build, not a website deploy)
- Ravi's Android screenshots: (1) a purple logo box when the app opens, (2) a purple strip behind the phone's
  back/home buttons. Both are inside the APK. `twa-manifest.json`: navigation bar #FFFFFF + divider #E5E5EA (was
  #7E00DC), version 1.0.3 / code 4. The box needs the v334 `android-overrides/` files → Bubblewrap build (the PWABuilder
  website can't add them). README in android-overrides/ updated. Signing key (signing.keystore) stays with Ravi.

---

# v362 (Session 64, 21 Oct 2026) — Meta Pixel + sign-up funnel (Ravi: "kisne dekha, register kiya ya nahi, kahan break point hai")

v361 is live (Ravi, 21 Oct) with the Instagram secrets in.

## What changed (no locked file, no DB change)
- New `src/lib/metaPixel.js`: Meta Pixel loader + `trackFunnel()`. Same events also go to Google Analytics (G-YQXC5TWFS0)
  as snake_case events. Only counts — no name / email / phone / handle is sent.
- **`META_PIXEL_ID` is still empty** → Meta part does nothing until Ravi's Pixel ID is filled in (it is a public number,
  not a secret, so it lives in the code like the GA id). Fill it, then deploy.
- Funnel events: `PageView` (every page) → `ViewSignupPage` (/signup, /register) / `ViewApplyForm` (/apply-creator)
  → `Lead` (apply form submitted) → `CompleteRegistration` (new account < 1 hour old, email / Google / Apple, via
  `sendSignupSource`) → `OnboardingStep` {step, flow} → `OnboardingComplete` {flow}.
- Hooked in: `GoogleAnalytics.jsx` (route changes), `signupSource.js`, `PublicCreatorApply.jsx`,
  `CreatorOnboardingMobile.jsx` (done = screen 11), `CreatorOnboarding.tsx` (done = step 5), `BrandOnboardingMobile.jsx` (done = screen 8).
- `appVersion.js` label fixed: was still "v356", now "v362".
- `vite build` OK.

## Needs Ravi
- Make the Pixel in Meta Events Manager (together, 22 Oct) → give the Pixel ID → Claude fills `META_PIXEL_ID` → deploy.
- Privacy policy: add a line that Meta Pixel / Google Analytics are used to measure ads.
- Play Store is still a closed test → ads point to the website sign-up until production is approved (14 days from 17 Oct = 31 Oct).
- Desktop brand onboarding has no step events yet (creators first).

---
# v363 (Session 64, 21 Oct 2026) — waitlist fetch, brand onboarding exit, footer, Instagram auto-fetch design, speed
Ravi's list from 21 Oct (screenshots, reviewer video + message, design file Ybex_Instagram_Auto_Fetch_offline.html).

## 1. Waitlist "Fetch Instagram for everyone" (Ravi: "waitlist mai fetch hi nahi kar raha")
- Cause: the v354 job ran in the background after the reply; Cloud Run pauses CPU between requests and keeps restarting
  copies, so it stalled after the creators (logs: 20 Oct 14:34, creators only) and the 44 pending never got numbers.
- Now the admin screen drives it: `POST /admin/creators/instagram-bulk/step` {force, since, skip} fetches up to 6 per
  request (18 s budget), reads what's left from the DB each time (works on any server copy), waitlist first. Keep the
  page open; it waits by itself when Meta's hourly budget is used. Old start route answers harmlessly.
- Waitlist rows get `ig_followers`, `instagram_stats` (compact), `instagram_synced_at`, `instagram_fetch_error`
  (DB columns added today, Ravi OK). The form's own followers stay as typed (`form_followers` in the list).
- Waitlist list: "✓ Instagram" / "Fetch failed" / "Followers · form" under the number; detail card shows live numbers +
  "form said 9,500"; "PunjabPunjab" location bug fixed.
- Approval (single + batch) uses the fetched numbers and stores them as live stats on the new profile.
- Test pin moved in v354InstagramRoutes.test.ts (requirement change, commented).

## 2. Saves that silently failed (DB logs, 19–21 Oct)
- Most "column does not exist" errors are harmless fallbacks (inboxLean selectColumns, adminTargetGuard, growth grab).
- Admin → creator edit on a creator with no profile: insert had no name ("null value in column name", 7×) and the
  admin saw "saved" → name/email from the account, and both insert + update now return the real error.
- Ravi's bio: DB bio is empty; the save itself works. Eva needs 40+ characters for "bio done" — the item now says
  "Bio is too short (n/40)", the Creator info screen shows a 0/40 counter, and Eva's 60 s cache clears on any save
  (`ybex:data-changed` event from src/lib/api.js).
- Brand profile save (`/brands/profile`): server now also writes city / state / YouTube / LinkedIn / Twitter (only the
  browser copy wrote them; 0 of 4 brands had a city).
- Locked creators_routes.ts writes dob/experience columns that don't exist → harmless 400 per save (see PENDING_DB_CHANGES).

## 3. Brand onboarding (reviewer video: stuck on logo/name page, Back did nothing, logo + publish failed)
- Onboarding headers always show an exit: "Exit" before the basics are saved (sheet "Leave setup? · Log out"),
  "Finish later" after. Brand screen-1 Back opens that sheet; creator screen-1 Back = Finish later (was navigate(-1)).
- Logo upload errors say why (login expired / too big / server message). Publish sends `logo_url` to the server, the
  extra browser-side brand_profiles write and the agency write are no longer fatal, consent save can't hang Publish,
  offline / expired-login messages. Server saves city/state on onboarding.
- Why the app opened in Chrome and Clear data didn't help: the login lives in Chrome's site data (TWA falls back to
  Chrome when assetlinks don't verify). Reviewer fix: Chrome → Settings → Site settings → ybexapp.ai.studio → Delete data.
- The 3 half-made brand accounts from 19 Oct were NOT deleted (the delete needs Ravi's confirm; it timed out).

## 4. Home footer (Ravi: "Hopr jaisa light grey, illustration chhota, line fix")
- Same city art, greyscale + faded, ~⅓ smaller (phone 200 px tall), grey text, road strip matched.
- Creator: "From local shops to big brands — your next collab is here." Brand: "From corner shops to big companies —
  find the right creators for you." + "🇮🇳 Made for Indian creators/brands" / "💜 Crafted in India". Eva bot keeps colour.
- Test pin moved in v356Footers.test.ts (requirement change, commented).

## 5. Admin speed ("Slowest APIs" ~2 s each)
- DB queries take 0.1–16 ms; the time is server (US/Asia, per Supabase logs) ↔ DB (Mumbai) round trips.
- Login session lookup kept 30 s (was 5 s), `/admin/pending-counts` answer reused 20 s per server copy (?fresh=1
  skips), admin badge poll every 60 s and only while the tab is visible.

## 6. Promo popup "Tap opens" — every page + search
- APP_PAGES lists all pages incl. profile sub-screens (/settings?section=portfolio, platforms, rates, kyc …) and brand
  profile sections (/brand/profile?section=…), with a search box. "Other link" still takes any https:// address.

## 7. Ravi's design "Instagram auto-fetch" (Ybex_Instagram_Auto_Fetch_offline.html)
- Onboarding (01/01b/01c, 03/03b, Brand 01): new `src/components/instagram/IgHandleField.jsx` — fetch on blur / 600 ms,
  spinner + "Fetching your profile from Meta…", Next disabled, green tick + 3 stats, error + Retry, one call per
  username. Creator: photo pulled ("Change"), channels step "Instagram's done. Add others?". Brand: handle fills logo,
  name, description (bio — `/instagram/preview` now returns `bio`), followers preview card.
- Profile hub 1a: `HubInstagramStrip.jsx` live strip + row chips (IG live / Not set / N collabs / Verified).
- Social platforms 1c: one Instagram card (`InstagramConnectCard.jsx` redesigned) — no second Instagram in "Added";
  Refresh only re-fetches the saved account; Update username → 1b `ConnectInstagramSheet.jsx` (preview → "Yes, that's
  me — connect" → save). This is the fix for @narendramodi's numbers showing under elite_ravi. Disconnect at the bottom
  (existing route: stops sync, drops verification).
- Portfolio 1h/1d/1g/1e: `src/components/portfolio/*` + new PortfolioScreen — empty state, Select / Paste link /
  Upload, tag-the-brand sheet with live preview, brand stacks / grid. Previews: new server routes
  `POST /creator/portfolio/ig-media`, `/link-preview`, `/covers` copy Instagram covers into our storage
  (avatars/portfolio/<user>/<id>) — IG cover links expire, which is why previews were blank. Meta gives no views for
  some reels and no paid-partnership flag: likes shown instead, "Collab" only from caption, creator confirms.
- Public profile 1f (phone): `src/components/publicProfile/*` — photo-led header with adaptive colour (bottom 15% of
  the photo, light/dark theme, cached), stats panel ("Live from Instagram · verified by Ybex" only when synced),
  CTA by viewer (brand: Send collab request → existing invite sheet; owner: Edit profile; logged out: Sign in),
  tabs Portfolio · Rate card · Stats · Reviews · Match · About, cover grid by brand. Desktop unchanged.

## 8. Other
- Meta Pixel ID 965515649959745 filled in (`src/lib/metaPixel.js`). Privacy policy section 7 mentions Google
  Analytics + Meta Pixel (no version bump, so nobody is asked to re-accept).
- appVersion label v363.

## Tests
- npm run verify: tsc + crash guard OK; vitest 219 files / 2100 pass, 1 fail = `session58Launch.test.ts` Android
  navigationColor (twa-manifest.json says #FFFFFF, test wants #7E00DC) — that file wasn't touched in v363 (already
  different in the v362 zip). New tests: v363Portfolio, v363PublicProfile, v363SocialHub, v363OnboardingFetch (packed in
  dev/tests.tgz). npm run build OK.

## Needs Ravi
- Deploy v363 (one deploy: Pixel + all of the above). Then Admin → Waitlist → "Fetch Instagram for everyone" (keep the
  page open) → check numbers → approve the 44.
- Upload the 2,500-creator CSVs only after v363 is live.
- 3 half-made brand accounts (19 Oct): approve the delete when asked, or Admin → Users → delete.
- twa-manifest navigationColor (#FFFFFF vs #7E00DC) — say which one is right.
- Offline app (Capacitor) = separate phase. Age 14+: tell whether it's only the Play rating or 14–17 users too.

---
# v364 (Session 64, 21 Oct 2026) — split fee (creator 0% / brand 8%), server-down mode + outbox, Android Capacitor app, real social logos
## 1. Fee change till Diwali (Ravi's summary; OK for locked files: "haan, locked files mein ye fee change kar do")
- DB (applied live, migration v364_split_platform_fee): platform_fee_config.fee_model ('legacy' | 'split', live = split),
  creator_fee_pct (live 0), brand_fee_pct (live 8); transactions.brand_fee_pct / brand_fee_amount / brand_fee_gst /
  brand_paid_amount / coupon_code. Old code ignores them, so nothing changed live before this deploy.
- ₹10,000 deal → brand pays ₹10,800 (₹10,400 with a 4% coupon) → creator gets ₹10,000 → Ybex ₹800.
- src/utils/feeCalculator.ts (locked): split model; platform_fee_amount stays the CREATOR fee (0), so stampedFee / payouts
  and already-paid deals are unchanged. Brand side returned separately (brandFee, brandFeeGst, brandPayable).
- backend/brandFee.ts: config (30 s cache), server-side coupon check (applies_to 'brand_fee': new %, ₹ off, or 0 — only
  lowers; dates, limits, per-brand limit, min value), quote, redemption. POST /payments/quote; create-order charges the
  quote total (notes carry the quote); persist requires paid ≥ total (old orders without notes: deal amount); payment rows
  stamped with the brand fee + coupon. UGC briefs: same. markupForRole = 0 in split (no 2% + 8% double).
- Brand UI: BrandFeeSummary (Deal amount · Service fee 8% · coupon box · Coupon applied · Total you pay · "creator gets
  the full ₹X · 0% platform fee") on mobile Review & pay, desktop chat payment, UGC brief review, PayNow; brand payments
  list shows what was paid. Creator screens show 0% (no deduction).
- Admin: Fees card — "Split / Old tiered" switch, Creator fee % and Brand fee % boxes + live example. Coupons — "Applies to
  → Brand fee" (new %, ₹ off, 0%), limits, dates, min value, active, used count. Ravi names the codes.
- Locked changes logged with npm run protect:update (payment_routes, feeCalculator, ugc_routes, useChatThreadMobile,
  razorpay.js). Pins moved (Ravi's fee decision): session57Money (onPay with couponCode), session58Launch (onPay(method, fee.couponCode)).
- Not done: refunds still return the deal amount (Ravi: refund the 8% too or not?); brand GST invoice has no service-fee line.
## 2. Server down / updating (no Play update needed)
- src/lib/serverStatus.js + api.js: HTML / 502–504 / unreachable server = "Ybex is updating": screens show saved data, pill
  at the top, login kept. src/lib/outbox.js: profile / brand profile / onboarding progress / Eva settings / read marks are
  saved on the phone and synced when the server is back; money, chat, deals, KYC, OTP, uploads are refused calmly.
## 3. Android app with the screens inside (android-app/)
- Capacitor 7 project generated on Ravi's Mac by `cd android-app && bash scripts/mac-prepare-android.sh` (1.0.4 / code 5,
  same signing.keystore → Play update). Live updates via /api/app/android-update. Back button never traps. Push via
  Firebase (backend/fcm.ts, env FCM_SERVICE_ACCOUNT_JSON + google-services.json) — needs Ravi's Firebase project.
## 4. Real social logos
- src/components/common/SocialLogo.jsx (Instagram, Facebook, WhatsApp, YouTube, Meta from Ravi's file; LinkedIn, X,
  Snapchat, Threads, Google, Apple added) on ~32 screens; public/assets platform images replaced with the real marks.
## 5. Other
- Twa-manifest navigationColor test pin moved to #FFFFFF (v361 change). appVersion v364 (old VITE_APP_VERSION can't override).
## Tests
- npm run verify: 223 files / 2146 pass, 0 fail. npm run build OK.
## Needs Ravi
- Deploy v364. Check one test deal: brand sees ₹10,800 (or with coupon), creator payout ₹10,000.
- Make coupons in Admin → Coupons → Applies to: Brand fee.
- Firebase for Android push; then build the Android app on the Mac.

---
# v365 (Session 64, 21 Oct 2026) — CSV without email, refund view, invoice convenience fee, 14+, deep money tests
- CSV waitlist import: email optional when there's an Instagram handle; duplicates by handle (in file, already on Ybex);
  re-upload completes handle-only rows. DB: waitlist.email NOT NULL dropped (migration v365_waitlist_email_optional; unique
  when present). Approval without email: one unclaimed profile (login email unclaimed_<id>@ybex.io, profile email null),
  reused on re-approve / same handle; a claimed profile with that handle is linked; no "Claim your profile" email.
  ilike exact-match escaping for "_" / "%" (likeExact). Edit modal: email optional with a handle; reject toast says why no email.
- Refund modal: Brand paid / Service fee % / Coupon + quick fills (everything / deal only / fee only); refund cap =
  brand_paid_amount; a service-fee-only refund never touches the creator's payout.
- Brand invoice (screen + PDF): "Convenience fee (8%)" line + coupon, total = what the brand paid. Creator receipt shows ₹0.00 (no "-").
- Age: 14+ everywhere (src/lib/age.js MIN_AGE, onboarding, sign-up / apply checkboxes, Terms + Privacy). No guardian flow
  (Ravi). TERMS_VERSION not bumped (no re-accept popup).
- Deep testing (black-box + white-box): 60 new tests (real routers + fake Supabase with live columns + fake Razorpay,
  outbox money guard, fee UI). 8 bugs fixed incl. coupons.applies_to CHECK (live migration
  v365_coupons_applies_to_brand_fee), refund cap, team-member coupon id on UGC briefs, coupon code wildcard, silent admin save errors.
- npm run verify: 227 files / 2217 pass. Build OK.
## Needs Ravi
- Run the 3-account delete SQL in Supabase (popup never reached the chat).
- Decide: after a fee-only refund, should a deal refund still be allowed on the same payment (now blocked)?
- Instant UGC (ugcord_) orders still take the amount from the browser (pre-v364).

---
# v366 (Session 64, 21 Oct 2026) — money hardening, pending items, new checkout
- Instant UGC orders: amount from the server (order + brand fee + coupon), never the browser; owner checks; order id on the Razorpay order.
- Coupon race fixed in the DB: `coupon_reservations` + `claim_coupon` / `confirm_coupon` / `release_coupon` (row lock,
  service_role only, migration v366_coupon_reservations); safe fallback if missing.
- Refunds: more refunds allowed up to brand paid − already refunded ("Already refunded ₹800 · can still refund ₹10,000").
  Test-mode payments stamp brand fee + count coupons. Admin → UGC Refunds shows brand paid / fee / coupon + "Refund
  service fee". Brief deposits by team members saved under the parent brand. Coupon per-brand limit: empty = no limit.
- Instagram: hub refreshes at once after connect/refresh/disconnect; Disconnect fully clears the Instagram link.
  Desktop portfolio shows covers by brand. Brand onboarding fills the website from Instagram (safe fallback).
- DB: creator_profiles dob / date_of_birth / experience / experience_years (stops the 400 after every profile save).
- Checkout (Ravi's Checkout.dc.html): new Review & pay with UPI app tiles (GPay, PhonePe, Paytm, BHIM, Amazon Pay,
  UPI ID), card / net banking, sticky "Pay ₹X | via PhonePe", Razorpay handoff screen, "Escrow funded" success with
  Razorpay ID + receipt. Razorpay opens on the chosen app (config.display block; normal sheet if refused). Screen 03
  (approve-in-app timer) is Razorpay's own window with Standard Checkout. PaymentLogo.jsx (11 marks from Ravi's
  logo file), newer Instagram mark.
- npm run verify: 232 files / 2282 pass. Build OK.
