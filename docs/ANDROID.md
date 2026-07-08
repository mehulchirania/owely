# Android Release Guide (TWA)

Owely is designed as a Progressive Web App (PWA) that is packaged into a native Android app using Trusted Web Activities (TWA). This allows us to list Owely on the Google Play Store while maintaining a single web codebase.

## Prerequisites

- Node.js installed
- Java Development Kit (JDK) 17+ installed
- Android SDK command-line tools installed

## Step 1: Install Bubblewrap

Google's Bubblewrap CLI is the standard tool for converting PWAs to TWAs.

```bash
npm i -g @google/bubblewrap
```

## Step 2: Initialize the Project

Run this command in an empty directory where you want the Android project to live (do NOT run this inside the Owely Next.js repo):

```bash
bubblewrap init --manifest https://your-production-url.hosted.app/manifest.json
```

Follow the prompts. Bubblewrap will automatically pull the icons, theme colors, and shortcuts from the live `manifest.json`.

## Step 3: Generate the Signing Key

If this is a new project, Bubblewrap will prompt you to create a new keystore (`android.keystore`). Keep this file extremely safe! If you lose it, you will not be able to update the app on the Play Store.

## Step 4: Build the APK/AAB

Run the build command to generate the App Bundle (`.aab` for Play Store) and the standard APK (`.apk` for manual testing):

```bash
bubblewrap build
```

## Step 5: Update Asset Links (Crucial)

To remove the browser address bar inside your app (the hallmark of a TWA), the Android app must cryptographically prove it owns the web domain.

1. Get the SHA-256 certificate fingerprint from the keystore you just generated. (Bubblewrap prints this during the build process, or you can extract it via `keytool`).
2. Open `public/.well-known/assetlinks.json` in the Owely codebase.
3. Replace `PLACEHOLDER_SHA256_CERT_FINGERPRINT_REPLACE_ME_BEFORE_LAUNCH` with your actual SHA-256 fingerprint.
4. Deploy the Owely web app so the assetlinks file is live at `https://your-production-url.hosted.app/.well-known/assetlinks.json`.

## Step 6: Play Console Listing Checklist

Before uploading the `.aab` to the Google Play Console, ensure you have:
- [ ] A privacy policy URL (`/privacy`)
- [ ] Account deletion instructions or an in-app path (Owely handles this natively in Settings).
- [ ] Contact storage justification (Owely uses the Contact Picker API one-shot).
- [ ] Screenshots for mobile devices.

Upload the App Bundle (`app-release-bundle.aab`) to the Play Console and submit for review.
