# Firebase App Check — Console Setup

This must be done manually before shipping to production. The code is already
wired (`src/lib/firebase/client.ts`, `FirebaseInit.tsx`); you just need to
provision the keys.

---

## Step 1 — Enable reCAPTCHA Enterprise

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select project **owely-c6c51**.
2. Navigate to **Security → reCAPTCHA Enterprise** (or search "reCAPTCHA").
3. Click **Create key**.
4. Platform type: **Web**.
5. Under "Web application", set your deployed App Hosting domain (e.g. `<backend>--owely-c6c51.<region>.hosted.app`). Add `localhost` for local dev if you plan to use the reCAPTCHA provider locally (easier to use the debug token instead — see Step 4).
6. **Tick "Use checkbox challenge"**: **No** — leave it unchecked (score-based, invisible).
7. Click **Create**. Copy the **Site key** (looks like `6Lc...`). Keep this tab open.

> [!IMPORTANT]
> Copy the **site key**, not the secret key. The site key goes into `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`; the secret key stays in Google Cloud and is never used directly by Owely.

---

## Step 2 — Register App Check in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → **owely-c6c51**.
2. Go to **Build → App Check** (left sidebar).
3. Click **Get started** if first time.
4. Under **Apps**, find your **Web app** (the one registered in Project settings). Click on it.
5. Provider: select **reCAPTCHA Enterprise**.
6. Paste the site key from Step 1.
7. Click **Save**.

---

## Step 3 — Enforce App Check

In the Firebase Console App Check page:

1. Click the **APIs** tab.
2. For **Cloud Firestore**: click **Enforce**. Confirm.
3. For **Authentication**: click **Enforce**. Confirm.

> [!WARNING]
> Once enforced, any request without a valid App Check token is rejected. Test thoroughly in a non-enforced environment first using a debug token (Step 4) before enforcing on production data.

---

## Step 4 — Local Development (Debug Token)

You do **not** need reCAPTCHA to run locally. Use a debug token instead:

1. Generate a UUID: run `node -e "console.log(crypto.randomUUID())"` in any terminal.
2. In Firebase Console → App Check → your web app → **Debug tokens** tab → **Add debug token**.
3. Paste the UUID and give it a name (e.g. `local-dev`). Click **Add**.
4. In your `.env.local`:
   ```
   NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=<your-uuid>
   ```
   Leave `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` unset locally.
5. Restart `npm run dev`.

> [!NOTE]
> `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` must be **absent** from production environment variables (`apphosting.yaml`). It is never inlined in prod builds — the app will use `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` instead.

---

## Step 5 — Production Deploy

```bash
firebase apphosting:env:set NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<your-site-key>
```

Then redeploy (push to the connected branch or trigger a manual build in the Firebase console).

---

## Verification

After deploying with enforcement on:

- Open the app in an incognito window.
- Open DevTools → Network tab.
- Authenticate with Google or Phone OTP.
- Confirm no `UNAUTHENTICATED` or `PERMISSION_DENIED` errors in the console (those would indicate App Check is blocking valid requests — check that your site key and domain are correct).
- In Firebase Console → App Check → **Metrics**: you should see successful App Check verifications within a few minutes of real traffic.
