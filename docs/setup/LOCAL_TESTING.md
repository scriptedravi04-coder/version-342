# Local testing on the Mac (v372) — no deploy, ~1 minute

Deploy + test = ~1 hour. Ab Mac pe hi poora app chalao, change karo, refresh karo.

## 1. Mac browser + iPhone Safari (sabse fast, Xcode nahi chahiye)
```bash
cd ~/Desktop/ybex-v372          # jahan zip unzip kiya
bash scripts/mac-local.sh       # ya: npm run local
```
- **First time:** packages install (~2 min) aur `.env` khulegi (`local.env` se — Supabase URL, public key aur local
  secrets pehle se bhare hain). Bas `SUPABASE_SERVICE_ROLE_KEY` paste karo (Cloud Run → Variables & Secrets).
  Eva = `GEMINI_API_KEY`, email OTP = `RESEND_API_KEY`, Instagram = `IG_GRAPH_TOKEN` + `IG_BUSINESS_ID` (optional).
  Save → script dobara chalao.
- Mac: **http://localhost:3000**
- iPhone (same Wi-Fi), Safari: **http://<Mac IP>:3000** — IP script print karta hai.
- Login: email → OTP code screen pe hi dikh jata hai (local only). Ya Creator / Brand Demo buttons.
- Code badla → page refresh. Band: `Ctrl+C`.
- Phone mobile view ke liye Mac Chrome mein `Cmd+Opt+I` → phone icon (iPhone 14 Pro size).

## 2. iPhone app, cable se (asli app, Mac ke screens ke saath)
Ek baar: `cd ios-app && bash scripts/mac-prepare.sh` → Xcode → App → Signing & Capabilities → Team select.
Phir har baar:
```bash
# Tab 1
bash scripts/mac-local.sh
# Tab 2 (iPhone cable se laga, unlocked)
bash scripts/ios-local.sh       # ya: npm run local:ios
```
- App phone pe install hoke Mac se screens kholti hai. Code badla → phone pe app band karke dobara kholo.
- Pehli baar iPhone pe: "find devices on local network" → **Allow**. "Untrusted Developer" →
  Settings → General → VPN & Device Management → Trust.
- Phone ka console / errors: Mac Safari → Develop → (tumhara iPhone) → localhost. (iPhone: Settings → Safari →
  Advanced → Web Inspector ON.)
- Wapas normal app (App Store jaisa): `bash scripts/ios-local.sh --off`

## Dhyan rakho
- **Data LIVE database ka hai** (same Supabase). Test account use karo, asli creators/brands ko kuch mat bhejo.
- Payments local pe hamesha Razorpay **test mode** mein.
- Google / Apple sign-in local pe nahi chalega (unka return address live domain hai) — email + OTP use karo.
- Instagram fetch, push notifications — same keys `.env` mein hon tabhi chalenge.
- `.env` kabhi zip / git mein mat daalna.
