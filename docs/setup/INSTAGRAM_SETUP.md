# Instagram real data — setup (v349, Part A verified live 19 Oct — v351)

Code: `backend/instagramConnect.ts`, creator card `src/components/instagram/InstagramConnectCard.jsx`.
The card only appears once at least one part below is switched on (secrets set). Until then creators type numbers by hand, as before.

## Where the Fetch button shows (v352)
Under every Instagram username box: apply form, creator onboarding (desktop + mobile), Settings → Platforms,
mobile profile Instagram form, Admin → creator edit / waitlist edit, brand onboarding. Settings save live numbers;
the others only fill the boxes (`POST /api/instagram/preview`, rate-limited + 6 h cache).

## Username once → everything (v354)
- Typing a username anywhere (apply form, onboarding, settings, admin forms) fetches by itself after ~1 s with a
  "Fetching your Instagram data…" popup: followers, avg reach/views, likes, comments, engagement, the Instagram photo
  and the last 25 posts. Onboarding then skips the Instagram-numbers step.
- Photo: copied once into Supabase storage `avatars/ig/<username>.<ext>` (Instagram's own links expire). Used only
  when there is no photo, a Google/placeholder one, or our older Instagram copy. A photo the creator uploaded is never replaced.
- E-mail: Meta never gives an account's login e-mail. If the bio has an e-mail, the apply form fills it when the box is empty.
- Portfolio: onboarding last step + Profile → Portfolio → "Pick from Instagram" shows the last posts; captions with
  #ad / #collab / "paid partnership" / "use code" are marked "Collab" and shown first. Only the post link is saved.
- Refresh: used the app in the last day → daily; 1–7 days → every 3 days; longer / never logged in → every 10 days.
  All Meta calls share one budget (180 / hour) and a 6-hour cache per username.
- Admin → Users (All / Creators / Unclaimed) and Admin → Waitlist: **Fetch Instagram for everyone** — all creator
  profiles + pending waitlist; runs in the background, waits by itself when the hour's limit is used.
- If Meta refuses the extra post fields, the call repeats with the old field list (numbers keep working; picker empty).

## What creators get
1. **Username → numbers** (no login): followers, posts, avg likes / comments / reel views, engagement. Updates by itself every day.
   Works for **Creator / Business** Instagram accounts (free switch in Instagram settings). Personal accounts get a "switch to Creator" message.
2. **Prove it's yours** — two options, creator picks:
   - **DM code**: Ybex shows `YBX-482913`, creator DMs it to Ybex's Instagram → ticked "Verified" by itself.
   - **Log in with Instagram**: Instagram's own page (Ybex never sees the password) → verified + 28-day reach / views.
3. Synced numbers can't be typed over by hand. Changing the username drops the old verification.
4. Admin → Users → creator → **Refresh from Instagram** (and see verified / method).

## Ravi — one-time setup (≈ 30–45 min)
### A. Ybex's own Instagram (needed for 1 and the DM code)
1. Ybex Instagram → Settings → Account type → **Professional (Business)**.
2. Link it to a **Facebook Page** (Instagram → Edit profile → Page → connect / create "Ybex").
3. developers.facebook.com → **Create app** → type *Business* → add products **Instagram** (API setup with Facebook login) and **Webhooks**.
4. Graph API Explorer → app **Ybex** → permissions `pages_show_list, pages_read_engagement, instagram_basic,
   **instagram_manage_insights**, **ads_read**, business_management, instagram_manage_messages` → Generate token
   (tick YBEX MEDIA page + ybex.in). Without `instagram_manage_insights` + `ads_read` Business Discovery fails with
   "(#10) Application does not have permission" (Page is in Business Manager → ads_read needed).
5. Test: `17841480473392276?fields=business_discovery.username(bluebottle){username,followers_count,media_count}`
   → followers come back. (Watch the closing `}` — if it's cut you get code 2500 "Expected }".)
6. Never-expiring token: ⓘ → Open in Access Token Tool → **Extend Access Token** → put the long token in Explorer →
   `me/accounts?fields=name,access_token` → YBEX MEDIA's `access_token` = **Page token** (Debugger shows Type Page,
   Expires Never). "Data access expires" ~3 months renews while Ravi uses Facebook; if fetch stops, redo step 6
   (or later a Business Manager System User token).
7. AI Studio secrets: `IG_GRAPH_TOKEN` = Page token, `IG_BUSINESS_ID` = `17841480473392276` (ybex.in),
   `IG_GRAPH_VERSION` = `v26.0` (code default is v26.0 since v351). Works in Development mode — no App Review needed.

### B. DM code (needs A)
1. Webhooks → Instagram → Callback URL `https://ybexapp.ai.studio/api/webhooks/instagram`, Verify token = any long random text,
   subscribe to **messages**.
2. Secrets: `IG_WEBHOOK_VERIFY_TOKEN` (same text), `META_APP_SECRET` (App settings → Basic → App secret),
   `IG_DM_USERNAME` = Ybex's Instagram username (e.g. ybex.app). Optional `IG_MESSAGING_TOKEN` (Page token) if replies fail.
3. **Important:** until Meta **App Review** approves `instagram_manage_messages` (Advanced access), only people with a role on the app
   (you, testers added in App roles) get DMs delivered to the webhook. Submit App Review with a screen recording of the flow (1–4 weeks).

### C. Instagram Login (separate, optional)
1. Same app → Instagram → **API setup with Instagram login** → note Instagram App ID + secret.
2. Business login settings → Redirect URL `https://ybexapp.ai.studio/api/instagram/oauth/callback` (after the domain move: ybexmedia.in).
3. Secrets: `IG_APP_ID`, `IG_APP_SECRET`. Scopes used: `instagram_business_basic, instagram_business_manage_insights`.
4. Same App Review note: public creators can log in only after Advanced access is approved; testers work right away.

## Limits
- Meta allows ~200 calls / hour for Ybex's account → the daily refresh does max 60 creators an hour.
- No official API reads **personal** accounts (Meta shut that down in 2025). Anyone who "fetches any username" uses scrapers — against
  Instagram's rules and breaks often; not used here.
