# Offline app (v333 + v334)

Why: Apple (App Store guideline 4.2, "minimum functionality") and Play reviewers open the app in airplane mode.
A web page that shows a browser error or spins forever reads as "just a website". Ybex opens like an installed
app with no internet: the screens you opened before show their last saved data, and the rest says calmly that
you're offline.

## What works offline

| Area | Offline behaviour | Where |
|---|---|---|
| App start | The whole app (every screen's files, fonts, icons, login pictures) is saved on the phone by the service worker. Any page link opens the saved app page. A signed-in phone paints the grey app page with placeholder cards from the first frame; the purple launch splash (Android `#7E00DC`) is unchanged. | `vite.config.js` (VitePWA `navigateFallback`, `globPatterns`, `maximumFileSizeToCacheInBytes` 6 MB, `cleanupOutdatedCaches`), `index.html` (`#yb-shell`) |
| Login session | Offline, the app opens at once with the saved login (no waiting for `/auth/me` to fail). Back online it is checked again. | `AuthContext.jsx` |
| Screens opened before | Show their last saved answer (same login only, wiped at logout): home, campaigns, UGC, inbox, notifications, earnings / payouts, refer, profile. Pill at the top: "You're offline · showing your last saved screens". | `lib/api.js`, `lib/apiSnapshot.js`, `OfflineBanner.jsx` |
| Screens never opened | One designed card, `OfflineState` — "You're offline", what still works, Try again. It loads by itself when the internet is back. Payment screens keep their card ("Your payments are safe") with offline wording. | `components/common/OfflineState.jsx`, `PaymentsRetryCard.jsx` |
| Static pages | Terms, Privacy, Refunds and the other `/info/*` pages are built into the app. In the installed app these links open inside the app while offline (the phone's browser can't load them offline). Help articles: the last list of each category is kept on the phone. | `lib/legal/legalContent.js`, `lib/externalLinks.js`, `pages/help/*` |
| Profile / Settings menus | Render from the saved user and saved profile (`/creators/:id`, `/brands/me`). | `lib/apiSnapshot.js` |
| Eva | Opens with her chats; a note says "Eva needs internet to reply". | `feedback/FeedbackBot.jsx` |
| Login screen | "Connect to the internet to sign in" card while offline. | `Login.jsx`, `AppContinue.jsx` (`OfflineSignInNotice`) |
| Actions (send, apply, pay, upload, save) | Never sent. `api.js` refuses every POST / PUT / PATCH / DELETE while offline with code `OFFLINE` and one calm grey toast: "You're offline — try again when you're back online". Payment: the Razorpay order is never created, so the Razorpay window never opens offline. | `lib/api.js`, `lib/offline.js` |
| Back online | Pill says "Back online"; screens on `useLiveRefresh` (and home, inbox, earnings) reload once quietly; offline cards reload by themselves. | `lib/liveRefresh.js`, `useBackOnline` in `lib/offline.js` |

Not frozen on purpose: dashboard banners / festive themes are always read fresh online.

Updates: a new version still waits for the "Refresh" toast (session 58, `registerType: 'prompt'`); old saved
files are removed only when the new version takes over.

## How to test (iPhone and Android)

1. Install the app (Android: Play Store / Chrome "Install app"; iPhone: Safari → Share → Add to Home Screen) and sign in.
2. With internet on, open a few screens: Home, Campaigns, UGC, Inbox, Notifications, Earnings, Profile, Help, Terms. Wait ~30 seconds the first time so the app finishes saving its files.
3. Close the app fully, turn on **airplane mode** (Wi-Fi off too).
4. Open the app: it should open straight to Home with your data and the "You're offline" pill.
5. Visit the screens from step 2 — they show their saved data. Open a screen you never visited — you see the "You're offline" card, not a spinner.
6. Tap an action (send a message, apply, Pay) — a grey "You're offline — try again when you're back online" toast; nothing is sent; Razorpay does not open.
7. Open Eva — the "Eva needs internet to reply" note. Log out and look at the login screen — "Connect to the internet to sign in".
8. Turn airplane mode off — the pill says "Back online" and the screen refreshes by itself.

Desktop check: Chrome DevTools → Application → Service Workers → "Offline" (or Network → Offline), then reload.

## Server down / updating (v364)

Ravi (21 Oct): "website band ki update ke liye toh app webapp ban gaya aur pura error show hone laga — database local
mai save hota rahe aur server wapas aaye toh real database mai save ho jaye".

The phone can have internet while the Ybex server is down (an AI Studio redeploy takes ~1 hour; meanwhile it answers
with its own HTML "unavailable" page or a 502/503/504). Before v364 that was treated as a normal answer: screens got an
HTML page instead of data, the login check could log people out, and every tap showed an error.

| What | Behaviour | Where |
|---|---|---|
| Detecting it | Down = an HTML page where `/api` JSON was expected, a gateway error (502/503/504/520–530) **without our JSON body**, or a network error while the phone is online and `/api/system-status` also fails. A real answer from our server (e.g. 503 `PAYMENTS_UNAVAILABLE`, JSON) is never treated as "down". Up = any good JSON answer. While down, `/api/system-status` is checked every 20 s (page visible only). Event `ybex:server` {down}. | `src/lib/serverStatus.js`, `src/lib/api.js` |
| Screens | Same as offline: last saved answer at once; nothing saved → the calm `OfflineState` card, now worded "Ybex is updating … it will load by itself when Ybex is back". Pill: "Ybex is updating · showing your last saved screens". | `api.js`, `OfflineState.jsx`, `OfflineBanner.jsx` |
| Login | Server down ≠ logged out: the saved login stays (an HTML / non-user answer to `/auth/me` keeps the saved user). Only a real 401/403 logs out. | `AuthContext.jsx` |
| Saves that wait on the phone | Offline **or** server down: `POST creators/profile`, `PATCH creators/me`, `POST brands/profile`, `POST db/own` (only brand_profiles / creator_profiles / creator_portfolio_items / creator_social_channels), `POST onboarding/progress`, `POST/PUT assist/settings`, notification read marks. The screen gets `{ ok: true, queued: true }` (202) and one toast "Saved on this phone — it will sync when Ybex is back". Pill shows "N changes waiting to sync". Whole-object saves keep only the newest copy. Max 50, per signed-in user, wiped on logout. | `src/lib/outbox.js` |
| Never queued | Money / payments, deals, chat, campaign apply / invite, UGC, KYC, OTP, sign-in / sign-up, uploads (files), push. Offline → "You're offline — try again when you're back online"; server down → "Ybex is updating right now — try again in a few minutes" (code `SERVER_DOWN`). Nothing is half-sent. Logout still works. | `api.js` |
| Sync | When the phone is online and the server answers (on `online`, when the 20 s check sees Ybex back, 3 s after start, every 30 s while items wait): oldest first, one at a time, the real request. 2xx → removed; 4xx → removed + toast "One change couldn't be saved: …"; network / 5xx → stops, tries later. Then "Synced ✓" in the pill and screens refresh (`ybex:data-changed`). | `api.js` `flushOutbox()` |

Note: a queued whole-profile save is sent as it was typed. If the same profile was changed on another device in
between, the phone's copy wins when it syncs (same as pressing Save later).

### How to test
1. Local: run the app, sign in, open Home / Profile / Inbox once. Stop the server (or in Chrome DevTools → Network →
   "Block request URL" `*/api/*`, or Request blocking `/api/`). Reload → screens open with saved data, the pill says
   "Ybex is updating"; you are still signed in.
2. Edit your bio → Save → toast "Saved on this phone…", pill "1 change waiting to sync". Try Pay / send a chat message →
   "Ybex is updating right now — try again in a few minutes", nothing sent.
3. Start the server again (unblock) → within ~20 s the pill turns green "Synced ✓"; the bio is on the server.
4. Live: during an AI Studio redeploy, open the installed app — same as above.
